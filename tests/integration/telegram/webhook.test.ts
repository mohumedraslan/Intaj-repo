/**
 * Integration Tests for Telegram Webhook
 * Tests complete Telegram message processing flow
 */

import request from 'supertest';
import { createServer } from 'http';
import { NextApiHandler } from 'next';
import { setupTestDatabase, cleanupTestDatabase, createTestUser, createTestAgent } from '../../helpers/database';
import { server } from '../../mocks/msw-server';

describe('Telegram Webhook Integration Tests', () => {
  let testUser: any;
  let testAgent: any;
  let telegramBot: any;

  beforeAll(async () => {
    await setupTestDatabase();
    
    // Create test user and agent
    testUser = await createTestUser({
      email: 'test@example.com',
      role: 'user'
    });
    
    testAgent = await createTestAgent({
      name: 'Telegram Test Agent',
      type: 'customer_support',
      base_prompt: 'You are a helpful customer support assistant for Telegram',
      user_id: testUser.id
    });

    // Create telegram bot integration
    telegramBot = await createTelegramBot({
      agent_id: testAgent.id,
      bot_token: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
      bot_username: 'test_bot',
      webhook_url: `https://example.com/api/v1/webhooks/telegram/${testAgent.id}`,
      is_active: true
    });
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('POST /api/v1/webhooks/telegram/:agentId', () => {
    const createTestApp = (handler: NextApiHandler) => {
      const server = createServer((req, res) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          if (body) {
            try {
              (req as any).body = JSON.parse(body);
            } catch {
              (req as any).body = body;
            }
          }
          handler(req as any, res as any);
        });
      });
      return server;
    };

    it('should process valid telegram text message', async () => {
      const telegramUpdate = {
        update_id: 12345,
        message: {
          message_id: 1,
          from: {
            id: 123456789,
            is_bot: false,
            first_name: 'John',
            last_name: 'Doe',
            username: 'johndoe'
          },
          chat: {
            id: 987654321,
            first_name: 'John',
            last_name: 'Doe',
            username: 'johndoe',
            type: 'private'
          },
          date: Math.floor(Date.now() / 1000),
          text: 'Hello, I need help with my order'
        }
      };

      const { default: handler } = await import('@/app/api/v1/webhooks/telegram/[agentId]/route');
      const app = createTestApp(handler);

      const response = await request(app)
        .post(`/api/v1/webhooks/telegram/${testAgent.id}`)
        .set('Content-Type', 'application/json')
        .send(telegramUpdate);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.messageId).toBeDefined();

      // Verify message was stored in database
      const storedMessage = await getMessageById(response.body.messageId);
      expect(storedMessage).toMatchObject({
        agent_id: testAgent.id,
        platform: 'telegram',
        direction: 'inbound',
        content: telegramUpdate.message.text,
        platform_message_id: telegramUpdate.message.message_id.toString(),
        platform_user_id: telegramUpdate.message.from.id.toString()
      });
    });

    it('should handle telegram photo message', async () => {
      const telegramUpdate = {
        update_id: 12346,
        message: {
          message_id: 2,
          from: {
            id: 123456789,
            is_bot: false,
            first_name: 'John',
            username: 'johndoe'
          },
          chat: {
            id: 987654321,
            type: 'private'
          },
          date: Math.floor(Date.now() / 1000),
          photo: [
            {
              file_id: 'AgACAgIAAxkBAAICHmF...',
              file_unique_id: 'AQADr7gxG4K4...',
              width: 320,
              height: 240,
              file_size: 15000
            }
          ],
          caption: 'Here is the product image'
        }
      };

      const { default: handler } = await import('@/app/api/v1/webhooks/telegram/[agentId]/route');
      const app = createTestApp(handler);

      const response = await request(app)
        .post(`/api/v1/webhooks/telegram/${testAgent.id}`)
        .set('Content-Type', 'application/json')
        .send(telegramUpdate);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify photo message was processed
      const storedMessage = await getMessageById(response.body.messageId);
      expect(storedMessage.content).toBe('Here is the product image');
      expect(storedMessage.metadata.photo).toBeDefined();
      expect(storedMessage.metadata.photo.file_id).toBe(telegramUpdate.message.photo[0].file_id);
    });

    it('should handle telegram document message', async () => {
      const telegramUpdate = {
        update_id: 12347,
        message: {
          message_id: 3,
          from: {
            id: 123456789,
            first_name: 'John'
          },
          chat: {
            id: 987654321,
            type: 'private'
          },
          date: Math.floor(Date.now() / 1000),
          document: {
            file_name: 'invoice.pdf',
            mime_type: 'application/pdf',
            file_id: 'BAADBAADrwADBREAAYag2eLPt...',
            file_unique_id: 'AgADrwADBREAAQ',
            file_size: 245760
          },
          caption: 'My invoice document'
        }
      };

      const { default: handler } = await import('@/app/api/v1/webhooks/telegram/[agentId]/route');
      const app = createTestApp(handler);

      const response = await request(app)
        .post(`/api/v1/webhooks/telegram/${testAgent.id}`)
        .set('Content-Type', 'application/json')
        .send(telegramUpdate);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const storedMessage = await getMessageById(response.body.messageId);
      expect(storedMessage.content).toBe('My invoice document');
      expect(storedMessage.metadata.document).toBeDefined();
      expect(storedMessage.metadata.document.file_name).toBe('invoice.pdf');
    });

    it('should create conversation for new user', async () => {
      const newUserUpdate = {
        update_id: 12348,
        message: {
          message_id: 4,
          from: {
            id: 999888777, // New user ID
            first_name: 'Jane',
            username: 'janedoe'
          },
          chat: {
            id: 999888777,
            type: 'private'
          },
          date: Math.floor(Date.now() / 1000),
          text: 'Hi, I\'m a new customer'
        }
      };

      const { default: handler } = await import('@/app/api/v1/webhooks/telegram/[agentId]/route');
      const app = createTestApp(handler);

      const response = await request(app)
        .post(`/api/v1/webhooks/telegram/${testAgent.id}`)
        .set('Content-Type', 'application/json')
        .send(newUserUpdate);

      expect(response.status).toBe(200);

      // Verify conversation was created
      const conversation = await getConversationByPlatformUserId(
        testAgent.id,
        'telegram',
        newUserUpdate.message.from.id.toString()
      );

      expect(conversation).toMatchObject({
        agent_id: testAgent.id,
        platform: 'telegram',
        platform_user_id: newUserUpdate.message.from.id.toString(),
        status: 'active'
      });
    });

    it('should handle callback query (inline button)', async () => {
      const callbackUpdate = {
        update_id: 12349,
        callback_query: {
          id: 'callback_123',
          from: {
            id: 123456789,
            first_name: 'John'
          },
          message: {
            message_id: 5,
            chat: {
              id: 987654321,
              type: 'private'
            },
            date: Math.floor(Date.now() / 1000)
          },
          data: 'button_clicked:help'
        }
      };

      const { default: handler } = await import('@/app/api/v1/webhooks/telegram/[agentId]/route');
      const app = createTestApp(handler);

      const response = await request(app)
        .post(`/api/v1/webhooks/telegram/${testAgent.id}`)
        .set('Content-Type', 'application/json')
        .send(callbackUpdate);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const storedMessage = await getMessageById(response.body.messageId);
      expect(storedMessage.content).toBe('button_clicked:help');
      expect(storedMessage.metadata.callback_query).toBeDefined();
    });

    it('should reject webhook for non-existent agent', async () => {
      const telegramUpdate = {
        update_id: 12350,
        message: {
          message_id: 6,
          from: { id: 123456789, first_name: 'John' },
          chat: { id: 987654321, type: 'private' },
          date: Math.floor(Date.now() / 1000),
          text: 'Hello'
        }
      };

      const { default: handler } = await import('@/app/api/v1/webhooks/telegram/[agentId]/route');
      const app = createTestApp(handler);

      const response = await request(app)
        .post('/api/v1/webhooks/telegram/non-existent-agent-id')
        .set('Content-Type', 'application/json')
        .send(telegramUpdate);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('AGENT_NOT_FOUND');
    });

    it('should handle malformed telegram update', async () => {
      const malformedUpdate = {
        update_id: 12351,
        // Missing required message or callback_query
      };

      const { default: handler } = await import('@/app/api/v1/webhooks/telegram/[agentId]/route');
      const app = createTestApp(handler);

      const response = await request(app)
        .post(`/api/v1/webhooks/telegram/${testAgent.id}`)
        .set('Content-Type', 'application/json')
        .send(malformedUpdate);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_UPDATE');
    });

    it('should handle duplicate message updates', async () => {
      const telegramUpdate = {
        update_id: 12352,
        message: {
          message_id: 7,
          from: { id: 123456789, first_name: 'John' },
          chat: { id: 987654321, type: 'private' },
          date: Math.floor(Date.now() / 1000),
          text: 'Duplicate message test'
        }
      };

      const { default: handler } = await import('@/app/api/v1/webhooks/telegram/[agentId]/route');
      const app = createTestApp(handler);

      // Send same update twice
      const response1 = await request(app)
        .post(`/api/v1/webhooks/telegram/${testAgent.id}`)
        .set('Content-Type', 'application/json')
        .send(telegramUpdate);

      const response2 = await request(app)
        .post(`/api/v1/webhooks/telegram/${testAgent.id}`)
        .set('Content-Type', 'application/json')
        .send(telegramUpdate);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200); // Should handle gracefully
      
      // Should not create duplicate messages
      expect(response1.body.messageId).toBe(response2.body.messageId);
    });

    it('should trigger LLM processing for text messages', async () => {
      const telegramUpdate = {
        update_id: 12353,
        message: {
          message_id: 8,
          from: { id: 123456789, first_name: 'John' },
          chat: { id: 987654321, type: 'private' },
          date: Math.floor(Date.now() / 1000),
          text: 'I need help with my account'
        }
      };

      const { default: handler } = await import('@/app/api/v1/webhooks/telegram/[agentId]/route');
      const app = createTestApp(handler);

      const response = await request(app)
        .post(`/api/v1/webhooks/telegram/${testAgent.id}`)
        .set('Content-Type', 'application/json')
        .send(telegramUpdate);

      expect(response.status).toBe(200);

      // Wait a bit for async processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify that a response message was queued/sent
      const messages = await getMessagesByConversation(
        testAgent.id,
        'telegram',
        telegramUpdate.message.from.id.toString()
      );

      const outboundMessages = messages.filter(m => m.direction === 'outbound');
      expect(outboundMessages.length).toBeGreaterThan(0);
    });

    it('should handle rate limiting for webhook requests', async () => {
      const { default: handler } = await import('@/app/api/v1/webhooks/telegram/[agentId]/route');
      const app = createTestApp(handler);

      // Send many requests rapidly
      const rapidRequests = Array.from({ length: 20 }, (_, i) => 
        request(app)
          .post(`/api/v1/webhooks/telegram/${testAgent.id}`)
          .set('Content-Type', 'application/json')
          .send({
            update_id: 13000 + i,
            message: {
              message_id: 100 + i,
              from: { id: 123456789, first_name: 'John' },
              chat: { id: 987654321, type: 'private' },
              date: Math.floor(Date.now() / 1000),
              text: `Rapid message ${i}`
            }
          })
      );

      const responses = await Promise.all(rapidRequests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should validate telegram bot token', async () => {
      // Create agent with invalid bot token
      const invalidAgent = await createTestAgent({
        name: 'Invalid Bot Agent',
        type: 'customer_support',
        base_prompt: 'Test prompt',
        user_id: testUser.id
      });

      await createTelegramBot({
        agent_id: invalidAgent.id,
        bot_token: 'invalid_token',
        bot_username: 'invalid_bot',
        is_active: true
      });

      const telegramUpdate = {
        update_id: 12354,
        message: {
          message_id: 9,
          from: { id: 123456789, first_name: 'John' },
          chat: { id: 987654321, type: 'private' },
          date: Math.floor(Date.now() / 1000),
          text: 'Test message'
        }
      };

      const { default: handler } = await import('@/app/api/v1/webhooks/telegram/[agentId]/route');
      const app = createTestApp(handler);

      const response = await request(app)
        .post(`/api/v1/webhooks/telegram/${invalidAgent.id}`)
        .set('Content-Type', 'application/json')
        .send(telegramUpdate);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_BOT_TOKEN');
    });
  });
});

// Helper functions for database operations
async function createTelegramBot(data: any) {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: bot, error } = await supabase
    .from('telegram_bots')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return bot;
}

async function getMessageById(messageId: string) {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('id', messageId)
    .single();

  if (error) throw error;
  return data;
}

async function getConversationByPlatformUserId(agentId: string, platform: string, platformUserId: string) {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('agent_id', agentId)
    .eq('platform', platform)
    .eq('platform_user_id', platformUserId)
    .single();

  if (error) throw error;
  return data;
}

async function getMessagesByConversation(agentId: string, platform: string, platformUserId: string) {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const conversation = await getConversationByPlatformUserId(agentId, platform, platformUserId);
  
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversation.id)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}
