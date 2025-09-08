// src/app/api/data_sources/route.ts
// API route for file upload metadata (Prompt 010)
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: NextRequest) {
  // supabase is already imported and ready to use
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const body = await req.json();
  const { file_name, file_url, file_type } = body;
  const { data, error } = await supabase
    .from('data_sources')
    .insert({ user_id: user.id, file_name, file_url, file_type })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
