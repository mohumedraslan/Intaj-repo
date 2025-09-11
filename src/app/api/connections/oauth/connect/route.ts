import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import crypto from 'crypto';

/**
 * API endpoint for initiating OAuth connection flow
 * GET /api/connections/oauth/connect?platform=[platformName]
 */
export async function GET(request: NextRequest) {
  try {
    // Get user from request headers (assuming auth middleware sets this)
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get platform from query params
    const url = new URL(request.url);
    const platform = url.searchParams.get('platform');
    const chatbotId = url.searchParams.get('chatbotId');

    if (!platform) {
      return NextResponse.json(
        { error: 'Platform parameter is required' },
        { status: 400 }
      );
    }

    // Generate state parameter to prevent CSRF attacks
    const state = crypto.randomBytes(16).toString('hex');

    // Store state in database temporarily for verification during callback
    const { error: stateError } = await supabase
      .from('oauth_states')
      .insert({
        user_id: user.id,
        state,
        platform,
        chatbot_id: chatbotId || null,
        expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour expiry
      });

    if (stateError) {
      console.error('Failed to store OAuth state:', stateError);
      return NextResponse.json(
        { error: 'Failed to initiate OAuth flow' },
        { status: 500 }
      );
    }

    // Get OAuth configuration for the platform
    const oauthConfig = getOAuthConfig(platform);
    if (!oauthConfig) {
      return NextResponse.json(
        { error: `OAuth not supported for platform: ${platform}` },
        { status: 400 }
      );
    }

    // Construct authorization URL
    const authUrl = constructAuthUrl(oauthConfig, state);

    // Return the authorization URL for the frontend to redirect to
    return NextResponse.json({
      authUrl,
      state,
    });
  } catch (error) {
    console.error('Error initiating OAuth flow:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
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
 * Construct the authorization URL for OAuth flow
 */
function constructAuthUrl(config: OAuthConfig, state: string): string {
  const url = new URL(config.authorizationUrl);
  
  url.searchParams.append('client_id', config.clientId);
  url.searchParams.append('redirect_uri', config.redirectUri);
  url.searchParams.append('state', state);
  url.searchParams.append('scope', config.scope);
  url.searchParams.append('response_type', 'code');
  
  return url.toString();
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