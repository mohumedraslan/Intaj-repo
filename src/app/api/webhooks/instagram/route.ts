import { NextRequest, NextResponse } from 'next/server';
import {
  InstagramIntegration,
  InstagramConnectionManager,
  InstagramMessage,
} from '@/lib/integrations/instagram';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const connectionManager = new InstagramConnectionManager(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Verify webhook subscription
  if (mode === 'subscribe' && token === process.env.ENC_MASTER_KEY) {
    console.log('Instagram webhook verified');
    return new NextResponse(challenge);
  }

  // Return helpful error page for forbidden access
  const errorHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Instagram Webhook - Intaj</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #0a0a0b 0%, #141517 100%);
          color: #ffffff;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .container {
          max-width: 600px;
          padding: 2rem;
          text-align: center;
          background: rgba(31, 32, 36, 0.8);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .logo {
          font-size: 2rem;
          font-weight: bold;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 1rem;
        }
        h1 { font-size: 1.5rem; margin-bottom: 1rem; color: #f1f5f9; }
        p { color: #94a3b8; margin-bottom: 1rem; line-height: 1.6; }
        .code { 
          background: rgba(0, 0, 0, 0.3); 
          padding: 0.5rem 1rem; 
          border-radius: 8px; 
          font-family: monospace; 
          color: #06b6d4;
          margin: 1rem 0;
        }
        .steps {
          text-align: left;
          background: rgba(0, 0, 0, 0.2);
          padding: 1.5rem;
          border-radius: 12px;
          margin: 1.5rem 0;
        }
        .step {
          margin-bottom: 1rem;
          padding-left: 1.5rem;
          position: relative;
        }
        .step::before {
          content: counter(step-counter);
          counter-increment: step-counter;
          position: absolute;
          left: 0;
          top: 0;
          background: linear-gradient(135deg, #e1306c, #f56040);
          color: white;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          font-weight: bold;
        }
        .steps { counter-reset: step-counter; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">INTAJ</div>
        <h1>Instagram Business Webhook</h1>
        <p>This endpoint handles Instagram Business API webhook verification and message processing.</p>
        
        <div class="steps">
          <div class="step">
            <strong>Webhook URL:</strong><br>
            <div class="code">${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/instagram</div>
          </div>
          <div class="step">
            <strong>Verify Token:</strong><br>
            <div class="code">Use your ENC_MASTER_KEY from environment variables</div>
          </div>
          <div class="step">
            <strong>Setup Instructions:</strong><br>
            • Go to Facebook Developer Console<br>
            • Navigate to Instagram > Configuration<br>
            • Add the webhook URL above<br>
            • Use ENC_MASTER_KEY as verify token<br>
            • Subscribe to messages, story_insights, and mentions
          </div>
        </div>
        
        <p><strong>Status:</strong> ${mode ? `Mode: ${mode}, Token: ${token ? 'provided' : 'missing'}` : 'No verification parameters'}</p>
      </div>
    </body>
    </html>
  `;

  return new NextResponse(errorHtml, {
    status: 403,
    headers: { 'Content-Type': 'text/html' },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-hub-signature');

    // Verify webhook signature
    if (
      !signature ||
      !InstagramIntegration.verifyWebhookSignature(
        body,
        signature,
        process.env.INSTAGRAM_APP_SECRET!
      )
    ) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const webhookData = JSON.parse(body);

    // Handle direct messages
    const message = InstagramIntegration.parseWebhookMessage(webhookData);
    if (message) {
      await handleMessage(message);
    }

    // Handle story mentions
    const storyMention = InstagramIntegration.parseStoryMention(webhookData);
    if (storyMention) {
      await handleStoryMention(storyMention);
    }

    // Handle comment mentions
    const commentMention = InstagramIntegration.parseCommentMention(webhookData);
    if (commentMention) {
      await handleCommentMention(commentMention);
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('Instagram webhook error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

async function handleMessage(message: InstagramMessage) {
  try {
    // Find the chatbot associated with this Instagram account
    const { data: connections } = await supabase
      .from('connections')
      .select('*, chatbots(*)')
      .eq('platform', 'instagram')
      .eq('active', true);

    const connection = connections?.find(
      conn => conn.credentials?.instagram_business_account_id === message.recipientId
    );

    if (!connection) {
      console.log('No active Instagram connection found for account:', message.recipientId);
      return;
    }

    // Store incoming message
    await connectionManager.storeMessage(
      connection.chatbot_id,
      message as unknown as Record<string, unknown>
    );

    // Get Instagram integration instance
    const instagramConfig = {
      accessToken: connection.credentials.access_token,
      instagramBusinessAccountId: connection.credentials.instagram_business_account_id,
      pageId: connection.credentials.page_id,
      appSecret: connection.credentials.app_secret,
      webhookVerifyToken: connection.credentials.webhook_verify_token,
    };

    const instagram = new InstagramIntegration(instagramConfig);

    // Process message with AI
    const aiResponse = await processMessageWithAI(
      message.message.text || 'Media message',
      connection.chatbot_id
    );

    // Send response
    const sendResult = await instagram.sendMessage(message.senderId, aiResponse, 'text');

    if (sendResult.success) {
      // Store outgoing message
      await connectionManager.storeOutgoingMessage(
        connection.chatbot_id,
        message.senderId,
        aiResponse,
        sendResult.messageId,
        'message'
      );
    }
  } catch (error) {
    console.error('Error handling Instagram message:', error);
  }
}

interface InstagramStoryMention {
  id: string;
  mentionedUserId: string;
  // Add other relevant fields as needed
}

async function handleStoryMention(storyMention: InstagramStoryMention) {
  try {
    // Find the chatbot associated with this Instagram account
    const { data: connections } = await supabase
      .from('connections')
      .select('*, chatbots(*)')
      .eq('platform', 'instagram')
      .eq('active', true);

    const connection = connections?.[0]; // Simplified - you might want better matching logic

    if (!connection) {
      console.log('No active Instagram connection found');
      return;
    }

    // Store story mention
    await connectionManager.storeStoryMention(
      connection.chatbot_id,
      storyMention as import('@/lib/integrations/instagram').InstagramStoryMention
    );

    const instagramConfig = {
      accessToken: connection.credentials.access_token,
      instagramBusinessAccountId: connection.credentials.instagram_business_account_id,
      pageId: connection.credentials.page_id,
      appSecret: connection.credentials.app_secret,
      webhookVerifyToken: connection.credentials.webhook_verify_token,
    };

    const instagram = new InstagramIntegration(instagramConfig);

    // Generate AI response for story mention
    const aiResponse = await processMessageWithAI(
      'User mentioned me in their story',
      connection.chatbot_id
    );

    // Reply to story mention
    const sendResult = await instagram.sendMessage(
      storyMention.mentionedUserId,
      aiResponse,
      'story_reply'
    );

    if (sendResult.success) {
      // Store outgoing message
      await connectionManager.storeOutgoingMessage(
        connection.chatbot_id,
        storyMention.mentionedUserId,
        aiResponse,
        sendResult.messageId,
        'story_reply'
      );
    }
  } catch (error) {
    console.error('Error handling Instagram story mention:', error);
  }
}

interface InstagramCommentMention {
  commentId: string;
  userId: string;
  text: string;
  // Add other relevant fields as needed
}

async function handleCommentMention(commentMention: InstagramCommentMention) {
  try {
    // Find the chatbot associated with this Instagram account
    const { data: connections } = await supabase
      .from('connections')
      .select('*, chatbots(*)')
      .eq('platform', 'instagram')
      .eq('active', true);

    const connection = connections?.[0]; // Simplified - you might want better matching logic

    if (!connection) {
      console.log('No active Instagram connection found');
      return;
    }

    const instagramConfig = {
      accessToken: connection.credentials.access_token,
      instagramBusinessAccountId: connection.credentials.instagram_business_account_id,
      pageId: connection.credentials.page_id,
      appSecret: connection.credentials.app_secret,
      webhookVerifyToken: connection.credentials.webhook_verify_token,
    };

    const instagram = new InstagramIntegration(instagramConfig);

    // Generate AI response for comment
    const aiResponse = await processMessageWithAI(commentMention.text, connection.chatbot_id);

    // Reply to comment
    const sendResult = await instagram.sendMessage(commentMention.userId, aiResponse, 'text');

    if (sendResult.success) {
      // Store the comment and reply in database
      await connectionManager.storeOutgoingMessage(
        connection.chatbot_id,
        commentMention.userId,
        aiResponse,
        sendResult.messageId,
        'comment_reply'
      );
    }
  } catch (error) {
    console.error('Error handling Instagram comment mention:', error);
  }
}

async function processMessageWithAI(message: string, chatbotId: string): Promise<string> {
  try {
    // Get chatbot configuration
    const { data: chatbot } = await supabase
      .from('chatbots')
      .select('*')
      .eq('id', chatbotId)
      .single();

    if (!chatbot) {
      return "I'm sorry, I'm not configured properly. Please contact support.";
    }

    // Get recent conversation history
    const { data: recentMessages } = await supabase
      .from('messages')
      .select('role, content')
      .eq('chatbot_id', chatbotId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Build conversation context
    const conversationHistory =
      recentMessages?.reverse().map(msg => ({
        role: msg.role,
        content: msg.content,
      })) || [];

    // Add current message
    conversationHistory.push({ role: 'user', content: message });

    // Call AI service
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://intaj.nabih.tech',
        'X-Title': 'Intaj AI Platform',
      } as HeadersInit,
      body: JSON.stringify({
        model: chatbot.model || 'openai/gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are ${chatbot.name}, an AI assistant on Instagram. Keep responses concise and engaging for social media. ${chatbot.settings?.systemPrompt || 'Be helpful and professional.'}`,
          },
          ...conversationHistory,
        ],
        max_tokens: 500, // Shorter for Instagram
        temperature: 0.7,
      }),
    });

    const aiData = await response.json();

    if (aiData.choices && aiData.choices[0]) {
      return aiData.choices[0].message.content;
    }

    return "I'm sorry, I'm having trouble processing your message right now. Please try again.";
  } catch (error) {
    console.error('AI processing error:', error);
    return "I'm sorry, I'm experiencing technical difficulties. Please try again later.";
  }
}
