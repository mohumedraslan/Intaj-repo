import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { encryptCredentials } from '@/lib/security/connectionCredentials';

/**
 * API endpoint for handling OAuth callback
 * GET /api/connections/oauth/callback?code=[authCode]&state=[state]
 */
export async function GET(request: NextRequest) {
  try {
    // Get code and state from query params
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/connections?error=invalid_callback`
      );
    }

    // Verify state parameter to prevent CSRF attacks
    const { data: stateData, error: stateError } = await supabase
      .from('oauth_states')
      .select('*')
      .eq('state', state)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (stateError || !stateData) {
      console.error('Invalid or expired OAuth state:', stateError);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/connections?error=invalid_state`
      );
    }

    // Get platform and user from state data
    const { platform, user_id, chatbot_id } = stateData;

    // Get OAuth configuration for the platform
    const oauthConfig = getOAuthConfig(platform);
    if (!oauthConfig) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/connections?error=unsupported_platform`
      );
    }

    // Exchange authorization code for access token
    const tokenResponse = await exchangeCodeForToken(code, oauthConfig);
    if (!tokenResponse.success) {
      console.error('Failed to exchange code for token:', tokenResponse.error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/connections?error=token_exchange_failed`
      );
    }

    // Encrypt tokens before storing
    const encryptedCredentials = encryptCredentials(tokenResponse.tokens);

    // Store connection in database
    const { error: connectionError } = await supabase
      .from('connections')
      .insert({
        user_id,
        chatbot_id: chatbot_id || null,
        platform,
        credentials: encryptedCredentials,
        active: true,
      });

    if (connectionError) {
      console.error('Failed to store connection:', connectionError);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/connections?error=connection_failed`
      );
    }

    // Clean up the used state
    await supabase
      .from('oauth_states')
      .delete()
      .eq('state', state);

    // Redirect back to connections page with success message
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/connections?success=true&platform=${platform}`
    );
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/connections?error=server_error`
    );
  }
}

/**
 * Exchange authorization code for access token
 */
async function exchangeCodeForToken(code: string, config: OAuthConfig) {
  try {
    const params = new URLSearchParams();
    params.append('code', code);
    params.append('client_id', config.clientId);
    params.append('client_secret', config.clientSecret);
    params.append('redirect_uri', config.redirectUri);
    params.append('grant_type', 'authorization_code');

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorData = await response.text();
      return { success: false, error: errorData };
    }

    const data = await response.json();

    // Format tokens based on platform response
    const tokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null,
      tokenType: data.token_type,
      scope: data.scope,
      // Store any platform-specific data
      platformData: getPlatformSpecificData(data),
    };

    return { success: true, tokens };
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    return { success: false, error: 'Failed to exchange code for token' };
  }
}

/**
 * Extract platform-specific data from token response
 */
function getPlatformSpecificData(data: any) {
  // Extract platform-specific data from the token response
  // This will vary by platform
  const platformData: Record<string, any> = {};

  // Slack-specific data
  if (data.team) {
    platformData.teamId = data.team.id;
    platformData.teamName = data.team.name;
  }

  if (data.incoming_webhook) {
    platformData.webhookUrl = data.incoming_webhook.url;
    platformData.webhookChannel = data.incoming_webhook.channel;
  }

  // Discord-specific data
  if (data.guild) {
    platformData.guildId = data.guild.id;
    platformData.guildName = data.guild.name;
  }

  return platformData;
}

/**
 * Get OAuth configuration for a specific platform
 */
function getOAuthConfig(platform: string) {
  const configs: Record<string, OAuthConfig> = {
    slack: {
      clientId: process.env.SLACK_CLIENT_ID || '',
      clientSecret: process.env.SLACK_CLIENT_SECRET || '',
      authorizationUrl: 'https://slack.com/oauth/v2/authorize',
      tokenUrl: 'https://slack.com/api/oauth.v2.access',
      scope: 'chat:write,channels:read,channels:join',
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/connections/oauth/callback`,
    },
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID || '',
      clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
      authorizationUrl: 'https://discord.com/api/oauth2/authorize',
      tokenUrl: 'https://discord.com/api/oauth2/token',
      scope: 'bot applications.commands',
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/connections/oauth/callback`,
    },
    // Add more platforms as needed
  };

  return configs[platform.toLowerCase()];
}

/**
 * OAuth configuration interface
 */
interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  scope: string;
  redirectUri: string;
}