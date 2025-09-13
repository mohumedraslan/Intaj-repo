import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { generateResponse } from '@/lib/ai/responseGenerator';

export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const { agentId, message } = await request.json();
    
    // Validate required fields
    if (!agentId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: agentId and message are required' },
        { status: 400 }
      );
    }
    
    // Get the authenticated user
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Verify the user has access to this agent
    const { data: agent, error: agentError } = await supabase
      .from('chatbots')
      .select('*')
      .eq('id', agentId)
      .single();
    
    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }
    
    // Generate a response using the AI service
    const response = await generateResponse({
      agentId,
      message,
      userId: user.id
    });
    
    // Store the message in the database
    await supabase.from('messages').insert([
      {
        chatbot_id: agentId,
        user_id: user.id,
        role: 'user',
        content: message
      },
      {
        chatbot_id: agentId,
        user_id: user.id,
        role: 'assistant',
        content: response
      }
    ]);
    
    return NextResponse.json({ reply: response });
    
  } catch (error) {
    console.error('Agent chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}