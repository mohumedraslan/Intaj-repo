import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
import { ipRateLimiter } from '@/lib/ipRateLimiter';
import { getClientIp } from '@/lib/getClientIp';

// Initialize Supabase and OpenAI clients
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const { message, chatbotId } = await req.json();

    if (!message || !chatbotId) {
      return NextResponse.json({ error: 'Message and chatbotId are required' }, { status: 400 });
    }

    // Implement IP-based rate limiting
    const clientIp = getClientIp(req);
    const rateLimit = await ipRateLimiter.checkLimit(clientIp, 'api_widget_chat');
    
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { 
          status: 429,
          headers: {
            'Retry-After': rateLimit.retryAfter.toString(),
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimit.reset).toISOString()
          }
        }
      );
    }

    // 1. Fetch the chatbot's configuration from the database
    const { data: chatbot, error: chatbotError } = await supabase
      .from('chatbots')
      .select('base_prompt, model')
      .eq('id', chatbotId)
      .single();

    if (chatbotError || !chatbot) {
      console.error('Chatbot fetch error:', chatbotError);
      return NextResponse.json({ error: 'Chatbot not found or could not be fetched.' }, { status: 404 });
    }

    // 2. Construct the prompt for the AI model
    const fullPrompt = `${chatbot.base_prompt || 'You are a helpful assistant.'}\n\nUser: ${message}\nAssistant:`;

    // 3. Call the OpenAI API to get a response
    const completion = await openai.chat.completions.create({
      model: chatbot.model || 'gpt-4o', // Use the chatbot's configured model or a default
      messages: [
        { role: 'system', content: chatbot.base_prompt || 'You are a helpful assistant.' },
        { role: 'user', content: message }
      ],
      max_tokens: 150,
    });

    const reply = completion.choices[0]?.message?.content?.trim();

    if (!reply) {
      return NextResponse.json({ error: 'Could not generate a reply.' }, { status: 500 });
    }

    // 4. Return the reply
    return NextResponse.json({ reply });

  } catch (error) {
    console.error('Error in widget chat API:', error);
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
      'Access-Control-Expose-Headers': 'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After',
    },
  });
}
