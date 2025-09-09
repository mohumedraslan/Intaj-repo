import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: NextRequest) {
  try {
    const { name, description, model, settings } = await req.json();
    console.log('API received data:', { name, description, model, settings });
    
    // supabase is already imported and ready to use
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
    }
    if (!user) {
      console.error('No user found');
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const insertData: any = {
      user_id: user.id,
      name,
      model,
      settings: settings || {}
    };

    // Add description if provided
    if (description) {
      insertData.description = description;
    }

    console.log('Inserting chatbot data:', insertData);

    const { data, error } = await supabase
      .from("chatbots")
      .insert(insertData)
      .select()
      .single();
      
    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    console.log('Chatbot created successfully:', data);
    return NextResponse.json({ chatbot: data });
  } catch (err) {
    console.error('Server error:', err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
