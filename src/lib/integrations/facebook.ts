import { createClient } from '@supabase/supabase-js';

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
   * Send a text message via Facebook Messenger
   */
  async sendTextMessage(recipientId: string, text: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/me/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.pageAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: text },
          messaging_type: 'RESPONSE'
        })
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          messageId: data.message_id
        };
      } else {
        return {
          success: false,
          error: data.error?.message || 'Failed to send message'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
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
          'Authorization': `Bearer ${this.config.pageAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: {
            text: text,
            quick_replies: quickReplies
          },
          messaging_type: 'RESPONSE'
        })
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          messageId: data.message_id
        };
      } else {
        return {
          success: false,
          error: data.error?.message || 'Failed to send quick reply message'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
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
          'Authorization': `Bearer ${this.config.pageAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: {
            attachment: {
              type: 'template',
              payload: template
            }
          },
          messaging_type: 'RESPONSE'
        })
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          messageId: data.message_id
        };
      } else {
        return {
          success: false,
          error: data.error?.message || 'Failed to send template message'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send typing indicator
   */
  async sendTypingIndicator(recipientId: string, action: 'typing_on' | 'typing_off' = 'typing_on'): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/me/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.pageAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          sender_action: action
        })
      });

      if (response.ok) {
        return { success: true };
      } else {
        const data = await response.json();
        return {
          success: false,
          error: data.error?.message || 'Failed to send typing indicator'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send image message
   */
  async sendImageMessage(recipientId: string, imageUrl: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/me/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.pageAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: {
            attachment: {
              type: 'image',
              payload: {
                url: imageUrl,
                is_reusable: true
              }
            }
          },
          messaging_type: 'RESPONSE'
        })
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          messageId: data.message_id
        };
      } else {
        return {
          success: false,
          error: data.error?.message || 'Failed to send image message'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get user profile information
   */
  async getUserProfile(userId: string): Promise<{ success: boolean; profile?: any; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/${userId}?fields=first_name,last_name,profile_pic&access_token=${this.config.pageAccessToken}`);
      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          profile: data
        };
      } else {
        return {
          success: false,
          error: data.error?.message || 'Failed to get user profile'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Set up persistent menu
   */
  async setPersistentMenu(menuItems: Array<{
    type: 'web_url' | 'postback';
    title: string;
    url?: string;
    payload?: string;
  }>): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/me/messenger_profile`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.pageAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          persistent_menu: [{
            locale: 'default',
            composer_input_disabled: false,
            call_to_actions: menuItems
          }]
        })
      });

      if (response.ok) {
        return { success: true };
      } else {
        const data = await response.json();
        return {
          success: false,
          error: data.error?.message || 'Failed to set persistent menu'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Set greeting text
   */
  async setGreeting(greetingText: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/me/messenger_profile`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.pageAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          greeting: [{
            locale: 'default',
            text: greetingText
          }]
        })
      });

      if (response.ok) {
        return { success: true };
      } else {
        const data = await response.json();
        return {
          success: false,
          error: data.error?.message || 'Failed to set greeting'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Verify webhook signature
   */
  static verifyWebhookSignature(payload: string, signature: string, appSecret: string): boolean {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha1', appSecret)
      .update(payload, 'utf8')
      .digest('hex');
    
    return signature === `sha1=${expectedSignature}`;
  }

  /**
   * Parse incoming webhook message
   */
  static parseWebhookMessage(webhookData: any): FacebookMessage | null {
    try {
      const entry = webhookData.entry?.[0];
      const messaging = entry?.messaging?.[0];

      if (!messaging || !messaging.message) return null;

      const message: FacebookMessage = {
        id: messaging.message.mid,
        senderId: messaging.sender.id,
        recipientId: messaging.recipient.id,
        timestamp: messaging.timestamp,
        message: {
          text: messaging.message.text,
          attachments: messaging.message.attachments
        }
      };

      return message;
    } catch (error) {
      console.error('Error parsing Facebook webhook message:', error);
      return null;
    }
  }

  /**
   * Handle postback events
   */
  static parseWebhookPostback(webhookData: any): { senderId: string; payload: string; title: string } | null {
    try {
      const entry = webhookData.entry?.[0];
      const messaging = entry?.messaging?.[0];

      if (!messaging || !messaging.postback) return null;

      return {
        senderId: messaging.sender.id,
        payload: messaging.postback.payload,
        title: messaging.postback.title
      };
    } catch (error) {
      console.error('Error parsing Facebook webhook postback:', error);
      return null;
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
  async saveConnection(userId: string, chatbotId: string, config: FacebookConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('connections')
        .upsert({
          user_id: userId,
          chatbot_id: chatbotId,
          platform: 'facebook',
          credentials: {
            page_access_token: config.pageAccessToken,
            page_id: config.pageId,
            app_secret: config.appSecret,
            webhook_verify_token: config.webhookVerifyToken
          },
          active: true,
          created_at: new Date().toISOString()
        });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get Facebook connection from database
   */
  async getConnection(userId: string, chatbotId: string): Promise<{ success: boolean; connection?: any; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('connections')
        .select('*')
        .eq('user_id', userId)
        .eq('chatbot_id', chatbotId)
        .eq('platform', 'facebook')
        .eq('active', true)
        .single();

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        connection: data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Store incoming message in database
   */
  async storeMessage(chatbotId: string, message: FacebookMessage): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('messages')
        .insert({
          chatbot_id: chatbotId,
          role: 'user',
          content: message.message.text || 'Media message',
          metadata: {
            platform: 'facebook',
            message_id: message.id,
            sender_id: message.senderId,
            recipient_id: message.recipientId,
            timestamp: message.timestamp,
            attachments: message.message.attachments
          },
          created_at: new Date().toISOString()
        });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
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
      const { error } = await this.supabase
        .from('messages')
        .insert({
          chatbot_id: chatbotId,
          role: 'assistant',
          content: content,
          metadata: {
            platform: 'facebook',
            message_id: messageId,
            recipient_id: recipientId,
            timestamp: Date.now()
          },
          created_at: new Date().toISOString()
        });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
