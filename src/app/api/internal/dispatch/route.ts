import { NextRequest, NextResponse } from 'next/server';
import { dispatchQueued } from '@/lib/messaging/dispatcher';

export async function POST(req: NextRequest) {
  const adminKey = process.env.INTERNAL_ADMIN_KEY;
  const provided = req.headers.get('x-admin-key');
  if (!adminKey || provided !== adminKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sent = await dispatchQueued(50);
    return NextResponse.json({ sent });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
