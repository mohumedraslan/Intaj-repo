const { execSync } = require('child_process');
const axios = require('axios');

async function verifyDeployment() {
  try {
    console.log('🚀 Starting Intaj Platform Deployment Verification');
    
    // 1. Verify environment variables
    console.log('🔍 Checking environment variables...');
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'INTERNAL_ADMIN_KEY',
      'OPENROUTER_API_KEY'
    ];
    
    requiredVars.forEach(varName => {
      if (!process.env[varName]) {
        throw new Error(`Missing required environment variable: ${varName}`);
      }
    });
    console.log('✅ Environment variables verified');
    
    // 2. Verify Supabase connection
    console.log('🔗 Testing Supabase connection...');
    const supabase = require('@supabase/supabase-js').createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    const { data, error } = await supabase.from('agents').select('*').limit(1);
    if (error) throw error;
    console.log('✅ Supabase connection working');
    
    // 3. Verify OpenRouter connection
    console.log('🧠 Testing OpenRouter connection...');
    const openrouterResponse = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }]
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!openrouterResponse.data.choices) {
      throw new Error('OpenRouter API not responding correctly');
    }
    console.log('✅ OpenRouter connection working');
    
    // 4. Verify Telegram webhook (if token provided)
    if (process.env.TELEGRAM_BOT_TOKEN) {
      console.log('🤖 Testing Telegram webhook setup...');
      const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/telegram/test`;
      
      const telegramResponse = await axios.post(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/setWebhook`,
        { url: webhookUrl }
      );
      
      if (!telegramResponse.data.ok) {
        throw new Error(`Telegram webhook setup failed: ${telegramResponse.data.description}`);
      }
      console.log('✅ Telegram webhook setup working');
    }
    
    console.log('🎉 All systems verified! Ready for deployment.');
    
  } catch (error) {
    console.error('❌ Deployment verification failed:', error.message);
    process.exit(1);
  }
}

verifyDeployment();
