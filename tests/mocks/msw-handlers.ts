/**
 * MSW Request Handlers
 * Mock API responses for external services
 */

import { rest } from 'msw';

export const handlers = [
  // Telegram Bot API
  rest.post('https://api.telegram.org/bot*/setWebhook', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        ok: true,
        result: true,
        description: 'Webhook was set'
      })
    );
  }),

  rest.post('https://api.telegram.org/bot*/sendMessage', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        ok: true,
        result: {
          message_id: Math.floor(Math.random() * 10000),
          from: {
            id: 123456789,
            is_bot: true,
            first_name: 'Test Bot',
            username: 'testbot'
          },
          chat: {
            id: 987654321,
            first_name: 'Test User',
            type: 'private'
          },
          date: Math.floor(Date.now() / 1000),
          text: 'Mock response message'
        }
      })
    );
  }),

  rest.get('https://api.telegram.org/bot*/getMe', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        ok: true,
        result: {
          id: 123456789,
          is_bot: true,
          first_name: 'Test Bot',
          username: 'testbot',
          can_join_groups: true,
          can_read_all_group_messages: false,
          supports_inline_queries: false
        }
      })
    );
  }),

  // OpenRouter API
  rest.post('https://openrouter.ai/api/v1/chat/completions', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        id: 'chatcmpl-mock',
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: 'openai/gpt-4o',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'This is a mock response from the LLM provider.'
            },
            finish_reason: 'stop'
          }
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 15,
          total_tokens: 25
        }
      })
    );
  }),

  // OpenAI API (fallback)
  rest.post('https://api.openai.com/v1/chat/completions', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        id: 'chatcmpl-mock-openai',
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: 'gpt-4o',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Mock OpenAI response'
            },
            finish_reason: 'stop'
          }
        ],
        usage: {
          prompt_tokens: 8,
          completion_tokens: 12,
          total_tokens: 20
        }
      })
    );
  }),

  // Anthropic API
  rest.post('https://api.anthropic.com/v1/messages', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        id: 'msg_mock',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'Mock Anthropic response'
          }
        ],
        model: 'claude-3-sonnet-20240229',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: 10,
          output_tokens: 15
        }
      })
    );
  }),

  // WhatsApp Business API
  rest.post('https://graph.facebook.com/v18.0/*/messages', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        messaging_product: 'whatsapp',
        contacts: [
          {
            input: '+1234567890',
            wa_id: '1234567890'
          }
        ],
        messages: [
          {
            id: 'wamid.mock_message_id'
          }
        ]
      })
    );
  }),

  // Qdrant Vector Database
  rest.post('http://localhost:6333/collections/*/points/search', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        result: [
          {
            id: 'mock-vector-1',
            version: 1,
            score: 0.95,
            payload: {
              content: 'Mock vector search result',
              metadata: {
                source: 'test-document',
                chunk_index: 0
              }
            }
          }
        ],
        status: 'ok',
        time: 0.001
      })
    );
  }),

  rest.put('http://localhost:6333/collections/*/points', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        result: {
          operation_id: 'mock-operation-id',
          status: 'acknowledged'
        },
        status: 'ok',
        time: 0.002
      })
    );
  }),

  // Supabase Edge Functions
  rest.post('https://*/functions/v1/process-inbound', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        messageId: 'mock-message-id'
      })
    );
  }),

  rest.post('https://*/functions/v1/dispatch-outbound', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        dispatchedCount: 1
      })
    );
  }),

  // Sentry Error Tracking
  rest.post('https://sentry.io/api/*/store/', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        id: 'mock-sentry-event-id'
      })
    );
  }),

  // Generic error handler for unhandled requests
  rest.all('*', (req, res, ctx) => {
    console.warn(`Unhandled ${req.method} request to ${req.url}`);
    return res(
      ctx.status(404),
      ctx.json({
        error: 'Not found',
        message: `No handler found for ${req.method} ${req.url}`
      })
    );
  })
];

// Helper functions for dynamic handlers
export const createSuccessHandler = (url: string, response: any) => {
  return rest.all(url, (req, res, ctx) => {
    return res(ctx.status(200), ctx.json(response));
  });
};

export const createErrorHandler = (url: string, status: number, error: any) => {
  return rest.all(url, (req, res, ctx) => {
    return res(ctx.status(status), ctx.json(error));
  });
};

// Test-specific handlers that can be added dynamically
export const testHandlers = {
  telegramError: rest.post('https://api.telegram.org/bot*/sendMessage', (req, res, ctx) => {
    return res(
      ctx.status(400),
      ctx.json({
        ok: false,
        error_code: 400,
        description: 'Bad Request: chat not found'
      })
    );
  }),

  llmError: rest.post('https://openrouter.ai/api/v1/chat/completions', (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({
        error: {
          message: 'Internal server error',
          type: 'server_error',
          code: 'internal_error'
        }
      })
    );
  }),

  rateLimitError: rest.post('https://openrouter.ai/api/v1/chat/completions', (req, res, ctx) => {
    return res(
      ctx.status(429),
      ctx.json({
        error: {
          message: 'Rate limit exceeded',
          type: 'rate_limit_error',
          code: 'rate_limit_exceeded'
        }
      }),
      ctx.set('Retry-After', '60')
    );
  })
};
