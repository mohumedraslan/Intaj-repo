import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    console.log('🔔 Telegram webhook received for agent:', agentId, update);

    if (!update.message || !update.message.text) {
      return NextResponse.json({ ok: true });
    }

    const message = update.message;
    const userMessage = message.text;
    const telegramUserId = message.from.id;
    const chatId = message.chat.id;

    const supabase = createClient();

    // Get the agent and its Telegram connection using unified schema
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select(`
        *,
        connections!inner(
          id,
          platform,
          config,
          status
        )
      `)
      .eq('id', agentId)
      .eq('connections.platform', 'telegram')
      .eq('connections.status', 'active')
      .single();

    if (agentError || !agent) {
      console.error('Agent or Telegram connection not found:', agentError);
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const connection = agent.connections[0];
    if (!connection?.config?.bot_token) {
      console.error('No bot token found in connection config');
      return NextResponse.json({ error: 'Bot token not configured' }, { status: 400 });
    }

    // Find or create conversation
    let conversationId: string;
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('agent_id', agentId)
      .eq('platform_user_id', telegramUserId.toString())
      .eq('platform', 'telegram')
      .single();

    if (existingConv) {
      conversationId = existingConv.id;
    } else {
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          agent_id: agentId,
          user_id: null, // No registered user, just platform user
          platform: 'telegram',
          platform_user_id: telegramUserId.toString(),
          status: 'active',
          last_message_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (convError || !newConv) {
        console.error('Failed to create conversation:', convError);
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
      }
      conversationId = newConv.id;
    }

    // Store the inbound message in unified schema
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        user_id: null,
        agent_id: agentId,
        connection_id: connection.id,
        conversation_id: conversationId,
        direction: 'inbound',
        platform: 'telegram',
        platform_message_id: message.message_id.toString(),
        content: userMessage,
        sender_name: `${message.from.first_name} ${message.from.last_name || ''}`.trim(),
        status: 'received',
        created_at: new Date().toISOString()
      });

    if (messageError) {
      console.error('Failed to store message:', messageError);
      return NextResponse.json({ error: 'Failed to store message' }, { status: 500 });
    }

    console.log('✅ Message stored successfully, will be processed by Edge Function');

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// The webhook now stores messages in the unified schema
// Processing and responses are handled by Edge Functions:
// - process-inbound: Generates AI responses using OpenRouter
// - dispatch-outbound: Sends responses back to Telegram
