// Supabase Edge Function: process-inbound
// Schedules: every 10s (configure via Supabase scheduler) or manual invoke
// Processes inbound messages and enqueues outbound replies

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Minimal types mirrored from app
type ChatRole = 'system' | 'user' | 'assistant';

interface AgentRow {
  id: string;
  model?: string | null;
  provider?: 'openai' | 'openrouter' | null;
  base_prompt?: string | null;
}

interface DBMessage {
  id: string;
  agent_id: string | null;
  connection_id: string | null;
  conversation_id: string | null;
  channel: string | null;
  platform?: string | null;
  chat_id?: string | null;
  direction: 'inbound' | 'outbound';
  role?: 'user' | 'agent' | 'system' | null;
  content?: string | null;
  content_text?: string | null;
  status: string;
  created_at?: string;
  metadata?: Record<string, any> | null;
}

// Enhanced with proper logging and error handling
type ProcessingResult = {
  success: boolean;
  messageId: string;
  error?: string;
  timestamp: string;
};

export async function processSingleMessage(
  supabase: any,
  message: any
): Promise<ProcessingResult> {
  const result: ProcessingResult = {
    success: false,
    messageId: message.id,
    timestamp: new Date().toISOString()
  };

  try {
    if (!message.agent_id || !message.conversation_id) {
      result.error = 'Missing agent_id or conversation_id';
      await supabase
        .from('messages')
        .update({ 
          status: 'failed',
          metadata: { 
            ...(message.metadata || {}), 
            error: result.error 
          }
        })
        .eq('id', message.id);
      return result;
    }

    // Get agent with retry logic
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, model, provider, base_prompt')
      .eq('id', message.agent_id)
      .maybeSingle();

    if (agentError || !agent) {
      result.error = agentError?.message || 'Agent not found';
      throw new Error(result.error);
    }

    // Call LLM service
    const llmUrl = Deno.env.get('LLM_GENERATE_URL');
    const llmKey = Deno.env.get('INTERNAL_ADMIN_KEY');
    
    if (!llmUrl || !llmKey) {
      result.error = 'LLM service not configured';
      throw new Error(result.error);
    }

    const resp = await fetch(llmUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'X-ADMIN-KEY': llmKey 
      },
      body: JSON.stringify({
        agentId: agent.id,
        messages: [{
          role: 'user',
          content: message.content_text || message.content || ''
        }]
      }),
    });

    const responseData = await resp.json();
    
    if (!resp.ok || !responseData.text) {
      result.error = responseData.error || 'LLM service error';
      throw new Error(result.error);
    }

    // Create outbound message
    const { error: insertError } = await supabase
      .from('messages')
      .insert({
        agent_id: message.agent_id,
        connection_id: message.connection_id,
        conversation_id: message.conversation_id,
        platform: message.platform,
        chat_id: message.chat_id,
        direction: 'outbound',
        role: 'agent',
        content: responseData.text,
        status: 'queued',
        metadata: { 
          llm_provider: agent.provider,
          llm_model: agent.model 
        }
      });

    if (insertError) {
      result.error = insertError.message;
      throw new Error(result.error);
    }

    // Mark original as processed
    await supabase
      .from('messages')
      .update({ 
        status: 'processed',
        updated_at: new Date().toISOString() 
      })
      .eq('id', message.id);

    result.success = true;
    return result;

  } catch (error) {
    console.error(`Failed to process message ${message.id}:`, error);
    await supabase
      .from('messages')
      .update({ 
        status: 'failed',
        metadata: { 
          ...(message.metadata || {}), 
          error: String(error) 
        }
      })
      .eq('id', message.id);
    
    result.error = String(error);
    return result;
  }
}

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get pending messages
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('direction', 'inbound')
      .eq('status', 'received')
      .order('created_at', { ascending: true })
      .limit(10);

    if (error) throw error;
    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0 }), 
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Process each message
    const results = await Promise.all(
      messages.map(msg => processSingleMessage(supabase, msg))
    );

    return new Response(
      JSON.stringify({ 
        processed: results.filter(r => r.success).length,
        failures: results.filter(r => !r.success).length,
        details: results
      }), 
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Edge Function error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
