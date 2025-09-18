import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ 
        success: false, 
        error: 'Bot token is required' 
      }, { status: 400 });
    }

    // Test bot token by getting bot info
    const botInfoResponse = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const botInfoData = await botInfoResponse.json();

    if (!botInfoData.ok) {
      return NextResponse.json({ 
        success: false, 
        error: botInfoData.description || 'Invalid bot token' 
      }, { status: 400 });
    }

    // Try to set webhook (optional - just to test API access)
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/telegram`;
    const webhookResponse = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query']
      })
    });

    const webhookData = await webhookResponse.json();

    return NextResponse.json({
      success: true,
      botInfo: botInfoData.result,
      webhook: webhookData.ok ? 'Set successfully' : 'Failed to set webhook',
      message: 'Bot token is valid and ready to use!'
    });

  } catch (error) {
    console.error('Telegram test error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to test bot token' 
    }, { status: 500 });
  }
}
