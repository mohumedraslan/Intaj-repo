import { createClient } from '@supabase/supabase-js';
import { TelegramAdapter } from '@/adapters/telegramAdapter';
import type { Message } from '@/types/messages';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getAdapter(channel?: string) {
  switch (channel) {
    case 'telegram':
      return TelegramAdapter;
    // TODO: add whatsapp/facebook/instagram adapters when implemented
    default:
      return null;
  }
}

export async function dispatchQueued(limit = 25) {
  // Fetch queued outbound messages
  const { data: rows, error } = await supabase
    .from('messages')
    .select('*')
    .eq('direction', 'outbound')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  if (!rows || rows.length === 0) return 0;

  let sentCount = 0;

  for (const msg of rows as Message[]) {
    const adapter = getAdapter(msg.channel || msg.platform);
    if (!adapter) {
      // no adapter for this channel yet
      continue;
    }

    try {
      const payload = adapter.mapOutgoing(msg);

      // Send to channel - Telegram example via Bot API
      if (msg.channel === 'telegram' && msg.chat_id) {
        // Resolve bot token from connection
        const { data: conn } = await supabase
          .from('connections')
          .select('config')
          .eq('id', msg.connection_id)
          .maybeSingle();

        const botToken = conn?.config?.bot_token;
        if (!botToken) throw new Error('Missing Telegram bot token for connection');

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: msg.chat_id, text: msg.content_text || msg.content || '' })
        });
      }

      // Update status to sent
      await supabase
        .from('messages')
        .update({ status: 'sent', sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', msg.id as string);

      sentCount++;
    } catch (e) {
      // Mark failed
      await supabase
        .from('messages')
        .update({ status: 'failed', updated_at: new Date().toISOString(), metadata: { ...(msg.metadata || {}), error: String(e) } })
        .eq('id', msg.id as string);
    }
  }

  return sentCount;
}
