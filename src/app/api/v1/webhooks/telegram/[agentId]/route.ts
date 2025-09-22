/**
 * Telegram Webhook Endpoint v1 - POST /api/v1/webhooks/telegram/[agentId]
 * Handles Telegram webhook with idempotency, validation, and proper error handling
 */

import { NextRequest } from 'next/server';
import { ApiMiddleware, ApiContext } from '@/middleware/apiMiddleware';
import { ApiResponses, getCorrelationId } from '@/lib/apiResponse';
import { ErrorFactory } from '@/lib/errors';
import { getIntegrationGateway } from '@/services/integrationGateway';
import { getRateLimiter } from '@/lib/rateLimiterV2';
import { Redis } from 'ioredis';

// Initialize Redis for idempotency
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

/**
 * POST /api/v1/webhooks/telegram/[agentId]
 * Process Telegram webhook updates
 */
export const POST = ApiMiddleware.webhook(
  async (context: ApiContext) => {
    const { req, correlationId } = context;
    
    try {
      // Extract agent ID from URL
      const url = new URL(req.url);
      const pathSegments = url.pathname.split('/');
      const agentId = pathSegments[pathSegments.length - 1];
      
      // Validate agent ID format
      if (!agentId || !agentId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        throw ErrorFactory.validation(
          new Error('Invalid agent ID format') as any,
          correlationId
        );
      }
      
      // Get webhook payload
      const payload = await req.json();
      
      // Validate Telegram webhook structure
      if (!payload.update_id) {
        throw ErrorFactory.businessLogic(
          'Invalid Telegram webhook: missing update_id',
          { payload: Object.keys(payload) },
          correlationId
        );
      }
      
      // Implement idempotency using Redis
      const idempotencyKey = `telegram:webhook:${agentId}:${payload.update_id}`;
      const existingResult = await redis.get(idempotencyKey);
      
      if (existingResult) {
        console.log('Idempotent webhook request detected:', {
          correlationId,
          agentId,
          updateId: payload.update_id,
          existingResult: JSON.parse(existingResult)
        });
        
        const result = JSON.parse(existingResult);
        return ApiResponses.success(result, correlationId);
      }
      
      // Apply rate limiting per agent
      const rateLimiter = getRateLimiter();
      await rateLimiter.enforceRateLimit(
        `telegram:webhook:${agentId}`,
        {
          windowMs: 60 * 1000, // 1 minute
          maxRequests: 1000, // 1000 webhooks per minute per agent
          keyGenerator: (id: string) => `webhook:telegram:${id}`
        },
        correlationId
      );
      
      // Get request headers
      const headers: Record<string, string> = {};
      req.headers.forEach((value, key) => {
        headers[key] = value;
      });
      
      // Process webhook through integration gateway
      const integrationGateway = getIntegrationGateway();
      const result = await integrationGateway.processWebhook(
        'telegram',
        agentId,
        payload,
        headers,
        correlationId
      );
      
      if (!result.success) {
        // Store failed result in cache for idempotency
        await redis.setex(idempotencyKey, 300, JSON.stringify(result)); // 5 minutes
        
        if (result.shouldRetry) {
          throw ErrorFactory.externalService(
            'Telegram',
            result.error || 'Webhook processing failed',
            correlationId
          );
        } else {
          throw ErrorFactory.businessLogic(
            result.error || 'Webhook processing failed',
            { agentId, updateId: payload.update_id },
            correlationId
          );
        }
      }
      
      // Store successful result in cache for idempotency
      await redis.setex(idempotencyKey, 3600, JSON.stringify(result)); // 1 hour
      
      // Log successful webhook processing
      console.log('Telegram webhook processed successfully:', {
        correlationId,
        agentId,
        updateId: payload.update_id,
        messageId: result.messageId,
        jobId: result.jobId
      });
      
      // Return 200 OK to Telegram (they expect this)
      return ApiResponses.success({
        ok: true,
        messageId: result.messageId,
        jobId: result.jobId
      }, correlationId);
      
    } catch (error) {
      console.error('Telegram webhook processing failed:', {
        correlationId,
        error: error instanceof Error ? error.message : String(error),
        url: req.url
      });
      
      // For webhook endpoints, we should return 200 OK even on errors
      // to prevent Telegram from retrying indefinitely
      if (error instanceof Error && error.message.includes('rate limit')) {
        // Return 429 for rate limiting so Telegram backs off
        return new Response('Rate limit exceeded', { status: 429 });
      }
      
      // Return 200 OK for other errors to prevent retries
      return ApiResponses.success({
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, correlationId);
    }
  },
  {
    rateLimit: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 10000, // 10k webhooks per minute globally
      keyGenerator: (id: string) => `webhook:telegram:global:${id}`
    },
    logging: {
      enabled: true,
      logBody: false, // Don't log webhook payloads (can be large)
      logResponse: false
    }
  }
);

/**
 * GET /api/v1/webhooks/telegram/[agentId]
 * Health check endpoint for webhook
 */
export const GET = ApiMiddleware.public(
  async (context: ApiContext) => {
    const { req, correlationId } = context;
    
    // Extract agent ID from URL
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/');
    const agentId = pathSegments[pathSegments.length - 1];
    
    // Basic validation
    if (!agentId || !agentId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      throw ErrorFactory.validation(
        new Error('Invalid agent ID format') as any,
        correlationId
      );
    }
    
    return ApiResponses.success({
      status: 'healthy',
      platform: 'telegram',
      agentId,
      timestamp: new Date().toISOString()
    }, correlationId);
  },
  {
    rateLimit: {
      windowMs: 60 * 1000,
      maxRequests: 100,
      keyGenerator: (id: string) => `webhook:health:telegram:${id}`
    }
  }
);

/**
 * OpenAPI documentation
 */
export const metadata = {
  openapi: '3.0.0',
  paths: {
    '/api/v1/webhooks/telegram/{agentId}': {
      post: {
        summary: 'Process Telegram webhook',
        description: 'Receive and process Telegram bot updates',
        parameters: [
          {
            name: 'agentId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Agent ID for the Telegram integration'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  update_id: { type: 'integer' },
                  message: { type: 'object' },
                  edited_message: { type: 'object' },
                  callback_query: { type: 'object' }
                },
                required: ['update_id']
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Webhook processed successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        ok: { type: 'boolean' },
                        messageId: { type: 'string' },
                        jobId: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          },
          429: {
            description: 'Rate limit exceeded'
          }
        },
        'x-webhook': true,
        'x-idempotent': true
      },
      get: {
        summary: 'Webhook health check',
        description: 'Check if the webhook endpoint is healthy',
        parameters: [
          {
            name: 'agentId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        responses: {
          200: {
            description: 'Webhook is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        status: { type: 'string' },
                        platform: { type: 'string' },
                        agentId: { type: 'string' },
                        timestamp: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};
