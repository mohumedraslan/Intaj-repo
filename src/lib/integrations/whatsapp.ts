import { createClient } from '@supabase/supabase-js';

export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  webhookVerifyToken: string;
  businessAccountId: string;
}

export interface WhatsAppMessage {
  id: string;
  from: string;
  to: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'template';
  content: string;
  mediaUrl?: string;
  timestamp: number;
}

export interface WhatsAppTemplate {
  name: string;
  language: string;
  components: Array<{
    type: 'header' | 'body' | 'footer' | 'button';
    parameters?: Array<{ type: string; text: string }>;
  }>;
}

export class WhatsAppIntegration {
  private config: WhatsAppConfig;
  private baseUrl = 'https://graph.facebook.com/v18.0';

  constructor(config: WhatsAppConfig) {
    this.config = config;
  }

  /**
   * Send a text message via WhatsApp Business API
   */
  async sendTextMessage(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/${this.config.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: 'text',
          text: {
            body: message
          }
        })
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          messageId: data.messages[0].id
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
   * Send a template message via WhatsApp Business API
   */
  async sendTemplateMessage(
    to: string, 
    template: WhatsAppTemplate
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/${this.config.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: 'template',
          template: {
            name: template.name,
            language: {
              code: template.language
            },
            components: template.components
          }
        })
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          messageId: data.messages[0].id
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
   * Send media message (image, audio, video, document)
   */
  async sendMediaMessage(
    to: string,
    type: 'image' | 'audio' | 'video' | 'document',
    mediaUrl: string,
    caption?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const mediaObject: any = {
        link: mediaUrl
      };

      if (caption && (type === 'image' || type === 'video' || type === 'document')) {
        mediaObject.caption = caption;
      }

      const response = await fetch(`${this.baseUrl}/${this.config.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: type,
          [type]: mediaObject
        })
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          messageId: data.messages[0].id
        };
      } else {
        return {
          success: false,
          error: data.error?.message || 'Failed to send media message'
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
   * Mark message as read
   */
  async markMessageAsRead(messageId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/${this.config.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId
        })
      });

      if (response.ok) {
        return { success: true };
      } else {
        const data = await response.json();
        return {
          success: false,
          error: data.error?.message || 'Failed to mark message as read'
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
   * Get media URL from media ID
   */
  async getMediaUrl(mediaId: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/${mediaId}`, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
        }
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          url: data.url
        };
      } else {
        return {
          success: false,
          error: data.error?.message || 'Failed to get media URL'
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
   * Download media content
   */
  async downloadMedia(mediaUrl: string): Promise<{ success: boolean; buffer?: Buffer; error?: string }> {
    try {
      const response = await fetch(mediaUrl, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
        }
      });

      if (response.ok) {
        const buffer = Buffer.from(await response.arrayBuffer());
        return {
          success: true,
          buffer
        };
      } else {
        return {
          success: false,
          error: 'Failed to download media'
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
      .createHmac('sha256', appSecret)
      .update(payload, 'utf8')
      .digest('hex');
    
    return signature === `sha256=${expectedSignature}`;
  }

  /**
   * Parse incoming webhook message
   */
  static parseWebhookMessage(webhookData: any): WhatsAppMessage | null {
    try {
      const entry = webhookData.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages?.[0];

      if (!messages) return null;

      const message: WhatsAppMessage = {
        id: messages.id,
        from: messages.from,
        to: value.metadata?.phone_number_id || '',
        type: messages.type,
        content: '',
        timestamp: messages.timestamp
      };

      // Extract content based on message type
      switch (messages.type) {
        case 'text':
          message.content = messages.text?.body || '';
          break;
        case 'image':
        case 'audio':
        case 'video':
        case 'document':
          message.content = messages[messages.type]?.caption || '';
          message.mediaUrl = messages[messages.type]?.id; // This is media ID, need to get URL separately
          break;
        case 'location':
          const location = messages.location;
          message.content = `Location: ${location?.latitude}, ${location?.longitude}`;
          if (location?.name) message.content += ` (${location.name})`;
          break;
        default:
          message.content = 'Unsupported message type';
      }

      return message;
    } catch (error) {
      console.error('Error parsing webhook message:', error);
      return null;
    }
  }

  /**
   * Get business profile information
   */
  async getBusinessProfile(): Promise<{ success: boolean; profile?: any; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/${this.config.phoneNumberId}`, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
        }
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          profile: data
        };
      } else {
        return {
          success: false,
          error: data.error?.message || 'Failed to get business profile'
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
   * Update business profile
   */
  async updateBusinessProfile(updates: {
    about?: string;
    address?: string;
    description?: string;
    email?: string;
    profile_picture_url?: string;
    websites?: string[];
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/${this.config.phoneNumberId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        return { success: true };
      } else {
        const data = await response.json();
        return {
          success: false,
          error: data.error?.message || 'Failed to update business profile'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * WhatsApp connection manager for database operations
 */
export class WhatsAppConnectionManager {
  private supabase: any;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Save WhatsApp connection to database
   */
  async saveConnection(userId: string, chatbotId: string, config: WhatsAppConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('connections')
        .upsert({
          user_id: userId,
          chatbot_id: chatbotId,
          platform: 'whatsapp',
          credentials: {
            access_token: config.accessToken,
            phone_number_id: config.phoneNumberId,
            webhook_verify_token: config.webhookVerifyToken,
            business_account_id: config.businessAccountId
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
   * Get WhatsApp connection from database
   */
  async getConnection(userId: string, chatbotId: string): Promise<{ success: boolean; connection?: any; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('connections')
        .select('*')
        .eq('user_id', userId)
        .eq('chatbot_id', chatbotId)
        .eq('platform', 'whatsapp')
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
  async storeMessage(chatbotId: string, message: WhatsAppMessage): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('messages')
        .insert({
          chatbot_id: chatbotId,
          role: 'user',
          content: message.content,
          metadata: {
            platform: 'whatsapp',
            message_id: message.id,
            from: message.from,
            type: message.type,
            media_url: message.mediaUrl,
            timestamp: message.timestamp
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
    to: string, 
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
            platform: 'whatsapp',
            message_id: messageId,
            to: to,
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
