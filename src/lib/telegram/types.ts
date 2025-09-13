// Telegram Bot API Types
export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  date: number;
  chat: TelegramChat;
  text?: string;
  entities?: TelegramMessageEntity[];
}

export interface TelegramMessageEntity {
  type: string;
  offset: number;
  length: number;
  url?: string;
  user?: TelegramUser;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  channel_post?: TelegramMessage;
  edited_channel_post?: TelegramMessage;
}

export interface TelegramWebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  last_error_date?: number;
  last_error_message?: string;
  max_connections?: number;
  allowed_updates?: string[];
}

export interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
  can_join_groups: boolean;
  can_read_all_group_messages: boolean;
  supports_inline_queries: boolean;
}

// Database Types
export interface TelegramBot {
  id: string;
  agent_id: string;
  user_id: string;
  bot_token: string;
  bot_username: string;
  bot_id: string;
  is_active: boolean;
  webhook_url?: string;
  webhook_secret?: string;
  settings: TelegramBotSettings;
  created_at: string;
  updated_at: string;
}

export interface TelegramBotSettings {
  welcome_message: string;
  support_mode: 'auto' | 'hybrid' | 'manual';
  business_hours: {
    enabled: boolean;
    timezone: string;
    schedule: Record<string, { start: string; end: string; enabled: boolean }>;
  };
  auto_responses: {
    enabled: boolean;
    fallback_message: string;
    keywords: Array<{ keyword: string; response: string }>;
  };
  rate_limiting: {
    enabled: boolean;
    max_messages_per_minute: number;
  };
}

export interface TelegramMessage {
  id: string;
  agent_id: string;
  user_id: string;
  telegram_bot_id: string;
  telegram_user_id: string;
  telegram_username?: string;
  telegram_first_name?: string;
  message_type: 'text' | 'photo' | 'document' | 'voice' | 'video' | 'sticker' | 'location';
  message_content: string;
  direction: 'inbound' | 'outbound';
  is_ai_response: boolean;
  response_time_seconds?: number;
  created_at: string;
}

// API Response Types
export interface TelegramApiResponse<T = any> {
  ok: boolean;
  result?: T;
  error_code?: number;
  description?: string;
}

export interface SendMessageResponse {
  message_id: number;
  from: TelegramUser;
  chat: TelegramChat;
  date: number;
  text: string;
}

// Form Data Types
export interface TelegramBotFormData {
  bot_token: string;
  bot_username: string;
  webhook_url: string;
  use_platform_token?: boolean;
  settings: TelegramBotSettings;
}

// Validation Types
export interface BotValidationResult {
  isValid: boolean;
  botInfo?: TelegramBotInfo;
  error?: string;
}

export interface WebhookSetupResult {
  success: boolean;
  webhookInfo?: TelegramWebhookInfo;
  error?: string;
}
