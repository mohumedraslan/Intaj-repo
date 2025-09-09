import { createClient } from '@supabase/supabase-js';
const crypto = require('crypto');

export interface FacebookConfig {
  pageAccessToken: string;
  pageId: string;
  appSecret: string;
  webhookVerifyToken: string;
}

export interface FacebookMessage {
  id: string;
  senderId: string;
  recipientId: string;
  timestamp: number;
  message: {
    text?: string;
    attachments?: Array<{
      type: 'image' | 'audio' | 'video' | 'file';
      payload: {
        url: string;
      };
    }>;
  };
}

export interface FacebookQuickReply {
  content_type: 'text';
  title: string;
  payload: string;
}

export interface FacebookGenericTemplate {
  template_type: 'generic';
  elements: Array<{
    title: string;
    subtitle?: string;
    image_url?: string;
    default_action?: {
      type: 'web_url';
      url: string;
    };
    buttons?: Array<{
      type: 'web_url' | 'postback';
      title: string;
      url?: string;
      payload?: string;
    }>;
  }>;
}

export class FacebookMessengerIntegration {
  private config: FacebookConfig;
  private baseUrl = 'https://graph.facebook.com/v18.0';

  constructor(config: FacebookConfig) {
    this.config = config;
  }

  /**
   * Send a message via Facebook Messenger
   */
  async sendMessage(
    recipientId: string,
    message: string,
    messageType: 'text' | 'image' | 'file' = 'text'
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const messageData: {
        recipient: { id: string };
        message: { text?: string; attachment?: { type: string; payload: { url: string } } };
      } = {
        recipient: { id: recipientId },
        message: {},
      };

      if (messageType === 'text') {
        messageData.message.text = message;
      } else if (messageType === 'image' || messageType === 'file') {
        messageData.message.attachment = {
          type: messageType,
          payload: {
            url: message,
          },
        };
      }

      const response = await fetch(`${this.baseUrl}/me/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.pageAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData),
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          messageId: data.message_id,
        };
      } else {
        return {
          success: false,
          error: data.error?.message || 'Failed to send message',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send a message with quick replies
   */
  async sendQuickReplyMessage(
    recipientId: string,
    text: string,
    quickReplies: FacebookQuickReply[]
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/me/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.pageAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: {
            text: text,
            quick_replies: quickReplies,
          },
          messaging_type: 'RESPONSE',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          messageId: data.message_id,
        };
      } else {
        return {
          success: false,
          error: data.error?.message || 'Failed to send quick reply message',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send a generic template message (carousel)
   */
  async sendGenericTemplate(
    recipientId: string,
    template: FacebookGenericTemplate
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/me/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.pageAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: {
            attachment: {
              type: 'template',
              payload: template,
            },
          },
          messaging_type: 'RESPONSE',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          messageId: data.message_id,
        };
      } else {
        return {
          success: false,
          error: data.error?.message || 'Failed to send template message',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send typing indicator
   */
  async sendTypingIndicator(
    recipientId: string,
    action: 'typing_on' | 'typing_off' = 'typing_on'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/me/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.pageAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          sender_action: action,
        }),
      });

      if (response.ok) {
        return { success: true };
      } else {
        const data = await response.json();
        return {
          success: false,
          error: data.error?.message || 'Failed to send typing indicator',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Process incoming webhook data
   */
  async processWebhookData(
    webhookData: Record<string, unknown>
  ): Promise<{ success: boolean; messages?: Record<string, unknown>[]; error?: string }> {
    try {
      const messages: Record<string, unknown>[] = [];

      const data = webhookData as { entry?: { messaging?: Record<string, unknown>[] }[] };
      if (data.entry) {
        for (const entry of data.entry) {
          if (entry.messaging) {
            for (const messaging of entry.messaging) {
              messages.push(messaging);
            }
          }
        }
      }

      return {
        success: true,
        messages,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verify webhook signature
   */
  async verifyWebhook(
    signature: string,
    body: string
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.config.appSecret)
        .update(body)
        .digest('hex');

      const providedSignature = signature.replace('sha256=', '');

      return {
        valid: crypto.timingSafeEqual(
          Buffer.from(expectedSignature, 'hex'),
          Buffer.from(providedSignature, 'hex')
        ),
      };
    } catch (error: unknown) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Facebook connection manager for database operations
 */
export class FacebookConnectionManager {
  private supabase: any;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Save Facebook connection to database
   */
  async saveConnection(
    userId: string,
    chatbotId: string,
    config: FacebookConfig
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.from('connections').upsert({
        user_id: userId,
        chatbot_id: chatbotId,
        platform: 'facebook',
        credentials: {
          page_access_token: config.pageAccessToken,
          page_id: config.pageId,
          app_secret: config.appSecret,
          webhook_verify_token: config.webhookVerifyToken,
        },
        active: true,
        created_at: new Date().toISOString(),
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(
    userId: string
  ): Promise<{ success: boolean; profile?: Record<string, unknown>; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .eq('platform', 'facebook')
        .eq('active', true)
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        connection: data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Store incoming message in database
   */
  async storeMessage(
    chatbotId: string,
    message: FacebookMessage
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.from('messages').insert({
        chatbot_id: chatbotId,
        role: 'user',
        content: message.message.text || 'Media message',
        metadata: {
          platform: 'facebook',
          message_id: message.id,
          sender_id: message.senderId,
          recipient_id: message.recipientId,
          timestamp: message.timestamp,
          attachments: message.message.attachments,
        },
        created_at: new Date().toISOString(),
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Store outgoing message in database
   */
  async storeOutgoingMessage(
    chatbotId: string,
    recipientId: string,
    content: string,
    messageId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.from('messages').insert({
        chatbot_id: chatbotId,
        role: 'assistant',
        content: content,
        metadata: {
          platform: 'facebook',
          message_id: messageId,
          recipient_id: recipientId,
          timestamp: Date.now(),
        },
        created_at: new Date().toISOString(),
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
