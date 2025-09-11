import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createClient } from '@/lib/serverSupabase';
import { encryptCredentials } from '@/lib/security/connectionCredentials';

export async function GET(request: NextRequest, { params }: { params: { platform: string } }) {
  try {
    // Get the user session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get the platform from the URL params
    const { platform } = params;
    if (!platform) {
      return NextResponse.json({ success: false, error: 'Platform is required' }, { status: 400 });
    }

    // Get the authorization code and state from the query parameters
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      return NextResponse.redirect(new URL(`/connections?error=missing_params&platform=${platform}`, request.url));
    }

    // Create Supabase client
    const supabase = createClient();

    // Verify the state parameter to prevent CSRF attacks
    const { data: stateData, error: stateError } = await supabase
      .from('oauth_states')
      .select('*')
      .eq('state', state)
      .eq('user_id', session.user.id)
      .eq('platform', platform)
      .single();

    if (stateError || !stateData) {
      return NextResponse.redirect(new URL(`/connections?error=invalid_state&platform=${platform}`, request.url));
    }

    // Check if the state has expired
    if (new Date(stateData.expires_at) < new Date()) {
      // Delete the expired state
      await supabase
        .from('oauth_states')
        .delete()
        .eq('id', stateData.id);

      return NextResponse.redirect(new URL(`/connections?error=expired_state&platform=${platform}`, request.url));
    }

    // Exchange the code for an access token
    // This will vary depending on the platform
    let tokenResponse;
    let credentials;

    switch (platform) {
      case 'slack':
        tokenResponse = await exchangeSlackCode(code);
        if (!tokenResponse.ok) {
          return NextResponse.redirect(new URL(`/connections?error=token_exchange&platform=${platform}`, request.url));
        }
        credentials = {
          accessToken: tokenResponse.access_token,
          teamId: tokenResponse.team?.id,
          teamName: tokenResponse.team?.name,
          botUserId: tokenResponse.bot_user_id,
          authedUserId: tokenResponse.authed_user?.id
        };
        break;

      case 'discord':
        tokenResponse = await exchangeDiscordCode(code, request.url);
        if (!tokenResponse.access_token) {
          return NextResponse.redirect(new URL(`/connections?error=token_exchange&platform=${platform}`, request.url));
        }
        credentials = {
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token,
          tokenType: tokenResponse.token_type,
          expiresIn: tokenResponse.expires_in
        };
        break;

      default:
        return NextResponse.redirect(new URL(`/connections?error=unsupported_platform&platform=${platform}`, request.url));
    }

    // Encrypt the credentials
    const encryptedCredentials = encryptCredentials(credentials);

    // Store the connection in the database
    const { data: connection, error: connectionError } = await supabase
      .from('connections')
      .insert({
        user_id: session.user.id,
        platform,
        credentials: encryptedCredentials,
        chatbot_id: stateData.chatbot_id || null,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (connectionError) {
      console.error('Error creating connection:', connectionError);
      return NextResponse.redirect(new URL(`/connections?error=database_error&platform=${platform}`, request.url));
    }

    // Delete the state from the database
    await supabase
      .from('oauth_states')
      .delete()
      .eq('id', stateData.id);

    // Encode connection data to pass back to the client
    const connectionData = encodeURIComponent(JSON.stringify({
      id: connection.id,
      platform,
      status: 'active',
      created_at: connection.created_at
    }));

    // Redirect back to the connections page with success
    return NextResponse.redirect(new URL(`/connections?connectionSuccess=true&platform=${platform}&connectionData=${connectionData}`, request.url));

  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(new URL(`/connections?error=server_error&platform=${params.platform}`, request.url));
  }
}

async function exchangeSlackCode(code: string) {
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('Slack client credentials are not configured');
  }

  const response = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret
    })
  });

  return await response.json();
}

async function exchangeDiscordCode(code: string, requestUrl: string) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('Discord client credentials are not configured');
  }

  // Extract the redirect URI from the request URL
  const redirectUri = new URL('/api/connections/oauth/callback/discord', requestUrl).toString();

  const response = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri
    })
  });

  return await response.json();
}