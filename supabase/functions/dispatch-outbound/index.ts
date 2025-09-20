// Supabase Edge Function: dispatch-outbound
// Scheduled job to send queued outbound messages
// Configure via Supabase scheduler to run every 5-10 seconds

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface Message {
  id: string;
  connection_id: string | null;
  channel: string | null;
  platform?: string | null;
  chat_id?: string | null;
  content_text?: string | null;
  content?: string | null;
  metadata?: Record<string, any> | null;
}

interface Connection {
  id: string;
  config: Record<string, any>;
}

function getAdapter(channel?: string) {
  switch (channel) {
    case 'telegram':
      return { name: 'telegram' };
    // TODO: add whatsapp/facebook/instagram adapters when implemented
    default:
      return null;
  }
}

Deno.serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    
    // Allow both scheduled calls and manual POST triggers
    if (req.method !== 'POST' && url.searchParams.get('manual') !== '1') {
      return new Response(JSON.stringify({ ok: true, hint: 'POST to trigger manually or schedule this function.' }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const supabase = createClient(
      Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')!, 
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch queued outbound messages
    const { data: rows, error } = await supabase
      .from('messages')
      .select('*')
      .eq('direction', 'outbound')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(25);

    if (error) throw error;
    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    let sentCount = 0;

    for (const msg of rows as Message[]) {
      const adapter = getAdapter(msg.channel || msg.platform);
      if (!adapter) {
        // No adapter for this channel yet
        continue;
      }

      try {
        // Send to channel - Telegram example via Bot API
        if ((msg.channel === 'telegram' || msg.platform === 'telegram') && msg.chat_id) {
          // Resolve bot token from connection
          const { data: conn } = await supabase
            .from('connections')
            .select('config')
            .eq('id', msg.connection_id)
            .single();

          const connection = conn as Connection | null;
          const botToken = connection?.config?.bot_token;
          if (!botToken) throw new Error('Missing Telegram bot token for connection');

          const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              chat_id: msg.chat_id, 
              text: msg.content_text || msg.content || '' 
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Telegram API error: ${errorData.description || 'Unknown error'}`);
          }
        }

        // Update status to sent
        await supabase
          .from('messages')
          .update({ 
            status: 'sent', 
            sent_at: new Date().toISOString(), 
            updated_at: new Date().toISOString() 
          })
          .eq('id', msg.id);

        sentCount++;
      } catch (e) {
        // Mark failed
        await supabase
          .from('messages')
          .update({ 
            status: 'failed', 
            updated_at: new Date().toISOString(), 
            metadata: { 
              ...(msg.metadata || {}), 
              error: String(e) 
            } 
          })
          .eq('id', msg.id);
      }
    }

    return new Response(JSON.stringify({ processed: sentCount }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
});
