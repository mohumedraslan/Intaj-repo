/**
 * Zod validation schemas for integration-related API endpoints
 */

import { z } from 'zod';

// Platform types
export const IntegrationPlatformSchema = z.enum([
  'telegram',
  'whatsapp',
  'discord',
  'slack',
  'website',
  'facebook',
  'instagram',
  'twitter'
]);

// Base integration schema
export const BaseIntegrationSchema = z.object({
  agent_id: z.string().uuid('Invalid agent ID'),
  platform: IntegrationPlatformSchema,
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  is_active: z.boolean().default(true),
  settings: z.record(z.any()).default({})
});

// Telegram integration schemas
export const TelegramSetupSchema = z.object({
  agent_id: z.string().uuid('Invalid agent ID'),
  bot_token: z.string()
    .regex(/^\d+:[A-Za-z0-9_-]{35}$/, 'Invalid Telegram bot token format')
    .or(z.literal('use_platform_token')),
  bot_username: z.string().min(5).max(32).optional(),
  auto_set_webhook: z.boolean().default(true),
  webhook_url: z.string().url().optional(),
  allowed_updates: z.array(z.enum([
    'message',
    'edited_message', 
    'channel_post',
    'edited_channel_post',
    'inline_query',
    'chosen_inline_result',
    'callback_query'
  ])).default(['message', 'callback_query']),
  commands: z.array(z.object({
    command: z.string().regex(/^[a-z0-9_]{1,32}$/, 'Invalid command format'),
    description: z.string().max(256)
  })).max(100).default([]),
  settings: z.object({
    welcome_message: z.string().max(4096).optional(),
    help_message: z.string().max(4096).optional(),
    error_message: z.string().max(4096).optional(),
    typing_indicator: z.boolean().default(true),
    parse_mode: z.enum(['HTML', 'Markdown', 'MarkdownV2']).default('HTML'),
    disable_web_page_preview: z.boolean().default(false),
    max_message_length: z.number().min(1).max(4096).default(4096)
  }).optional()
});

// WhatsApp integration schemas
export const WhatsAppSetupSchema = z.object({
  agent_id: z.string().uuid('Invalid agent ID'),
  phone_number_id: z.string().min(10),
  access_token: z.string().min(20),
  webhook_verify_token: z.string().min(10),
  business_account_id: z.string().min(10),
  app_id: z.string().min(10),
  app_secret: z.string().min(20),
  settings: z.object({
    welcome_message: z.string().max(1024).optional(),
    business_hours: z.object({
      enabled: z.boolean().default(false),
      timezone: z.string().default('UTC'),
      schedule: z.array(z.object({
        day: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
        start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      })).max(7)
    }).optional(),
    auto_reply_enabled: z.boolean().default(true),
    media_support: z.object({
      images: z.boolean().default(true),
      documents: z.boolean().default(true),
      audio: z.boolean().default(true),
      video: z.boolean().default(false)
    }).optional()
  }).optional()
});

// Discord integration schemas
export const DiscordSetupSchema = z.object({
  agent_id: z.string().uuid('Invalid agent ID'),
  bot_token: z.string().regex(/^[A-Za-z0-9_-]{24}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27}$/, 'Invalid Discord bot token'),
  application_id: z.string().regex(/^\d{17,19}$/, 'Invalid Discord application ID'),
  guild_ids: z.array(z.string().regex(/^\d{17,19}$/)).optional(),
  settings: z.object({
    command_prefix: z.string().max(5).default('!'),
    respond_to_mentions: z.boolean().default(true),
    respond_in_threads: z.boolean().default(true),
    allowed_channels: z.array(z.string().regex(/^\d{17,19}$/)).optional(),
    blocked_channels: z.array(z.string().regex(/^\d{17,19}$/)).optional(),
    permissions: z.object({
      send_messages: z.boolean().default(true),
      embed_links: z.boolean().default(true),
      attach_files: z.boolean().default(false),
      use_slash_commands: z.boolean().default(true)
    }).optional()
  }).optional()
});

// Website widget schemas
export const WebsiteWidgetSchema = z.object({
  agent_id: z.string().uuid('Invalid agent ID'),
  domain: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/, 'Invalid domain format'),
  widget_id: z.string().uuid().optional(),
  settings: z.object({
    position: z.enum(['bottom-right', 'bottom-left', 'top-right', 'top-left']).default('bottom-right'),
    theme: z.enum(['light', 'dark', 'auto']).default('auto'),
    primary_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').default('#3B82F6'),
    welcome_message: z.string().max(200).optional(),
    placeholder_text: z.string().max(100).default('Type your message...'),
    show_agent_avatar: z.boolean().default(true),
    show_typing_indicator: z.boolean().default(true),
    enable_file_upload: z.boolean().default(false),
    enable_emoji_picker: z.boolean().default(true),
    max_message_length: z.number().min(1).max(2000).default(1000),
    rate_limit: z.object({
      messages_per_minute: z.number().min(1).max(60).default(10),
      messages_per_hour: z.number().min(1).max(1000).default(100)
    }).optional()
  }).optional()
});

// Integration update schemas
export const UpdateIntegrationSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  is_active: z.boolean().optional(),
  settings: z.record(z.any()).optional()
});

// Integration query parameters
export const IntegrationQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  platform: IntegrationPlatformSchema.optional(),
  agent_id: z.string().uuid().optional(),
  is_active: z.coerce.boolean().optional(),
  sort_by: z.enum(['created_at', 'updated_at', 'name', 'platform']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

// Webhook validation schemas
export const WebhookEventSchema = z.object({
  platform: IntegrationPlatformSchema,
  event_type: z.string(),
  timestamp: z.number(),
  data: z.record(z.any()),
  signature: z.string().optional(),
  integration_id: z.string().uuid().optional()
});

// Integration analytics
export const IntegrationAnalyticsSchema = z.object({
  integration_id: z.string().uuid(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  metrics: z.array(z.enum([
    'messages_received',
    'messages_sent',
    'active_users',
    'response_time',
    'error_rate',
    'uptime'
  ])).default(['messages_received', 'messages_sent', 'active_users']),
  granularity: z.enum(['hour', 'day', 'week', 'month']).default('day')
});

// Export types
export type IntegrationPlatform = z.infer<typeof IntegrationPlatformSchema>;
export type BaseIntegration = z.infer<typeof BaseIntegrationSchema>;
export type TelegramSetup = z.infer<typeof TelegramSetupSchema>;
export type WhatsAppSetup = z.infer<typeof WhatsAppSetupSchema>;
export type DiscordSetup = z.infer<typeof DiscordSetupSchema>;
export type WebsiteWidget = z.infer<typeof WebsiteWidgetSchema>;
export type UpdateIntegration = z.infer<typeof UpdateIntegrationSchema>;
export type IntegrationQuery = z.infer<typeof IntegrationQuerySchema>;
export type WebhookEvent = z.infer<typeof WebhookEventSchema>;
export type IntegrationAnalytics = z.infer<typeof IntegrationAnalyticsSchema>;
