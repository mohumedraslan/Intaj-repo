import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

interface TelegramMessage {
  message_id: number;
  from: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
  };
  chat: {
    id: number;
    type: string;
  };
  date: number;
  text?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const agentId = params.agentId;
    const update: TelegramUpdate = await request.json();

    if (!update.message || !update.message.text) {
      return NextResponse.json({ ok: true });
    }

    const message = update.message;
    const userMessage = message.text;
    const telegramUserId = message.from.id;
    const chatId = message.chat.id;

    // Get the Telegram bot configuration
    const { data: telegramBot, error: botError } = await supabase
      .from('telegram_bots')
      .select('*')
      .eq('agent_id', agentId)
      .eq('is_active', true)
      .single();

    if (botError || !telegramBot) {
      console.error('Telegram bot not found:', botError);
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    // Get the agent configuration
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      console.error('Agent not found:', agentError);
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Check for auto-responses first
    const settings = telegramBot.settings || {};
    const autoResponses = settings.auto_responses;
    
    if (autoResponses?.enabled && autoResponses.keywords) {
      const lowerMessage = userMessage.toLowerCase();
      const matchedKeyword = autoResponses.keywords.find((item: any) => 
        lowerMessage.includes(item.keyword.toLowerCase())
      );
      
      if (matchedKeyword) {
        await sendTelegramMessage(telegramBot.bot_token, chatId, matchedKeyword.response);
        
        // Log the interaction
        await logTelegramMessage(agentId, telegramUserId, userMessage, matchedKeyword.response, 'auto_response');
        
        return NextResponse.json({ ok: true });
      }
    }

    // Handle different support modes
    const supportMode = settings.support_mode || 'auto';
    
    if (supportMode === 'manual') {
      // Manual mode - just log and notify human agents
      await logTelegramMessage(agentId, telegramUserId, userMessage, null, 'manual_pending');
      
      const notificationMessage = `New message from ${message.from.first_name}: "${userMessage}"`;
      // Here you could send notifications to human agents
      
      return NextResponse.json({ ok: true });
    }

    // Auto or hybrid mode - generate AI response
    let aiResponse: string;
    
    try {
      // Check business hours if enabled
      if (settings.business_hours?.enabled) {
        const isBusinessHours = checkBusinessHours(settings.business_hours);
        if (!isBusinessHours) {
          const outOfHoursMessage = "Thank you for your message! We're currently outside business hours. We'll get back to you as soon as possible.";
          await sendTelegramMessage(telegramBot.bot_token, chatId, outOfHoursMessage);
          await logTelegramMessage(agentId, telegramUserId, userMessage, outOfHoursMessage, 'out_of_hours');
          return NextResponse.json({ ok: true });
        }
      }

      // Generate AI response
      aiResponse = await generateAIResponse(agent, userMessage, telegramUserId);
      
      // Send response
      await sendTelegramMessage(telegramBot.bot_token, chatId, aiResponse);
      
      // Log the interaction
      await logTelegramMessage(agentId, telegramUserId, userMessage, aiResponse, 'ai_response');
      
    } catch (error) {
      console.error('Error generating AI response:', error);
      
      if (supportMode === 'hybrid') {
        // Fallback to human in hybrid mode
        const fallbackMessage = "I'm having trouble processing your request. Let me connect you with a human agent.";
        await sendTelegramMessage(telegramBot.bot_token, chatId, fallbackMessage);
        await logTelegramMessage(agentId, telegramUserId, userMessage, fallbackMessage, 'human_escalation');
      } else {
        // Auto mode fallback
        const errorMessage = "I apologize, but I'm experiencing technical difficulties. Please try again in a moment.";
        await sendTelegramMessage(telegramBot.bot_token, chatId, errorMessage);
        await logTelegramMessage(agentId, telegramUserId, userMessage, errorMessage, 'error');
      }
    }

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function sendTelegramMessage(botToken: string, chatId: number, text: string) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown'
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to send Telegram message: ${response.statusText}`);
  }

  return response.json();
}

async function generateAIResponse(agent: any, userMessage: string, userId: number): Promise<string> {
  // Get conversation history for context
  const { data: history } = await supabase
    .from('telegram_messages')
    .select('user_message, bot_response')
    .eq('agent_id', agent.id)
    .eq('telegram_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);

  const conversationContext = history?.map((h: any) => 
    `User: ${h.user_message}\nAssistant: ${h.bot_response}`
  ).join('\n\n') || '';

  // Prepare the prompt
  const systemPrompt = agent.base_prompt || 
    "You are a helpful AI assistant. Respond to user messages in a friendly and professional manner.";
  
  const fullPrompt = `${systemPrompt}

Previous conversation:
${conversationContext}

Current user message: ${userMessage}

Please provide a helpful response:`;

  // Call your AI service (OpenAI, Claude, etc.)
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: agent.model || 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 500,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error('Failed to generate AI response');
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'I apologize, but I cannot process your request right now.';
}

async function logTelegramMessage(
  agentId: string, 
  telegramUserId: number, 
  userMessage: string, 
  botResponse: string | null, 
  responseType: string
) {
  try {
    await supabase
      .from('telegram_messages')
      .insert({
        agent_id: agentId,
        telegram_user_id: telegramUserId,
        user_message: userMessage,
        bot_response: botResponse,
        response_type: responseType,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error logging Telegram message:', error);
  }
}

function checkBusinessHours(businessHours: any): boolean {
  if (!businessHours.enabled) return true;

  const now = new Date();
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

  const schedule = businessHours.schedule[dayOfWeek];
  if (!schedule || !schedule.enabled) return false;

  return currentTime >= schedule.start && currentTime <= schedule.end;
}
