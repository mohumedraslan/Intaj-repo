import { z } from 'zod';
import { TelegramBotSettings, TelegramBotFormData } from './types';

// Validation schemas
export const BotTokenSchema = z.string()
  .regex(/^\d+:[A-Za-z0-9_-]{35,}$/, 'Invalid Telegram bot token format')
  .min(45, 'Bot token too short')
  .max(60, 'Bot token too long');

export const BusinessHoursSchema = z.object({
  enabled: z.boolean(),
  timezone: z.string().min(1, 'Timezone is required'),
  schedule: z.record(z.object({
    start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
    end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
    enabled: z.boolean()
  }))
});

export const AutoResponseKeywordSchema = z.object({
  keyword: z.string().min(1, 'Keyword cannot be empty').max(100, 'Keyword too long'),
  response: z.string().min(1, 'Response cannot be empty').max(4096, 'Response too long')
});

export const TelegramBotSettingsSchema = z.object({
  welcome_message: z.string().max(4096, 'Welcome message too long'),
  support_mode: z.enum(['auto', 'hybrid', 'manual']),
  business_hours: BusinessHoursSchema,
  auto_responses: z.object({
    enabled: z.boolean(),
    fallback_message: z.string().max(4096, 'Fallback message too long'),
    keywords: z.array(AutoResponseKeywordSchema).max(50, 'Too many keyword responses')
  }),
  rate_limiting: z.object({
    enabled: z.boolean(),
    max_messages_per_minute: z.number().min(1).max(100)
  })
});

export const CreateTelegramBotSchema = z.object({
  bot_token: BotTokenSchema,
  agent_id: z.string().uuid('Invalid agent ID'),
  settings: TelegramBotSettingsSchema.optional()
});

export const UpdateTelegramBotSchema = z.object({
  bot_token: BotTokenSchema.optional(),
  is_active: z.boolean().optional(),
  settings: TelegramBotSettingsSchema.optional()
});

// Validation functions
export function validateBotToken(token: string): { isValid: boolean; error?: string } {
  try {
    BotTokenSchema.parse(token);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0]?.message || 'Invalid bot token' };
    }
    return { isValid: false, error: 'Validation failed' };
  }
}

export function validateBotSettings(settings: Partial<TelegramBotSettings>): { 
  isValid: boolean; 
  error?: string;
  validatedSettings?: TelegramBotSettings;
} {
  try {
    const validatedSettings = TelegramBotSettingsSchema.parse(settings);
    return { isValid: true, validatedSettings };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return { 
        isValid: false, 
        error: `${firstError?.path.join('.')}: ${firstError?.message}` || 'Invalid settings' 
      };
    }
    return { isValid: false, error: 'Settings validation failed' };
  }
}

export function sanitizeMessage(message: string): string {
  // Remove potentially harmful content
  return message
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim()
    .slice(0, 4096); // Telegram message limit
}

export function validateWebhookUrl(url: string): { isValid: boolean; error?: string } {
  try {
    const parsedUrl = new URL(url);
    
    if (parsedUrl.protocol !== 'https:') {
      return { isValid: false, error: 'Webhook URL must use HTTPS' };
    }
    
    if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1') {
      return { isValid: false, error: 'Webhook URL cannot be localhost' };
    }
    
    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: 'Invalid URL format' };
  }
}

// Form validation functions
export function validateTelegramBot(formData: TelegramBotFormData): { success: boolean; error?: string } {
  if (!formData.bot_token || formData.bot_token.trim() === '') {
    return { success: false, error: 'Bot token is required' };
  }

  const tokenValidation = validateBotToken(formData.bot_token);
  if (!tokenValidation.isValid) {
    return { success: false, error: tokenValidation.error };
  }

  if (formData.welcome_message && formData.welcome_message.length > 4096) {
    return { success: false, error: 'Welcome message is too long (max 4096 characters)' };
  }

  return { success: true };
}

export function sanitizeBotSettings(formData: TelegramBotFormData): any {
  return {
    bot_token: formData.bot_token.trim(),
    bot_username: formData.bot_username.trim(),
    welcome_message: sanitizeMessage(formData.welcome_message),
    support_mode: formData.support_mode,
    keywords: formData.keywords.map(kw => ({
      keyword: sanitizeMessage(kw.keyword),
      response: sanitizeMessage(kw.response)
    }))
  };
}

// Default settings
export const getDefaultBotSettings = (): TelegramBotSettings => ({
  welcome_message: 'Hello! 👋 Welcome to our support bot. How can I help you today?',
  support_mode: 'hybrid',
  business_hours: {
    enabled: true,
    timezone: 'UTC',
    schedule: {
      monday: { start: '09:00', end: '17:00', enabled: true },
      tuesday: { start: '09:00', end: '17:00', enabled: true },
      wednesday: { start: '09:00', end: '17:00', enabled: true },
      thursday: { start: '09:00', end: '17:00', enabled: true },
      friday: { start: '09:00', end: '17:00', enabled: true },
      saturday: { start: '10:00', end: '14:00', enabled: false },
      sunday: { start: '10:00', end: '14:00', enabled: false }
    }
  },
  auto_responses: {
    enabled: true,
    fallback_message: 'I\'m not sure how to help with that. Let me connect you with a human agent.',
    keywords: [
      { keyword: 'hello', response: 'Hello! How can I assist you today?' },
      { keyword: 'help', response: 'I\'m here to help! What do you need assistance with?' },
      { keyword: 'thanks', response: 'You\'re welcome! Is there anything else I can help you with?' }
    ]
  },
  rate_limiting: {
    enabled: true,
    max_messages_per_minute: 20
  }
});
