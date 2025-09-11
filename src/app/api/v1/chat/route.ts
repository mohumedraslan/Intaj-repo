import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

// Initialize a separate, admin-level Supabase client for API key validation
// This is necessary because we need to query the api_keys table based on a hash,
// which regular users with RLS cannot do.
// IMPORTANT: These environment variables must be set in your deployment environment.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { agentId, message } = await req.json();
    const authHeader = req.headers.get('Authorization');

    if (!agentId || !message) {
      return NextResponse.json({ error: 'Missing agentId or message in request body' }, { status: 400 });
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header is missing or invalid' }, { status: 401 });
    }

    const apiKey = authHeader.split(' ')[1];
    const keyHash = createHash('sha256').update(apiKey).digest('hex');

    // 1. Authenticate the API Key
    const { data: apiKeyData, error: apiKeyError } = await supabaseAdmin
      .from('api_keys')
      .select('user_id')
      .eq('key_hash', keyHash)
      .single();

    if (apiKeyError || !apiKeyData) {
      return NextResponse.json({ error: 'Invalid API Key' }, { status: 401 });
    }

    const userId = apiKeyData.user_id;

    // 2. Authorize: Check if the user has access to the requested agent
    const { data: agentData, error: agentError } = await supabaseAdmin
      .from('chatbots') // Still using 'chatbots' table name
      .select('id, settings')
      .eq('id', agentId)
      .eq('user_id', userId)
      .single();

    if (agentError || !agentData) {
      return NextResponse.json({ error: 'Agent not found or you do not have access' }, { status: 404 });
    }

    // 3. (Mocked) Process the chat logic
    // In a real implementation, this would involve fetching context, calling an LLM, etc.
    const agentSettings = agentData.settings as Record<string, unknown>;
    const agentName = agentSettings.name || 'Agent';

    const responseMessage = `Hello! You sent '${message}' to agent ${agentName} (ID: ${agentId}). This is a mocked response.`;

    // Update the last_used_at timestamp for the API key (fire and forget)
    supabaseAdmin.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('key_hash', keyHash).then();

    return NextResponse.json({
      response: responseMessage,
      agentId: agentId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('API Chat Error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
