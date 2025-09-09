import { NextRequest, NextResponse } from 'next/server';
import { InstagramIntegration, InstagramConnectionManager } from '@/lib/integrations/instagram';
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
  if (mode === 'subscribe' && token === process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN) {
    console.log('Instagram webhook verified');
    return new NextResponse(challenge);
  }

  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-hub-signature');

    // Verify webhook signature
    if (!signature || !InstagramIntegration.verifyWebhookSignature(
      body,
      signature,
      process.env.INSTAGRAM_APP_SECRET!
    )) {
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

async function handleMessage(message: any) {
  try {
    // Find the chatbot associated with this Instagram account
    const { data: connections } = await supabase
      .from('connections')
      .select('*, chatbots(*)')
      .eq('platform', 'instagram')
      .eq('active', true);

    const connection = connections?.find(conn => 
      conn.credentials?.instagram_business_account_id === message.recipientId
    );

    if (!connection) {
      console.log('No active Instagram connection found for account:', message.recipientId);
      return;
    }

    // Store incoming message
    await connectionManager.storeMessage(connection.chatbot_id, message);

    // Get Instagram integration instance
    const instagramConfig = {
      accessToken: connection.credentials.access_token,
      instagramBusinessAccountId: connection.credentials.instagram_business_account_id,
      pageId: connection.credentials.page_id,
      appSecret: connection.credentials.app_secret,
      webhookVerifyToken: connection.credentials.webhook_verify_token
    };

    const instagram = new InstagramIntegration(instagramConfig);

    // Process message with AI
    const aiResponse = await processMessageWithAI(
      message.message.text || 'Media message', 
      connection.chatbot_id
    );

    // Send response
    const sendResult = await instagram.sendTextMessage(message.senderId, aiResponse);
    
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

async function handleStoryMention(storyMention: any) {
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
    await connectionManager.storeStoryMention(connection.chatbot_id, storyMention);

    const instagramConfig = {
      accessToken: connection.credentials.access_token,
      instagramBusinessAccountId: connection.credentials.instagram_business_account_id,
      pageId: connection.credentials.page_id,
      appSecret: connection.credentials.app_secret,
      webhookVerifyToken: connection.credentials.webhook_verify_token
    };

    const instagram = new InstagramIntegration(instagramConfig);

    // Generate AI response for story mention
    const aiResponse = await processMessageWithAI(
      'User mentioned me in their story', 
      connection.chatbot_id
    );

    // Reply to story mention
    const sendResult = await instagram.replyToStoryMention(storyMention.id, aiResponse);
    
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

async function handleCommentMention(commentMention: any) {
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
      webhookVerifyToken: connection.credentials.webhook_verify_token
    };

    const instagram = new InstagramIntegration(instagramConfig);

    // Generate AI response for comment
    const aiResponse = await processMessageWithAI(
      commentMention.text, 
      connection.chatbot_id
    );

    // Reply to comment
    const sendResult = await instagram.replyToComment(commentMention.commentId, aiResponse);
    
    if (sendResult.success) {
      // Store the comment and reply in database
      await connectionManager.storeOutgoingMessage(
        connection.chatbot_id,
        commentMention.userId,
        aiResponse,
        sendResult.replyId,
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
    const conversationHistory = recentMessages?.reverse().map(msg => ({
      role: msg.role,
      content: msg.content
    })) || [];

    // Add current message
    conversationHistory.push({ role: 'user', content: message });

    // Call AI service
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL,
        'X-Title': 'Intaj AI Platform'
      },
      body: JSON.stringify({
        model: chatbot.model || 'openai/gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are ${chatbot.name}, an AI assistant on Instagram. Keep responses concise and engaging for social media. ${chatbot.settings?.systemPrompt || 'Be helpful and professional.'}`
          },
          ...conversationHistory
        ],
        max_tokens: 500, // Shorter for Instagram
        temperature: 0.7
      })
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
