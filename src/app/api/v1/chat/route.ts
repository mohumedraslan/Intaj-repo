import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
import { createHash } from 'crypto';

// Initialize Supabase and OpenAI clients
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Helper function to hash the API key
const hashApiKey = (apiKey: string) => {
  return createHash('sha256').update(apiKey).digest('hex');
};

export async function POST(req: Request) {
  try {
    // 1. Authenticate the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid API key' }, { status: 401 });
    }
    const apiKey = authHeader.split(' ')[1];
    const apiKeyHash = hashApiKey(apiKey);

    // Find the user associated with this API key hash
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('user_id')
      .eq('api_key_hash', apiKeyHash)
      .single();

    if (keyError || !keyData) {
      return NextResponse.json({ error: 'Unauthorized: Invalid API key' }, { status: 401 });
    }

    const { userId } = keyData;

    // 2. Get the message and agentId from the request body
    const { message, agentId } = await req.json();

    if (!message || !agentId) {
      return NextResponse.json({ error: 'Message and agentId are required' }, { status: 400 });
    }

    // 3. Fetch the agent's configuration, ensuring it belongs to the authenticated user
    const { data: agent, error: agentError } = await supabase
      .from('chatbots') // Assuming 'chatbots' is the table for agents
      .select('base_prompt, model')
      .eq('id', agentId)
      .eq('user_id', userId) // Security check
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found or you do not have permission to access it.' }, { status: 404 });
    }

    // 4. Call the OpenAI API to get a response
    const completion = await openai.chat.completions.create({
      model: agent.model || 'gpt-4o',
      messages: [
        { role: 'system', content: agent.base_prompt || 'You are a helpful assistant.' },
        { role: 'user', content: message }
      ],
      max_tokens: 150,
    });

    const reply = completion.choices[0]?.message?.content?.trim();

    if (!reply) {
      return NextResponse.json({ error: 'Could not generate a reply.' }, { status: 500 });
    }

    // 5. Return the reply
    return NextResponse.json({ reply });

  } catch (error) {
    console.error('Error in public chat API:', error);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}

// Add an OPTIONS method to handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
