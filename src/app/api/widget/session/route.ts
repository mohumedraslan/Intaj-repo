// src/app/api/widget/session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/storageClient';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  const { chatbot_id } = await req.json();
  // Generate a short-lived session token (for demo, just a UUID)
  const token = randomUUID();
  // Optionally store in DB for validation
  await supabase.from('widget_sessions').insert({
    chatbot_id,
    token,
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
  });
  return NextResponse.json({ token });
}
