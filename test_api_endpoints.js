// =====================================================
// COMPREHENSIVE API ENDPOINT TEST SUITE
// Intaj Platform - All Routes Testing
// =====================================================
// Run with: node test_api_endpoints.js

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_KEY = process.env.INTERNAL_ADMIN_KEY || 'your-admin-key-here';
const JWT_TOKEN = process.env.SUPABASE_JWT_TOKEN || 'your-jwt-token-here';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'your-bot-token-here';

// Test configuration
const TEST_CONFIG = {
    baseUrl: BASE_URL,
    adminKey: ADMIN_KEY,
    jwtToken: JWT_TOKEN,
    botToken: BOT_TOKEN,
    testAgentId: null, // Will be set after agent creation
    testConnectionId: null // Will be set after connection creation
};

async function testEndpoints() {
    console.log('🧪 Testing Intaj API Endpoints\n');

    // Test 1: Create Agent with Telegram Integration
    console.log('1️⃣ Testing Agent Creation with Telegram Integration...');
    try {
        const agentResponse = await fetch(`${BASE_URL}/api/agents`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE' // Replace with actual JWT
            },
            body: JSON.stringify({
                name: 'Test Support Agent',
                base_prompt: 'You are a helpful customer support assistant.',
                model: 'gpt-4o',
                agent_type: 'customer_support',
                integrations: {
                    telegramToken: 'YOUR_BOT_TOKEN_HERE', // Replace with actual bot token
                    autoSetupWebhook: true,
                    baseUrl: BASE_URL
                }
            })
        });

        if (agentResponse.ok) {
            const agentResult = await agentResponse.json();
            console.log('✅ Agent created successfully:', agentResult.agentId);
            console.log('📋 Connection ID:', agentResult.connectionId);
            if (agentResult.webhook?.success) {
                console.log('🔗 Webhook configured automatically');
            }
        } else {
            const error = await agentResponse.json();
            console.log('❌ Agent creation failed:', error.error);
        }
    } catch (error) {
        console.log('❌ Agent creation error:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 2: Manual Webhook Setup
    console.log('2️⃣ Testing Manual Webhook Setup...');
    try {
        const webhookResponse = await fetch(`${BASE_URL}/api/integrations/telegram/setupWebhook`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                botToken: 'YOUR_BOT_TOKEN_HERE', // Replace with actual bot token
                baseUrl: BASE_URL
            })
        });

        if (webhookResponse.ok) {
            const webhookResult = await webhookResponse.json();
            console.log('✅ Webhook setup successful');
            console.log('🔗 Webhook URL:', webhookResult.webhookUrl);
        } else {
            const error = await webhookResponse.json();
            console.log('❌ Webhook setup failed:', error.error);
        }
    } catch (error) {
        console.log('❌ Webhook setup error:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 3: LLM Generation
    console.log('3️⃣ Testing LLM Generation...');
    try {
        const llmResponse = await fetch(`${BASE_URL}/api/internal/llm-generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-ADMIN-KEY': ADMIN_KEY
            },
            body: JSON.stringify({
                agentId: 'AGENT_ID_HERE', // Replace with actual agent ID
                messages: [
                    { role: 'user', content: 'Hello, I need help with my order' }
                ]
            })
        });

        if (llmResponse.ok) {
            const llmResult = await llmResponse.json();
            console.log('✅ LLM generation successful');
            console.log('💬 Response:', llmResult.text?.substring(0, 100) + '...');
        } else {
            const error = await llmResponse.json();
            console.log('❌ LLM generation failed:', error.error);
        }
    } catch (error) {
        console.log('❌ LLM generation error:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 4: Dispatch Outbound Messages
    console.log('4️⃣ Testing Outbound Message Dispatch...');
    try {
        const dispatchResponse = await fetch(`${BASE_URL}/api/internal/dispatch`, {
            method: 'POST',
            headers: {
                'X-ADMIN-KEY': ADMIN_KEY
            }
        });

        if (dispatchResponse.ok) {
            const dispatchResult = await dispatchResponse.json();
            console.log('✅ Dispatch successful');
            console.log('📤 Messages sent:', dispatchResult.sent);
        } else {
            const error = await dispatchResponse.json();
            console.log('❌ Dispatch failed:', error.error);
        }
    } catch (error) {
        console.log('❌ Dispatch error:', error.message);
    }

    console.log('\n🎉 API endpoint testing complete!');
    console.log('\n📝 Next Steps:');
    console.log('1. Replace placeholder tokens with real values');
    console.log('2. Deploy Edge Functions to Supabase');
    console.log('3. Configure cron scheduler for dispatch-outbound');
    console.log('4. Test end-to-end flow with real Telegram bot');
}

// Run the tests
testEndpoints().catch(console.error);
