import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Message, Attachment } from '@/types/messages';
import { TelegramAdapter } from '@/adapters/telegramAdapter';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Telegram webhook structure
    if (body.message) {
      const message = body.message;
      const supabase = createClient();
      
      // Find the connection/agent for this bot
      const botToken = request.headers.get('x-telegram-bot-token');
      // Optionally resolve connection by bot token (if you store it). We'll leave connection_id null if not found.
      let connection_id: string | null = null;
      let agent_id: string | null = null;
      if (botToken) {
        const { data: conn } = await supabase
          .from('connections')
          .select('id, agent_id, config')
          .eq('platform', 'telegram')
          .eq('config->>bot_token', botToken)
          .maybeSingle();
        if (conn) {
          connection_id = conn.id;
          agent_id = conn.agent_id;
        }
      }

      // Build normalized payload via adapter
      const basePayload = TelegramAdapter.mapIncoming({ message }, { user_id: null, agent_id, connection_id });
      const chat_id = String(message.chat.id);
      const channel: Message['channel'] = 'telegram';
      let conversation_id: string | null = null;
      {
        const { data: existingConv } = await supabase
          .from('conversations')
          .select('id')
          .eq('chat_id', chat_id)
          .eq('channel', channel)
          .eq('connection_id', connection_id)
          .maybeSingle();
        if (existingConv?.id) {
          conversation_id = existingConv.id;
        } else {
          const { data: createdConv, error: createConvError } = await supabase
            .from('conversations')
            .insert({
              user_id: null,
              agent_id,
              connection_id,
              channel,
              status: 'open',
              chat_id,
              first_message_at: new Date(message.date * 1000).toISOString(),
              last_message_at: new Date(message.date * 1000).toISOString(),
              metadata: { telegram: { chat_type: message.chat?.type } }
            })
            .select('id')
            .single();
          if (!createConvError) {
            conversation_id = createdConv.id;
          }
        }
      }

      // Store the unified message
      const insertPayload: Partial<Message> = {
        ...basePayload,
        agent_id,
        connection_id,
        conversation_id,
        channel, // ensure set
        chat_id,  // ensure set
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('messages')
        .insert(insertPayload);

      if (error) {
        console.error('Error storing Telegram message:', error);
      } else if (conversation_id) {
        // Update conversation last_message_at
        await supabase
          .from('conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', conversation_id);
      }

      // Send auto-response (optional)
      const responseText = "Thanks for your message! Our AI agent will respond shortly.";
      
      return NextResponse.json({ 
        method: 'sendMessage',
        chat_id: message.chat.id,
        text: responseText
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
