import { createClient } from '@supabase/supabase-js';

export interface InstagramConfig {
  accessToken: string;
  instagramBusinessAccountId: string;
  pageId: string;
  appSecret: string;
  webhookVerifyToken: string;
}

export interface InstagramMessage {
  id: string;
  senderId: string;
  recipientId: string;
  timestamp: number;
  message: {
    text?: string;
    attachments?: Array<{
      type: 'image' | 'video' | 'story_mention' | 'share';
      payload: {
        url?: string;
        media_id?: string;
      };
    }>;
  };
  messageType: 'message' | 'story_mention' | 'story_reply';
}

export interface InstagramStoryMention {
  id: string;
  mediaId: string;
  mediaUrl: string;
  timestamp: number;
  mentionedUserId: string;
}

export interface InstagramQuickReply {
  content_type: 'text';
  title: string;
  payload: string;
}

export class InstagramIntegration {
  private config: InstagramConfig;
  private baseUrl = 'https://graph.facebook.com/v18.0';

  constructor(config: InstagramConfig) {
    this.config = config;
  }

  /**
   * Send a message via Instagram Direct Messages
   */
  async sendMessage(recipientId: string, message: string, messageType: 'text' | 'image' | 'story_reply' = 'text'): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const messageData: Record<string, unknown> = {};

      if (messageType === 'text') {
        messageData.message = { text: message };
      } else if (messageType === 'image') {
        messageData.message = {
          attachment: {
            type: 'image',
            payload: {
              url: message,
              is_reusable: true
            }
          }
        };
      } else if (messageType === 'story_reply') {
        messageData.message = { text: message };
      }

      const response = await fetch(`${this.baseUrl}/me/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          ...messageData
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
   * Get Instagram media comments
   */
  async processWebhookData(webhookData: Record<string, unknown>): Promise<{ success: boolean; messages?: Record<string, unknown>[]; error?: string }> {
    try {
      const entry = webhookData.entry?.[0];
      const changes = entry?.changes?.[0];

      if (changes?.field !== 'comments') return { success: false, error: 'Invalid webhook data' };

      const value = changes.value;
      const mediaId = value.media?.id;

      if (!mediaId) return { success: false, error: 'Invalid media ID' };

      const response = await fetch(`${this.baseUrl}/${mediaId}/comments?fields=id,text,username,timestamp&access_token=${this.config.accessToken}`);
      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          messages: data.data
        };
      } else {
        return {
          success: false,
          error: data.error?.message || 'Failed to get media comments'
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
   * Store incoming message in database
   */
  async processIncomingMessage(message: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
    try {
      const chatbotId = message.chatbot_id;
      const { error } = await this.supabase
        .from('messages')
        .insert({
          chatbot_id: chatbotId,
          role: 'user',
          content: message.content,
          metadata: {
            platform: 'instagram',
            message_id: message.message_id,
            sender_id: message.sender_id,
            recipient_id: message.recipient_id,
            message_type: message.message_type,
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
    recipientId: string, 
    content: string, 
    messageId?: string,
    messageType: string = 'message'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('messages')
        .insert({
          chatbot_id: chatbotId,
          role: 'assistant',
          content: content,
          metadata: {
            platform: 'instagram',
            message_id: messageId,
            recipient_id: recipientId,
            message_type: messageType,
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

  /**
   * Verify webhook signature
   */
  async verifyWebhook(signature: string, body: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const expectedSignature = require('crypto').createHmac('sha256', this.config.appSecret)
        .update(body)
        .digest('hex');
      
      const providedSignature = signature.replace('sha256=', '');
      
      return {
        valid: require('crypto').timingSafeEqual(
          Buffer.from(expectedSignature, 'hex'),
          Buffer.from(providedSignature, 'hex')
        )
      };
    } catch (error: unknown) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * Instagram connection manager for database operations
 */
export class InstagramConnectionManager {
  private supabase: any;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Save Instagram connection to database
   */
  async saveConnection(userId: string, chatbotId: string, config: InstagramConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('connections')
        .upsert({
          user_id: userId,
          chatbot_id: chatbotId,
          platform: 'instagram',
          credentials: {
            access_token: config.accessToken,
            instagram_business_account_id: config.instagramBusinessAccountId,
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
   * Get Instagram connection from database
   */
  async getConnection(userId: string, chatbotId: string): Promise<{ success: boolean; connection?: any; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('connections')
        .select('*')
        .eq('user_id', userId)
        .eq('chatbot_id', chatbotId)
        .eq('platform', 'instagram')
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
  async storeMessage(chatbotId: string, message: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('messages')
        .insert({
          chatbot_id: chatbotId,
          role: 'user',
          content: message.content,
          metadata: {
            platform: 'instagram',
            message_id: message.message_id,
            sender_id: message.sender_id,
            recipient_id: message.recipient_id,
            message_type: message.message_type,
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
    recipientId: string, 
    content: string, 
    messageId?: string,
    messageType: string = 'message'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('messages')
        .insert({
          chatbot_id: chatbotId,
          role: 'assistant',
          content: content,
          metadata: {
            platform: 'instagram',
            message_id: messageId,
            recipient_id: recipientId,
            message_type: messageType,
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

  /**
   * Store story mention in database
   */
  async storeStoryMention(chatbotId: string, mention: InstagramStoryMention): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('messages')
        .insert({
          chatbot_id: chatbotId,
          role: 'user',
          content: 'Story mention',
          metadata: {
            platform: 'instagram',
            message_id: mention.id,
            sender_id: mention.mentionedUserId,
            message_type: 'story_mention',
            media_id: mention.mediaId,
            media_url: mention.mediaUrl,
            timestamp: mention.timestamp
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
