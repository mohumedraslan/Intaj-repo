import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { google } from 'googleapis';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code) {
    return NextResponse.json({ error: 'Authorization code is missing' }, { status: 400 });
  }

  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return NextResponse.redirect(new URL('/auth?error=unauthenticated', request.url));
  }

  // TODO: Validate the 'state' parameter against a stored value to prevent CSRF attacks.
  // For now, we'll assume the state is a simple string containing the agentId.
  const agentId = state;
  if (!agentId) {
    return NextResponse.json({ error: 'State parameter (agentId) is missing' }, { status: 400 });
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI // Should be the URL of this endpoint
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const { access_token, refresh_token, scope } = tokens;

    if (!refresh_token) {
      // This can happen if the user has already granted consent and a refresh token was not requested again.
      // The 'access_type=offline' and 'prompt=consent' parameters in the initial auth URL are important.
      console.warn('No refresh token received from Google. The user may have already authorized the app.');
    }

    console.log('Successfully received tokens from Google.');
    console.log('Access Token:', access_token ? 'Exists' : 'Missing');
    console.log('Refresh Token:', refresh_token ? 'Exists' : 'Missing');

    // Encrypt and store the refresh token
    if (refresh_token) {
      const { encrypt } = await import('@/lib/security/encryption');
      const encryptedToken = encrypt(refresh_token);

      // Save the connection to the database
      const { error: dbError } = await supabase.from('connections').upsert({
        chatbot_id: agentId, // Using chatbot_id as per the table schema seen in frontend code
        user_id: session.user.id,
        platform: 'google',
        credentials: encryptedToken,
        active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'chatbot_id, platform' // Upsert based on agent and platform
      });

      if (dbError) {
        console.error('Error saving connection to the database:', dbError);
        const redirectUrl = new URL(`/dashboard/agents/${agentId}`, request.url);
        redirectUrl.searchParams.set('error', 'db_connection_failed');
        return NextResponse.redirect(redirectUrl);
      }
    }

    // Redirect the user back to the agent configuration page
    const redirectUrl = new URL(`/dashboard/agents/${agentId}`, request.url);
    redirectUrl.searchParams.set('status', 'connection_successful');
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('Error exchanging authorization code for tokens:', error);
    const redirectUrl = new URL(`/dashboard/agents/${agentId}`, request.url);
    redirectUrl.searchParams.set('error', 'google_oauth_failed');
    return NextResponse.redirect(redirectUrl);
  }
}
