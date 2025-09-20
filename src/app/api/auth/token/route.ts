import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/auth/token - Get current user's access token
 * This endpoint helps you get a valid access token for API testing
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get current session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      return NextResponse.json({ 
        error: 'No active session found. Please sign in first.',
        instructions: [
          '1. Open your app in the browser',
          '2. Sign in to your account', 
          '3. Then call this endpoint again'
        ]
      }, { status: 401 });
    }
    
    return NextResponse.json({
      access_token: session.access_token,
      user_id: session.user.id,
      email: session.user.email,
      expires_at: session.expires_at,
      curl_example: `curl -X POST "http://localhost:3000/api/agents" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${session.access_token}" \\
  -d '{
    "name": "Test Support Agent",
    "base_prompt": "You are a helpful customer support assistant",
    "model": "gpt-4o",
    "integrations": {
      "telegramToken": "YOUR_TELEGRAM_TOKEN",
      "autoSetupWebhook": true,
      "baseUrl": "https://your-domain.com/"
    }
  }'`
    });
    
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Failed to get token', 
      details: error.message 
    }, { status: 500 });
  }
}

/**
 * POST /api/auth/token - Sign in and get access token
 * Body: { email: string, password: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    
    if (!email || !password) {
      return NextResponse.json({ 
        error: 'Email and password are required' 
      }, { status: 400 });
    }
    
    const supabase = createClient();
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      return NextResponse.json({ 
        error: 'Sign in failed', 
        details: error.message 
      }, { status: 401 });
    }
    
    if (!data.session) {
      return NextResponse.json({ 
        error: 'No session created' 
      }, { status: 401 });
    }
    
    return NextResponse.json({
      access_token: data.session.access_token,
      user_id: data.user.id,
      email: data.user.email,
      expires_at: data.session.expires_at,
      curl_example: `curl -X POST "http://localhost:3000/api/agents" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${data.session.access_token}" \\
  -d '{
    "name": "Test Support Agent", 
    "base_prompt": "You are a helpful customer support assistant",
    "model": "gpt-4o"
  }'`
    });
    
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Failed to sign in', 
      details: error.message 
    }, { status: 500 });
  }
}
