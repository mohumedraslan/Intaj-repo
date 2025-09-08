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
   * Send a text message via Instagram Direct Messages
   */
  async sendTextMessage(recipientId: string, text: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/me/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: text }
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
   * Send an image message via Instagram Direct Messages
   */
  async sendImageMessage(recipientId: string, imageUrl: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/me/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
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
          }
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
   * Send a message with quick replies
   */
  async sendQuickReplyMessage(
    recipientId: string, 
    text: string, 
    quickReplies: InstagramQuickReply[]
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/me/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: {
            text: text,
            quick_replies: quickReplies
          }
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
   * Reply to a story mention
   */
  async replyToStoryMention(storyId: string, text: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/${storyId}/replies`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text
        })
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          messageId: data.id
        };
      } else {
        return {
          success: false,
          error: data.error?.message || 'Failed to reply to story mention'
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
   * Get media information from Instagram
   */
  async getMediaInfo(mediaId: string): Promise<{ success: boolean; media?: any; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/${mediaId}?fields=id,media_type,media_url,thumbnail_url,timestamp,username&access_token=${this.config.accessToken}`);
      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          media: data
        };
      } else {
        return {
          success: false,
          error: data.error?.message || 'Failed to get media info'
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
      const response = await fetch(`${this.baseUrl}/${userId}?fields=id,username,name,profile_picture_url&access_token=${this.config.accessToken}`);
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
   * Get Instagram business account information
   */
  async getBusinessAccountInfo(): Promise<{ success: boolean; account?: any; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/${this.config.instagramBusinessAccountId}?fields=id,username,name,profile_picture_url,followers_count,follows_count,media_count&access_token=${this.config.accessToken}`);
      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          account: data
        };
      } else {
        return {
          success: false,
          error: data.error?.message || 'Failed to get business account info'
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
  async getMediaComments(mediaId: string): Promise<{ success: boolean; comments?: any[]; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/${mediaId}/comments?fields=id,text,username,timestamp&access_token=${this.config.accessToken}`);
      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          comments: data.data
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
   * Reply to a comment on Instagram media
   */
  async replyToComment(commentId: string, text: string): Promise<{ success: boolean; replyId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/${commentId}/replies`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text
        })
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          replyId: data.id
        };
      } else {
        return {
          success: false,
          error: data.error?.message || 'Failed to reply to comment'
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
   * Get Instagram insights for a media post
   */
  async getMediaInsights(mediaId: string): Promise<{ success: boolean; insights?: any; error?: string }> {
    try {
      const metrics = 'engagement,impressions,reach,saved';
      const response = await fetch(`${this.baseUrl}/${mediaId}/insights?metric=${metrics}&access_token=${this.config.accessToken}`);
      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          insights: data.data
        };
      } else {
        return {
          success: false,
          error: data.error?.message || 'Failed to get media insights'
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
  static parseWebhookMessage(webhookData: any): InstagramMessage | null {
    try {
      const entry = webhookData.entry?.[0];
      const messaging = entry?.messaging?.[0];

      if (!messaging) return null;

      // Handle direct messages
      if (messaging.message) {
        const message: InstagramMessage = {
          id: messaging.message.mid,
          senderId: messaging.sender.id,
          recipientId: messaging.recipient.id,
          timestamp: messaging.timestamp,
          message: {
            text: messaging.message.text,
            attachments: messaging.message.attachments
          },
          messageType: 'message'
        };
        return message;
      }

      // Handle story mentions
      if (messaging.story_mention) {
        const message: InstagramMessage = {
          id: messaging.story_mention.id,
          senderId: messaging.sender.id,
          recipientId: messaging.recipient.id,
          timestamp: messaging.timestamp,
          message: {
            attachments: [{
              type: 'story_mention',
              payload: {
                media_id: messaging.story_mention.media_id
              }
            }]
          },
          messageType: 'story_mention'
        };
        return message;
      }

      return null;
    } catch (error) {
      console.error('Error parsing Instagram webhook message:', error);
      return null;
    }
  }

  /**
   * Parse story mention from webhook
   */
  static parseStoryMention(webhookData: any): InstagramStoryMention | null {
    try {
      const entry = webhookData.entry?.[0];
      const messaging = entry?.messaging?.[0];

      if (!messaging?.story_mention) return null;

      return {
        id: messaging.story_mention.id,
        mediaId: messaging.story_mention.media_id,
        mediaUrl: messaging.story_mention.media_url || '',
        timestamp: messaging.timestamp,
        mentionedUserId: messaging.sender.id
      };
    } catch (error) {
      console.error('Error parsing Instagram story mention:', error);
      return null;
    }
  }

  /**
   * Parse comment mention from webhook
   */
  static parseCommentMention(webhookData: any): { commentId: string; mediaId: string; text: string; userId: string; timestamp: number } | null {
    try {
      const entry = webhookData.entry?.[0];
      const changes = entry?.changes?.[0];

      if (changes?.field !== 'comments') return null;

      const value = changes.value;
      return {
        commentId: value.id,
        mediaId: value.media?.id,
        text: value.text,
        userId: value.from?.id,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error parsing Instagram comment mention:', error);
      return null;
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
  async storeMessage(chatbotId: string, message: InstagramMessage): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('messages')
        .insert({
          chatbot_id: chatbotId,
          role: 'user',
          content: message.message.text || `${message.messageType} message`,
          metadata: {
            platform: 'instagram',
            message_id: message.id,
            sender_id: message.senderId,
            recipient_id: message.recipientId,
            timestamp: message.timestamp,
            message_type: message.messageType,
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
