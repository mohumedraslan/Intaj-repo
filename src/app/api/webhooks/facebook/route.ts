import { NextRequest, NextResponse } from 'next/server';
import { FacebookMessengerIntegration, FacebookConnectionManager } from '@/lib/integrations/facebook';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const connectionManager = new FacebookConnectionManager(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Verify webhook subscription
  if (mode === 'subscribe' && token === process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN) {
    console.log('Facebook webhook verified');
    return new NextResponse(challenge);
  }

  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    // Verify webhook signature
    if (!signature || !FacebookMessengerIntegration.verifyWebhookSignature(
      body,
      signature,
      process.env.FACEBOOK_APP_SECRET!
    )) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const webhookData = JSON.parse(body);
    
    // Handle message events
    const message = FacebookMessengerIntegration.parseWebhookMessage(webhookData);
    if (message) {
      await handleMessage(message);
    }

    // Handle postback events
    const postback = FacebookMessengerIntegration.parseWebhookPostback(webhookData);
    if (postback) {
      await handlePostback(postback);
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('Facebook webhook error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

async function handleMessage(message: any) {
  try {
    // Find the chatbot associated with this Facebook page
    const { data: connections } = await supabase
      .from('connections')
      .select('*, chatbots(*)')
      .eq('platform', 'facebook')
      .eq('active', true);

    const connection = connections?.find(conn => 
      conn.credentials?.page_id === message.recipientId
    );

    if (!connection) {
      console.log('No active Facebook connection found for page:', message.recipientId);
      return;
    }

    // Store incoming message
    await connectionManager.storeMessage(connection.chatbot_id, message);

    // Get Facebook integration instance
    const facebookConfig = {
      pageAccessToken: connection.credentials.page_access_token,
      pageId: connection.credentials.page_id,
      appSecret: connection.credentials.app_secret,
      webhookVerifyToken: connection.credentials.webhook_verify_token
    };

    const facebook = new FacebookMessengerIntegration(facebookConfig);

    // Send typing indicator
    await facebook.sendTypingIndicator(message.senderId, 'typing_on');

    // Process message with AI
    const aiResponse = await processMessageWithAI(
      message.message.text || 'Media message', 
      connection.chatbot_id
    );

    // Send response
    const sendResult = await facebook.sendTextMessage(message.senderId, aiResponse);
    
    if (sendResult.success) {
      // Store outgoing message
      await connectionManager.storeOutgoingMessage(
        connection.chatbot_id,
        message.senderId,
        aiResponse,
        sendResult.messageId
      );
    }

    // Turn off typing indicator
    await facebook.sendTypingIndicator(message.senderId, 'typing_off');
  } catch (error) {
    console.error('Error handling Facebook message:', error);
  }
}

async function handlePostback(postback: any) {
  try {
    // Find the chatbot associated with this Facebook page
    const { data: connections } = await supabase
      .from('connections')
      .select('*, chatbots(*)')
      .eq('platform', 'facebook')
      .eq('active', true);

    const connection = connections?.[0]; // Simplified - you might want better matching logic

    if (!connection) {
      console.log('No active Facebook connection found');
      return;
    }

    const facebookConfig = {
      pageAccessToken: connection.credentials.page_access_token,
      pageId: connection.credentials.page_id,
      appSecret: connection.credentials.app_secret,
      webhookVerifyToken: connection.credentials.webhook_verify_token
    };

    const facebook = new FacebookMessengerIntegration(facebookConfig);

    // Process postback payload
    let response = '';
    switch (postback.payload) {
      case 'GET_STARTED':
        response = `Hi! I'm ${connection.chatbots.name}. How can I help you today?`;
        break;
      case 'HELP':
        response = 'Here are some things I can help you with...';
        break;
      default:
        response = await processMessageWithAI(postback.payload, connection.chatbot_id);
    }

    // Send response
    await facebook.sendTextMessage(postback.senderId, response);
  } catch (error) {
    console.error('Error handling Facebook postback:', error);
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
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://intaj.ai',
        'X-Title': 'Intaj AI Platform'
      } as HeadersInit,
      body: JSON.stringify({
        model: chatbot.model || 'openai/gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are ${chatbot.name}, an AI assistant on Facebook Messenger. ${chatbot.settings?.systemPrompt || 'Be helpful and professional.'}`
          },
          ...conversationHistory
        ],
        max_tokens: 1000,
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
