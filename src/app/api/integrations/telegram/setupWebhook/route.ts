import { NextRequest, NextResponse } from 'next/server';
import { createClient, createApiClient } from '@/lib/supabase/server';

// Helper to validate and format webhook URL
const getWebhookUrl = (baseUrl: string, agentId: string) => {
  // Handle local development with ngrok
  if (process.env.NODE_ENV === 'development' && baseUrl.includes('localhost')) {
    if (!process.env.NGROK_URL) {
      throw new Error('NGROK_URL is required for local development');
    }
    return `${process.env.NGROK_URL}/api/webhooks/telegram/${agentId}`;
  }
  
  // Production URL must be HTTPS
  if (!baseUrl.startsWith('https://')) {
    throw new Error('Production webhook URL must use HTTPS');
  }
  
  return `${baseUrl}/api/webhooks/telegram/${agentId}`;
};

export async function POST(req: NextRequest) {
  try {
    const { botToken, baseUrl, agentId } = await req.json();
    
    console.log('🔗 Webhook setup request:', {
      hasBotToken: !!botToken,
      baseUrl,
      agentId,
      timestamp: new Date().toISOString()
    });
    
    if (!botToken || !baseUrl) {
      return NextResponse.json({ error: 'botToken and baseUrl are required' }, { status: 400 });
    }

    // Set up Supabase client with authentication
    const authHeader = req.headers.get('Authorization');
    const hasBearerToken = authHeader?.startsWith('Bearer ');
    const supabase = hasBearerToken ? createApiClient(req) : createClient();
    
    // Find connection with transaction
    const { data: connectionData, error: connError } = await supabase
      .from('connections')
      .select('id, agent_id, config')
      .eq('platform', 'telegram')
      .eq('config->>bot_token', botToken)
      .maybeSingle();

    if (connError || !connectionData) {
      console.error('❌ Connection not found:', {
        agentId,
        hasBotToken: !!botToken,
        searchMethod: 'by botToken'
      });
      
      return NextResponse.json({ 
        error: 'Connection not found for this bot token and agent. Please ensure the agent and integration are properly created.',
        details: connError?.message || 'No matching Telegram connection found',
        debug: { agentId, searchMethod: 'by botToken' }
      }, { status: 404 });
    }
    
    const webhookUrl = getWebhookUrl(baseUrl, connectionData.agent_id);
    
    console.log('✅ Connection found:', {
      connectionId: connectionData.id,
      agentId: connectionData.agent_id,
      webhookUrl
    });
    
    // Set webhook with Telegram API
    const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        drop_pending_updates: true
      })
    });

    const telegramResult = await telegramResponse.json();
    
    console.log('🔗 Telegram Webhook Setup:', {
      ok: telegramResult.ok,
      webhookUrl,
      agentId: connectionData.agent_id,
      description: telegramResult.description
    });
    
    if (!telegramResult.ok) {
      return NextResponse.json({
        error: 'Telegram API error',
        details: telegramResult.description,
        webhookUrl
      }, { status: 400 });
    }

    // Update connection with webhook info
    const { error: updateError } = await supabase
      .from('connections')
      .update({
        config: {
          ...connectionData.config,
          webhook_url: webhookUrl,
          webhook_set_at: new Date().toISOString()
        },
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionData.id);

    if (updateError) {
      console.error('Failed to update connection:', updateError);
      return NextResponse.json({
        error: 'Database update failed',
        details: updateError.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      webhookUrl,
      connectionId: connectionData.id,
      agentId: connectionData.agent_id,
      telegramResponse: telegramResult
    });

  } catch (error: any) {
    console.error('Webhook setup error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
