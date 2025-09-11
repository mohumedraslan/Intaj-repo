import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { encryptCredentials } from '@/lib/security/connectionCredentials';

/**
 * API endpoint for creating connections using API keys
 * POST /api/connections/connect/api-key
 */
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const { platform, apiKey, botUsername, chatbotId, configOptions } = body;

    if (!platform || !apiKey) {
      return NextResponse.json(
        { error: 'Platform and API key are required' },
        { status: 400 }
      );
    }

    // Validate API key format based on platform
    if (!validateApiKey(platform, apiKey)) {
      return NextResponse.json(
        { error: 'Invalid API key format' },
        { status: 400 }
      );
    }

    // Optional: Test the API key with the platform's API
    // This would be platform-specific and could be implemented later

    // Prepare credentials object
    const credentials = {
      apiKey,
      ...(botUsername && { botUsername }), // Add bot username if provided (for Telegram)
    };

    // Encrypt credentials
    const encryptedCredentials = encryptCredentials(credentials);

    // Store in database
    const { data, error } = await supabase
      .from('connections')
      .insert({
        user_id: user.id,
        chatbot_id: chatbotId || null, // Optional chatbot association
        platform,
        credentials: encryptedCredentials,
        active: true,
        ...(configOptions && { config_options: configOptions }), // Add any additional config
      })
      .select('id, platform, active, created_at');

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to save connection' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully connected to ${platform}`,
      connection: data[0],
    });
  } catch (error) {
    console.error('Error in API key connection:', error);
    return NextResponse.json(
      { error: 'Failed to process connection request' },
      { status: 500 }
    );
  }
}

/**
 * Validates API key format based on platform requirements
 * @param platform The platform identifier
 * @param apiKey The API key to validate
 * @returns Boolean indicating if the API key format is valid
 */
function validateApiKey(platform: string, apiKey: string): boolean {
  // Basic validation - ensure API key is not empty and has minimum length
  if (!apiKey || apiKey.trim().length < 8) {
    return false;
  }

  // Platform-specific validation
  switch (platform.toLowerCase()) {
    case 'telegram':
      // Telegram bot tokens typically follow pattern: 123456789:ABCDefghijklmnopqrstuvwxyz
      return /^\d+:[A-Za-z0-9_-]+$/.test(apiKey);

    case 'whatsapp':
      // WhatsApp API keys are typically long alphanumeric strings
      return apiKey.length >= 32;

    // Add more platform-specific validations as needed

    default:
      // For unknown platforms, just check reasonable length
      return apiKey.length >= 16;
  }
}