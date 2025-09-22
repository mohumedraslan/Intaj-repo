/**
 * WhatsApp Webhook Endpoint v1 - GET/POST /api/v1/webhooks/whatsapp/[agentId]
 * Handles WhatsApp Business API webhook with verification and message processing
 */

import { NextRequest } from 'next/server';
import { ApiMiddleware, ApiContext } from '@/middleware/apiMiddleware';
import { ApiResponses } from '@/lib/apiResponse';
import { ErrorFactory } from '@/lib/errors';
import { getIntegrationGateway } from '@/services/integrationGateway';
import { getRateLimiter } from '@/lib/rateLimiterV2';
import { Redis } from 'ioredis';

// Initialize Redis for idempotency
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

/**
 * GET /api/v1/webhooks/whatsapp/[agentId]
 * WhatsApp webhook verification endpoint
 */
export const GET = ApiMiddleware.public(
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
      
      // Get query parameters for webhook verification
      const searchParams = url.searchParams;
      const mode = searchParams.get('hub.mode');
      const token = searchParams.get('hub.verify_token');
      const challenge = searchParams.get('hub.challenge');
      
      // Handle webhook verification
      if (mode === 'subscribe') {
        // Get the expected verify token from environment or database
        const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'default_verify_token';
        
        if (token === expectedToken) {
          console.log('WhatsApp webhook verification successful:', {
            correlationId,
            agentId,
            mode,
            challenge
          });
          
          // Return the challenge as plain text (WhatsApp requirement)
          return new Response(challenge, {
            status: 200,
            headers: {
              'Content-Type': 'text/plain',
              'X-Correlation-ID': correlationId
            }
          });
        } else {
          console.error('WhatsApp webhook verification failed - invalid token:', {
            correlationId,
            agentId,
            providedToken: token ? '[REDACTED]' : null,
            expectedToken: expectedToken ? '[REDACTED]' : null
          });
          
          return new Response('Forbidden', { status: 403 });
        }
      }
      
      // If not verification, return webhook info
      return ApiResponses.success({
        status: 'healthy',
        platform: 'whatsapp',
        agentId,
        timestamp: new Date().toISOString()
      }, correlationId);
      
    } catch (error) {
      console.error('WhatsApp webhook verification failed:', {
        correlationId,
        error: error instanceof Error ? error.message : String(error),
        url: req.url
      });
      
      return new Response('Internal Server Error', { status: 500 });
    }
  },
  {
    rateLimit: {
      windowMs: 60 * 1000,
      maxRequests: 100,
      keyGenerator: (id: string) => `webhook:verify:whatsapp:${id}`
    }
  }
);

/**
 * POST /api/v1/webhooks/whatsapp/[agentId]
 * Process WhatsApp webhook updates
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
      
      // Validate WhatsApp webhook structure
      if (!payload.object || payload.object !== 'whatsapp_business_account') {
        throw ErrorFactory.businessLogic(
          'Invalid WhatsApp webhook: incorrect object type',
          { object: payload.object },
          correlationId
        );
      }
      
      if (!payload.entry || !Array.isArray(payload.entry)) {
        throw ErrorFactory.businessLogic(
          'Invalid WhatsApp webhook: missing or invalid entry array',
          { hasEntry: !!payload.entry, isArray: Array.isArray(payload.entry) },
          correlationId
        );
      }
      
      // Check if there are any messages to process
      const hasMessages = payload.entry.some((entry: any) => 
        entry.changes?.some((change: any) => 
          change.value?.messages && change.value.messages.length > 0
        )
      );
      
      if (!hasMessages) {
        // This might be a status update or other notification
        console.log('WhatsApp webhook received without messages:', {
          correlationId,
          agentId,
          entryCount: payload.entry.length,
          payload: JSON.stringify(payload, null, 2)
        });
        
        return ApiResponses.success({
          received: true,
          processed: false,
          reason: 'No messages to process'
        }, correlationId);
      }
      
      // Extract message ID for idempotency
      const firstMessage = payload.entry
        .flatMap((entry: any) => entry.changes || [])
        .flatMap((change: any) => change.value?.messages || [])
        .find((msg: any) => msg.id);
      
      if (!firstMessage) {
        throw ErrorFactory.businessLogic(
          'No valid message found in webhook',
          { entryCount: payload.entry.length },
          correlationId
        );
      }
      
      // Implement idempotency using Redis
      const idempotencyKey = `whatsapp:webhook:${agentId}:${firstMessage.id}`;
      const existingResult = await redis.get(idempotencyKey);
      
      if (existingResult) {
        console.log('Idempotent WhatsApp webhook request detected:', {
          correlationId,
          agentId,
          messageId: firstMessage.id,
          existingResult: JSON.parse(existingResult)
        });
        
        const result = JSON.parse(existingResult);
        return ApiResponses.success(result, correlationId);
      }
      
      // Apply rate limiting per agent
      const rateLimiter = getRateLimiter();
      await rateLimiter.enforceRateLimit(
        `whatsapp:webhook:${agentId}`,
        {
          windowMs: 60 * 1000, // 1 minute
          maxRequests: 1000, // 1000 webhooks per minute per agent
          keyGenerator: (id: string) => `webhook:whatsapp:${id}`
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
        'whatsapp',
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
            'WhatsApp',
            result.error || 'Webhook processing failed',
            correlationId
          );
        } else {
          throw ErrorFactory.businessLogic(
            result.error || 'Webhook processing failed',
            { agentId, messageId: firstMessage.id },
            correlationId
          );
        }
      }
      
      // Store successful result in cache for idempotency
      await redis.setex(idempotencyKey, 3600, JSON.stringify(result)); // 1 hour
      
      // Log successful webhook processing
      console.log('WhatsApp webhook processed successfully:', {
        correlationId,
        agentId,
        messageId: result.messageId,
        jobId: result.jobId,
        whatsappMessageId: firstMessage.id
      });
      
      // Return 200 OK to WhatsApp
      return ApiResponses.success({
        received: true,
        processed: true,
        messageId: result.messageId,
        jobId: result.jobId
      }, correlationId);
      
    } catch (error) {
      console.error('WhatsApp webhook processing failed:', {
        correlationId,
        error: error instanceof Error ? error.message : String(error),
        url: req.url
      });
      
      // For webhook endpoints, we should return 200 OK even on errors
      // to prevent WhatsApp from retrying indefinitely
      if (error instanceof Error && error.message.includes('rate limit')) {
        // Return 429 for rate limiting so WhatsApp backs off
        return new Response('Rate limit exceeded', { status: 429 });
      }
      
      // Return 200 OK for other errors to prevent retries
      return ApiResponses.success({
        received: true,
        processed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, correlationId);
    }
  },
  {
    rateLimit: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 10000, // 10k webhooks per minute globally
      keyGenerator: (id: string) => `webhook:whatsapp:global:${id}`
    },
    logging: {
      enabled: true,
      logBody: false, // Don't log webhook payloads (can be large)
      logResponse: false
    }
  }
);

/**
 * OpenAPI documentation
 */
export const metadata = {
  openapi: '3.0.0',
  paths: {
    '/api/v1/webhooks/whatsapp/{agentId}': {
      get: {
        summary: 'WhatsApp webhook verification',
        description: 'Verify WhatsApp webhook subscription',
        parameters: [
          {
            name: 'agentId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Agent ID for the WhatsApp integration'
          },
          {
            name: 'hub.mode',
            in: 'query',
            schema: { type: 'string' },
            description: 'Webhook verification mode'
          },
          {
            name: 'hub.verify_token',
            in: 'query',
            schema: { type: 'string' },
            description: 'Webhook verification token'
          },
          {
            name: 'hub.challenge',
            in: 'query',
            schema: { type: 'string' },
            description: 'Webhook verification challenge'
          }
        ],
        responses: {
          200: {
            description: 'Webhook verification successful',
            content: {
              'text/plain': {
                schema: { type: 'string' }
              }
            }
          },
          403: {
            description: 'Webhook verification failed'
          }
        },
        'x-webhook-verification': true
      },
      post: {
        summary: 'Process WhatsApp webhook',
        description: 'Receive and process WhatsApp Business API updates',
        parameters: [
          {
            name: 'agentId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Agent ID for the WhatsApp integration'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  object: { type: 'string', enum: ['whatsapp_business_account'] },
                  entry: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        changes: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              value: {
                                type: 'object',
                                properties: {
                                  messaging_product: { type: 'string' },
                                  messages: { type: 'array' },
                                  statuses: { type: 'array' }
                                }
                              },
                              field: { type: 'string' }
                            }
                          }
                        }
                      }
                    }
                  }
                },
                required: ['object', 'entry']
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
                        received: { type: 'boolean' },
                        processed: { type: 'boolean' },
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
      }
    }
  }
};
