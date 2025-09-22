/**
 * Load Testing for Message Processing
 * Tests system performance under realistic traffic patterns
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const messageProcessingRate = new Rate('message_processing_success');
const responseTimeP95 = new Trend('response_time_p95');
const webhookErrors = new Counter('webhook_errors');
const llmLatency = new Trend('llm_response_latency');

// Test configuration
export let options = {
  stages: [
    // Warm up
    { duration: '2m', target: 10 },
    
    // Ramp up to normal load
    { duration: '5m', target: 50 },
    
    // Normal load
    { duration: '10m', target: 50 },
    
    // Peak load
    { duration: '5m', target: 100 },
    
    // Sustained peak
    { duration: '10m', target: 100 },
    
    // Spike test
    { duration: '2m', target: 200 },
    
    // Recovery
    { duration: '5m', target: 50 },
    
    // Cool down
    { duration: '2m', target: 0 },
  ],
  
  thresholds: {
    // 95% of requests should complete within 2 seconds
    'http_req_duration': ['p(95)<2000'],
    
    // Less than 1% error rate
    'http_req_failed': ['rate<0.01'],
    
    // Message processing success rate should be > 99%
    'message_processing_success': ['rate>0.99'],
    
    // LLM response should be under 5 seconds for 95% of requests
    'llm_response_latency': ['p(95)<5000'],
    
    // Webhook error rate should be minimal
    'webhook_errors': ['count<10'],
  },
  
  // Test data
  ext: {
    loadimpact: {
      projectID: 3596726,
      name: 'Intaj Message Processing Load Test'
    }
  }
};

// Test data generators
const generateTelegramUpdate = (messageId, userId, chatId) => ({
  update_id: Math.floor(Math.random() * 1000000) + messageId,
  message: {
    message_id: messageId,
    from: {
      id: userId,
      is_bot: false,
      first_name: `User${userId}`,
      username: `user${userId}`
    },
    chat: {
      id: chatId,
      first_name: `User${userId}`,
      type: 'private'
    },
    date: Math.floor(Date.now() / 1000),
    text: generateRandomMessage()
  }
});

const generateWhatsAppMessage = (messageId, userId) => ({
  object: 'whatsapp_business_account',
  entry: [{
    id: 'whatsapp-business-account-id',
    changes: [{
      value: {
        messaging_product: 'whatsapp',
        metadata: {
          display_phone_number: '+1234567890',
          phone_number_id: 'phone-number-id'
        },
        messages: [{
          id: `wamid.${messageId}`,
          from: userId,
          timestamp: Math.floor(Date.now() / 1000).toString(),
          text: {
            body: generateRandomMessage()
          },
          type: 'text'
        }]
      },
      field: 'messages'
    }]
  }]
});

const messageTemplates = [
  'Hello, I need help with my order',
  'Can you tell me about your services?',
  'I have a question about billing',
  'How do I reset my password?',
  'What are your business hours?',
  'I want to cancel my subscription',
  'Can you help me with technical support?',
  'I need information about pricing',
  'How do I contact customer service?',
  'Is there a mobile app available?',
  'What payment methods do you accept?',
  'I\'m having trouble logging in',
  'Can you explain your refund policy?',
  'How long does shipping take?',
  'Do you offer discounts for students?'
];

function generateRandomMessage() {
  const template = messageTemplates[Math.floor(Math.random() * messageTemplates.length)];
  const variations = [
    template,
    template + '?',
    template + '. Please help.',
    template + ' Thanks!',
    'Hi, ' + template.toLowerCase(),
    template + ' Can you assist me?'
  ];
  return variations[Math.floor(Math.random() * variations.length)];
}

// Test scenarios
export default function() {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  const agentId = __ENV.AGENT_ID || 'test-agent-id';
  
  // Generate unique user identifiers for this VU
  const vuId = __VU;
  const iterationId = __ITER;
  const userId = 1000000 + (vuId * 1000) + iterationId;
  const chatId = 2000000 + (vuId * 1000) + iterationId;
  const messageId = 3000000 + (vuId * 10000) + iterationId;

  group('Message Processing Flow', function() {
    // Test Telegram webhook processing
    group('Telegram Webhook', function() {
      const telegramPayload = generateTelegramUpdate(messageId, userId, chatId);
      
      const telegramResponse = http.post(
        `${baseUrl}/api/v1/webhooks/telegram/${agentId}`,
        JSON.stringify(telegramPayload),
        {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'TelegramBot/1.0'
          },
          timeout: '10s'
        }
      );

      check(telegramResponse, {
        'telegram webhook status is 200': (r) => r.status === 200,
        'telegram response time < 1s': (r) => r.timings.duration < 1000,
        'telegram response has success': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.success === true;
          } catch {
            return false;
          }
        }
      });

      if (telegramResponse.status !== 200) {
        webhookErrors.add(1);
      } else {
        messageProcessingRate.add(1);
      }

      responseTimeP95.add(telegramResponse.timings.duration);
    });

    // Test WhatsApp webhook processing
    group('WhatsApp Webhook', function() {
      const whatsappPayload = generateWhatsAppMessage(messageId + 1, userId.toString());
      
      const whatsappResponse = http.post(
        `${baseUrl}/api/v1/webhooks/whatsapp/${agentId}`,
        JSON.stringify(whatsappPayload),
        {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'WhatsApp/1.0'
          },
          timeout: '10s'
        }
      );

      check(whatsappResponse, {
        'whatsapp webhook status is 200': (r) => r.status === 200,
        'whatsapp response time < 1s': (r) => r.timings.duration < 1000,
        'whatsapp response has success': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.success === true;
          } catch {
            return false;
          }
        }
      });

      if (whatsappResponse.status !== 200) {
        webhookErrors.add(1);
      } else {
        messageProcessingRate.add(1);
      }
    });

    // Test direct LLM API
    group('LLM API', function() {
      const llmPayload = {
        messages: [
          {
            role: 'user',
            content: generateRandomMessage()
          }
        ],
        agentId: agentId,
        platform: 'api',
        userId: userId.toString()
      };

      const llmStartTime = Date.now();
      const llmResponse = http.post(
        `${baseUrl}/api/internal/llm-generate`,
        JSON.stringify(llmPayload),
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${__ENV.API_TOKEN || 'test-token'}`
          },
          timeout: '30s'
        }
      );

      const llmDuration = Date.now() - llmStartTime;
      llmLatency.add(llmDuration);

      check(llmResponse, {
        'llm api status is 200': (r) => r.status === 200,
        'llm response time < 10s': (r) => r.timings.duration < 10000,
        'llm response has content': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.data && body.data.response && body.data.response.length > 0;
          } catch {
            return false;
          }
        }
      });
    });
  });

  // Simulate realistic user behavior with pauses
  const thinkTime = Math.random() * 3 + 1; // 1-4 seconds
  sleep(thinkTime);
}

// Spike test scenario
export function spikeTest() {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  const agentId = __ENV.AGENT_ID || 'test-agent-id';
  
  // Generate many rapid requests to simulate viral content or system stress
  for (let i = 0; i < 5; i++) {
    const userId = Math.floor(Math.random() * 1000000);
    const messageId = Math.floor(Math.random() * 10000000);
    
    const payload = generateTelegramUpdate(messageId, userId, userId);
    
    const response = http.post(
      `${baseUrl}/api/v1/webhooks/telegram/${agentId}`,
      JSON.stringify(payload),
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: '5s'
      }
    );

    check(response, {
      'spike test response ok': (r) => r.status === 200 || r.status === 429 // Allow rate limiting
    });

    sleep(0.1); // Very short pause between requests
  }
}

// Stress test scenario
export function stressTest() {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  const agentId = __ENV.AGENT_ID || 'test-agent-id';
  
  // Test with malformed payloads and edge cases
  const edgeCases = [
    // Empty message
    {
      update_id: 1,
      message: {
        message_id: 1,
        from: { id: 123, first_name: 'Test' },
        chat: { id: 123, type: 'private' },
        date: Math.floor(Date.now() / 1000),
        text: ''
      }
    },
    
    // Very long message
    {
      update_id: 2,
      message: {
        message_id: 2,
        from: { id: 124, first_name: 'Test' },
        chat: { id: 124, type: 'private' },
        date: Math.floor(Date.now() / 1000),
        text: 'A'.repeat(4000)
      }
    },
    
    // Special characters
    {
      update_id: 3,
      message: {
        message_id: 3,
        from: { id: 125, first_name: 'Test' },
        chat: { id: 125, type: 'private' },
        date: Math.floor(Date.now() / 1000),
        text: '🚀💻🔥 Special chars: <script>alert("xss")</script> & SQL\'; DROP TABLE users; --'
      }
    }
  ];

  edgeCases.forEach((payload, index) => {
    const response = http.post(
      `${baseUrl}/api/v1/webhooks/telegram/${agentId}`,
      JSON.stringify(payload),
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: '10s'
      }
    );

    check(response, {
      [`edge case ${index + 1} handled`]: (r) => r.status >= 200 && r.status < 500
    });
  });
}

// Setup and teardown
export function setup() {
  console.log('Starting load test setup...');
  
  // Verify test environment is accessible
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  const healthResponse = http.get(`${baseUrl}/api/v1/health`);
  
  if (healthResponse.status !== 200) {
    throw new Error(`Health check failed: ${healthResponse.status}`);
  }
  
  console.log('Load test setup complete');
  return { baseUrl };
}

export function teardown(data) {
  console.log('Load test completed');
  console.log(`Base URL: ${data.baseUrl}`);
}
