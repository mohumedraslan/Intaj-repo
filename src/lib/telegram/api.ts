import { 
  TelegramApiResponse, 
  TelegramBotInfo, 
  BotValidationResult, 
  WebhookSetupResult,
  SendMessageResponse,
  TelegramWebhookInfo 
} from './types';

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

export class TelegramApiError extends Error {
  constructor(
    message: string,
    public code?: number,
    public description?: string
  ) {
    super(message);
    this.name = 'TelegramApiError';
  }
}

export class TelegramApi {
  private botToken: string;
  private baseUrl: string;

  constructor(botToken: string) {
    this.botToken = botToken;
    this.baseUrl = `${TELEGRAM_API_BASE}${botToken}`;
  }

  private async makeRequest<T>(
    method: string,
    params?: Record<string, any>
  ): Promise<T> {
    const url = `${this.baseUrl}/${method}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: params ? JSON.stringify(params) : undefined,
      });

      const data: TelegramApiResponse<T> = await response.json();

      if (!data.ok) {
        throw new TelegramApiError(
          data.description || 'Telegram API request failed',
          data.error_code,
          data.description
        );
      }

      return data.result as T;
    } catch (error) {
      if (error instanceof TelegramApiError) {
        throw error;
      }
      throw new TelegramApiError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async validateBot(): Promise<BotValidationResult> {
    try {
      const botInfo = await this.makeRequest<TelegramBotInfo>('getMe');
      
      if (!botInfo.is_bot) {
        return {
          isValid: false,
          error: 'Token does not belong to a bot'
        };
      }

      return {
        isValid: true,
        botInfo
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof TelegramApiError 
          ? error.description || error.message 
          : 'Failed to validate bot token'
      };
    }
  }

  async setWebhook(webhookUrl: string, secretToken?: string): Promise<WebhookSetupResult> {
    try {
      const params: Record<string, any> = {
        url: webhookUrl,
        allowed_updates: ['message', 'edited_message'],
        drop_pending_updates: true
      };

      if (secretToken) {
        params.secret_token = secretToken;
      }

      const result = await this.makeRequest<boolean>('setWebhook', params);
      
      if (result) {
        const webhookInfo = await this.getWebhookInfo();
        return {
          success: true,
          webhookInfo
        };
      }

      return {
        success: false,
        error: 'Failed to set webhook'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof TelegramApiError 
          ? error.description || error.message 
          : 'Failed to set webhook'
      };
    }
  }

  async deleteWebhook(): Promise<boolean> {
    try {
      return await this.makeRequest<boolean>('deleteWebhook', {
        drop_pending_updates: true
      });
    } catch (error) {
      console.error('Failed to delete webhook:', error);
      return false;
    }
  }

  async getWebhookInfo(): Promise<TelegramWebhookInfo> {
    return await this.makeRequest<TelegramWebhookInfo>('getWebhookInfo');
  }

  async sendMessage(
    chatId: number | string,
    text: string,
    options?: {
      parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
      disable_web_page_preview?: boolean;
      disable_notification?: boolean;
      reply_to_message_id?: number;
    }
  ): Promise<SendMessageResponse> {
    const params = {
      chat_id: chatId,
      text,
      ...options
    };

    return await this.makeRequest<SendMessageResponse>('sendMessage', params);
  }

  async sendTypingAction(chatId: number | string): Promise<boolean> {
    try {
      return await this.makeRequest<boolean>('sendChatAction', {
        chat_id: chatId,
        action: 'typing'
      });
    } catch (error) {
      console.error('Failed to send typing action:', error);
      return false;
    }
  }

  static validateBotToken(token: string): boolean {
    // Telegram bot tokens follow the pattern: {bot_id}:{auth_token}
    // bot_id is a number, auth_token is 35 characters long
    const tokenRegex = /^\d+:[A-Za-z0-9_-]{35}$/;
    return tokenRegex.test(token);
  }

  static extractBotId(token: string): string | null {
    if (!this.validateBotToken(token)) {
      return null;
    }
    return token.split(':')[0];
  }
}

// Utility functions
export async function validateTelegramBot(token: string): Promise<BotValidationResult> {
  if (!TelegramApi.validateBotToken(token)) {
    return {
      isValid: false,
      error: 'Invalid bot token format'
    };
  }

  const api = new TelegramApi(token);
  return await api.validateBot();
}

export async function setupTelegramWebhook(
  token: string,
  webhookUrl: string,
  secretToken?: string
): Promise<WebhookSetupResult> {
  const api = new TelegramApi(token);
  return await api.setWebhook(webhookUrl, secretToken);
}

export async function deleteTelegramWebhook(token: string): Promise<boolean> {
  const api = new TelegramApi(token);
  return await api.deleteWebhook();
}
