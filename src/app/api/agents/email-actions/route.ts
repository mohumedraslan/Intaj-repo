import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { performEmailAction, autoSortEmails } from '@/lib/agents/tools/emailActions';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { agentId, userId, action, emailId, category, replyContent } = body;

    if (!agentId || !userId || !action) {
      return NextResponse.json({ 
        error: 'Missing required parameters: agentId, userId, and action are required' 
      }, { status: 400 });
    }

    let result: string;

    if (action === 'auto_sort') {
      result = await autoSortEmails({ agentId, userId });
    } else {
      result = await performEmailAction({
        agentId,
        userId,
        action,
        emailId,
        category,
        replyContent
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: result 
    });

  } catch (error) {
    console.error('Error in email actions API:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
