import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { token, agentId, agentType } = await request.json();

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

    const botInfo = botInfoData.result;
    console.log('🤖 Testing bot:', botInfo.username, botInfo.first_name);

    // Send a test message to our platform bot using the customer's bot
    const platformBotToken = process.env.TELEGRAM_BOT_TOKEN;
    const platformBotChatId = process.env.TELEGRAM_PLATFORM_CHAT_ID || '6975194138'; // Your chat ID

    if (platformBotToken && platformBotChatId) {
      const testMessage = `🧪 **Integration Test Successful!**

✅ Customer Bot: @${botInfo.username || botInfo.first_name}
🤖 Bot ID: ${botInfo.id}
📅 Test Time: ${new Date().toLocaleString()}
🔗 Agent Type: ${agentType || 'N/A'}
🆔 Agent ID: ${agentId || 'Will be created'}

The Telegram integration is working correctly! The customer's bot "${botInfo.first_name}" can now receive and respond to messages.

*This is an automated test message from Intaj Platform.*`;

      try {
        const messageResponse = await fetch(`https://api.telegram.org/bot${platformBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: platformBotChatId,
            text: testMessage,
            parse_mode: 'Markdown'
          })
        });

        const messageData = await messageResponse.json();
        console.log('📤 Test message sent to platform bot:', messageData.ok);
      } catch (error) {
        console.error('Failed to send test message to platform bot:', error);
      }
    }

    // For testing during agent creation, we'll skip webhook setup since we don't have agent ID yet
    let webhookData = { ok: false, description: 'Webhook will be set up after agent creation' };
    let webhookUrl = 'Will be configured after agent creation';
    
    if (agentId) {
      // Only set webhook if we have an actual agent ID
      webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/telegram/${agentId}`;
      
      const webhookResponse = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message', 'callback_query'],
          drop_pending_updates: true
        })
      });

      webhookData = await webhookResponse.json();
      console.log('🔗 Webhook setup result:', webhookData);
    } else {
      console.log('🔗 Skipping webhook setup - no agent ID provided (testing during creation)');
    }

    return NextResponse.json({
      success: true,
      botInfo: botInfo,
      webhook: {
        success: webhookData.ok,
        url: webhookUrl,
        description: webhookData.description || (webhookData.ok ? 'Webhook set successfully' : 'Failed to set webhook')
      },
      testMessage: platformBotToken ? 'Test notification sent to platform bot' : 'Platform bot not configured',
      message: `✅ Integration test successful! Bot @${botInfo.username || botInfo.first_name} is ready to receive messages.`
    });

  } catch (error) {
    console.error('Telegram test error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to test bot token' 
    }, { status: 500 });
  }
}
