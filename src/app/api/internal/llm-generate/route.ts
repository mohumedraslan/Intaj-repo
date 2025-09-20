import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generate } from '@/lib/ai/llm';

export async function POST(req: NextRequest) {
  const adminKey = process.env.INTERNAL_ADMIN_KEY;
  const provided = req.headers.get('x-admin-key');
  if (!adminKey || provided !== adminKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { agentId, messages } = await req.json();
    if (!agentId || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'agentId and messages are required' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: agent, error } = await supabase
      .from('agents')
      .select('id, model, provider, base_prompt')
      .eq('id', agentId)
      .single();

    if (error || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const text = await generate({ agent, messages });
    return NextResponse.json({ text });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
