/**
 * Telegram Integration API v1 - POST /api/v1/integrations/telegram
 * Setup Telegram bot integration with standardized middleware
 */

import { NextRequest } from 'next/server';
import { ApiMiddleware, ApiContext } from '@/middleware/apiMiddleware';
import { ApiResponses } from '@/lib/apiResponse';
import { ErrorFactory, ExternalServiceError } from '@/lib/errors';
import { TelegramSetupSchema } from '@/schemas/integration';
import { PERMISSIONS } from '@/middleware/auth';
import { RateLimiters } from '@/lib/rateLimiterV2';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Initialize Supabase client
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Telegram Bot API interface
interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
  can_join_groups: boolean;
  can_read_all_group_messages: boolean;
  supports_inline_queries: boolean;
}

interface TelegramWebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  last_error_date?: number;
  last_error_message?: string;
}

/**
 * POST /api/v1/integrations/telegram
 * Setup Telegram bot integration
 */
export const POST = ApiMiddleware.authenticated(
  async (context: ApiContext) => {
    const { user, correlationId, data } = context;
    
    try {
      // Apply rate limiting for integration setup
      await RateLimiters.integrationSetup(user!.id, correlationId);

      const setupData = data.body;
      const {
        agent_id,
        bot_token,
        auto_set_webhook = true,
        webhook_url,
        allowed_updates = ['message', 'callback_query'],
        commands = [],
        settings = {}
      } = setupData;

      // Verify agent exists and belongs to user
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('id, name, user_id')
        .eq('id', agent_id)
        .eq('user_id', user!.id)
        .single();

      if (agentError) {
        if (agentError.code === 'PGRST116') {
          throw ErrorFactory.notFound('Agent', correlationId);
        }
        throw ErrorFactory.database(`Failed to verify agent: ${agentError.message}`, correlationId);
      }

      // Check if integration already exists for this agent
      const { data: existingIntegration, error: checkError } = await supabase
        .from('connections')
        .select('id, status')
        .eq('agent_id', agent_id)
        .eq('platform', 'telegram')
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw ErrorFactory.database(`Failed to check existing integration: ${checkError.message}`, correlationId);
      }

      if (existingIntegration) {
        throw ErrorFactory.conflict(
          'Telegram integration already exists for this agent',
          correlationId
        );
      }

      // Determine bot token to use
      let actualBotToken: string;
      let botTokenSource: 'platform' | 'custom';

      if (bot_token === 'use_platform_token') {
        // Use platform token (from environment or database)
        actualBotToken = process.env.TELEGRAM_BOT_TOKEN || '';
        botTokenSource = 'platform';
        
        if (!actualBotToken) {
          throw ErrorFactory.businessLogic(
            'Platform Telegram bot token not configured',
            { suggestion: 'Please provide your own bot token or contact support' },
            correlationId
          );
        }
      } else {
        // Use customer-provided token
        actualBotToken = bot_token;
        botTokenSource = 'custom';
      }

      // Validate bot token with Telegram API
      const botInfo = await validateTelegramBot(actualBotToken, correlationId);

      // Set up webhook if requested
      let webhookInfo: TelegramWebhookInfo | null = null;
      if (auto_set_webhook) {
        const webhookEndpoint = webhook_url || 
          `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/webhooks/telegram/${agent_id}`;
        
        webhookInfo = await setupTelegramWebhook(
          actualBotToken,
          webhookEndpoint,
          allowed_updates,
          correlationId
        );
      }

      // Set up bot commands if provided
      if (commands.length > 0) {
        await setupTelegramCommands(actualBotToken, commands, correlationId);
      }

      // Create integration record in database
      const integrationData = {
        agent_id,
        platform: 'telegram' as const,
        name: `Telegram Bot - ${botInfo.username}`,
        status: 'active' as const,
        credentials: {
          bot_token: botTokenSource === 'platform' ? null : actualBotToken, // Don't store platform tokens
          bot_token_source: botTokenSource,
          bot_id: botInfo.id,
          bot_username: botInfo.username
        },
        settings: {
          ...settings,
          webhook_url: webhookInfo?.url,
          allowed_updates,
          commands,
          bot_info: botInfo
        },
        user_id: user!.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: newIntegration, error: createError } = await supabase
        .from('connections')
        .insert(integrationData)
        .select()
        .single();

      if (createError) {
        throw ErrorFactory.database(`Failed to create integration: ${createError.message}`, correlationId);
      }

      // Log integration creation
      console.log('Telegram integration created:', {
        correlationId,
        integrationId: newIntegration.id,
        agentId: agent_id,
        userId: user!.id,
        botUsername: botInfo.username,
        botTokenSource,
        webhookSet: auto_set_webhook
      });

      // Return integration details (without sensitive data)
      const responseData = {
        ...newIntegration,
        credentials: {
          bot_token_source: botTokenSource,
          bot_username: botInfo.username,
          bot_id: botInfo.id
        }
      };

      return ApiResponses.created(responseData, correlationId);

    } catch (error) {
      console.error('POST /api/v1/integrations/telegram error:', error);
      throw error;
    }
  },
  {
    auth: {
      required: true,
      requiredPermissions: [PERMISSIONS.INTEGRATION_CREATE]
    },
    validation: {
      body: TelegramSetupSchema
    },
    rateLimit: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 20,
      keyGenerator: (userId: string) => `telegram:setup:${userId}`
    },
    logging: {
      enabled: true,
      logBody: true,
      logResponse: true
    }
  }
);

/**
 * Validate Telegram bot token and get bot info
 */
async function validateTelegramBot(
  botToken: string,
  correlationId: string
): Promise<TelegramBotInfo> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ExternalServiceError(
        'Telegram',
        `Bot validation failed: ${errorData.description || 'Invalid bot token'}`,
        correlationId
      );
    }

    const data = await response.json();
    
    if (!data.ok) {
      throw new ExternalServiceError(
        'Telegram',
        `Bot validation failed: ${data.description}`,
        correlationId
      );
    }

    return data.result;

  } catch (error) {
    if (error instanceof ExternalServiceError) {
      throw error;
    }
    throw new ExternalServiceError(
      'Telegram',
      'Failed to validate bot token',
      correlationId
    );
  }
}

/**
 * Setup Telegram webhook
 */
async function setupTelegramWebhook(
  botToken: string,
  webhookUrl: string,
  allowedUpdates: string[],
  correlationId: string
): Promise<TelegramWebhookInfo> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: allowedUpdates,
        drop_pending_updates: true
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ExternalServiceError(
        'Telegram',
        `Webhook setup failed: ${errorData.description || 'Unknown error'}`,
        correlationId
      );
    }

    const data = await response.json();
    
    if (!data.ok) {
      throw new ExternalServiceError(
        'Telegram',
        `Webhook setup failed: ${data.description}`,
        correlationId
      );
    }

    // Get webhook info to confirm setup
    const infoResponse = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
    const infoData = await infoResponse.json();
    
    return infoData.result;

  } catch (error) {
    if (error instanceof ExternalServiceError) {
      throw error;
    }
    throw new ExternalServiceError(
      'Telegram',
      'Failed to setup webhook',
      correlationId
    );
  }
}

/**
 * Setup Telegram bot commands
 */
async function setupTelegramCommands(
  botToken: string,
  commands: Array<{ command: string; description: string }>,
  correlationId: string
): Promise<void> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ commands })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ExternalServiceError(
        'Telegram',
        `Commands setup failed: ${errorData.description || 'Unknown error'}`,
        correlationId
      );
    }

    const data = await response.json();
    
    if (!data.ok) {
      throw new ExternalServiceError(
        'Telegram',
        `Commands setup failed: ${data.description}`,
        correlationId
      );
    }

  } catch (error) {
    if (error instanceof ExternalServiceError) {
      throw error;
    }
    throw new ExternalServiceError(
      'Telegram',
      'Failed to setup commands',
      correlationId
    );
  }
}

/**
 * OpenAPI documentation
 */
export const metadata = {
  openapi: '3.0.0',
  paths: {
    '/api/v1/integrations/telegram': {
      post: {
        summary: 'Setup Telegram integration',
        description: 'Create a new Telegram bot integration for an agent',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TelegramSetup' }
            }
          }
        },
        responses: {
          201: {
            description: 'Telegram integration created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Integration' }
                  }
                }
              }
            }
          },
          409: {
            description: 'Integration already exists for this agent'
          }
        }
      }
    }
  }
};
