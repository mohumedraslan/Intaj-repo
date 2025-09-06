import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseClient";

export async function POST(req: NextRequest) {
  try {
    const { name, model, settings } = await req.json();
    const supabase = createClient();
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { data, error } = await supabase
      .from("chatbots")
      .insert({ user_id: user.id, name, model, settings })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ chatbot: data });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
