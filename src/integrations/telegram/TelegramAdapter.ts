/**
 * Enhanced Telegram Platform Adapter
 * Implements robust Telegram Bot API integration with proper error handling
 */

import {
  BasePlatformAdapter,
  PlatformConfig,
  WebhookSetupResult,
  WebhookPayload,
  InboundMessage,
  OutboundMessage,
  SendResult,
  RateLimitInfo,
  PlatformError,
  PlatformCapabilities,
  MessageContent,
  MessageMetadata
} from '../base/PlatformAdapter';
import { createHash, createHmac } from 'crypto';

// Telegram-specific types
export interface TelegramConfig extends PlatformConfig {
  credentials: {
    botToken: string;
    botTokenSource: 'platform' | 'custom';
  };
  settings: {
    webhookSecret?: string;
    allowedUpdates?: string[];
    dropPendingUpdates?: boolean;
    maxConnections?: number;
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    disableWebPagePreview?: boolean;
    disableNotification?: boolean;
  };
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  channel_post?: TelegramMessage;
  edited_channel_post?: TelegramMessage;
  inline_query?: any;
  chosen_inline_result?: any;
  callback_query?: TelegramCallbackQuery;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  sender_chat?: TelegramChat;
  date: number;
  chat: TelegramChat;
  forward_from?: TelegramUser;
  forward_from_chat?: TelegramChat;
  forward_from_message_id?: number;
  forward_signature?: string;
  forward_sender_name?: string;
  forward_date?: number;
  reply_to_message?: TelegramMessage;
  via_bot?: TelegramUser;
  edit_date?: number;
  media_group_id?: string;
  author_signature?: string;
  text?: string;
  entities?: TelegramMessageEntity[];
  caption_entities?: TelegramMessageEntity[];
  audio?: TelegramAudio;
  document?: TelegramDocument;
  animation?: TelegramAnimation;
  game?: any;
  photo?: TelegramPhotoSize[];
  sticker?: TelegramSticker;
  video?: TelegramVideo;
  video_note?: TelegramVideoNote;
  voice?: TelegramVoice;
  caption?: string;
  contact?: TelegramContact;
  dice?: any;
  game_high_score?: any;
  location?: TelegramLocation;
  new_chat_members?: TelegramUser[];
  left_chat_member?: TelegramUser;
  new_chat_title?: string;
  new_chat_photo?: TelegramPhotoSize[];
  delete_chat_photo?: boolean;
  group_chat_created?: boolean;
  supergroup_chat_created?: boolean;
  channel_chat_created?: boolean;
  migrate_to_chat_id?: number;
  migrate_from_chat_id?: number;
  pinned_message?: TelegramMessage;
}

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo?: any;
  bio?: string;
  description?: string;
  invite_link?: string;
  pinned_message?: TelegramMessage;
  permissions?: any;
  slow_mode_delay?: number;
  sticker_set_name?: string;
  can_set_sticker_set?: boolean;
  linked_chat_id?: number;
  location?: any;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  inline_message_id?: string;
  chat_instance: string;
  data?: string;
  game_short_name?: string;
}

export interface TelegramMessageEntity {
  type: string;
  offset: number;
  length: number;
  url?: string;
  user?: TelegramUser;
  language?: string;
}

export interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

export interface TelegramDocument {
  file_id: string;
  file_unique_id: string;
  thumb?: TelegramPhotoSize;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramAudio {
  file_id: string;
  file_unique_id: string;
  duration: number;
  performer?: string;
  title?: string;
  mime_type?: string;
  file_size?: number;
  thumb?: TelegramPhotoSize;
}

export interface TelegramVideo {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  duration: number;
  thumb?: TelegramPhotoSize;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramVoice {
  file_id: string;
  file_unique_id: string;
  duration: number;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramVideoNote {
  file_id: string;
  file_unique_id: string;
  length: number;
  duration: number;
  thumb?: TelegramPhotoSize;
  file_size?: number;
}

export interface TelegramAnimation {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  duration: number;
  thumb?: TelegramPhotoSize;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramSticker {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  is_animated: boolean;
  thumb?: TelegramPhotoSize;
  emoji?: string;
  set_name?: string;
  mask_position?: any;
  file_size?: number;
}

export interface TelegramContact {
  phone_number: string;
  first_name: string;
  last_name?: string;
  user_id?: number;
  vcard?: string;
}

export interface TelegramLocation {
  longitude: number;
  latitude: number;
  live_period?: number;
  heading?: number;
  proximity_alert_radius?: number;
}

export class TelegramAdapter extends BasePlatformAdapter {
  readonly platform = 'telegram';
  readonly version = '6.9';
  
  private readonly baseUrl = 'https://api.telegram.org';
  private readonly maxRetries = 3;
  private readonly requestTimeout = 30000; // 30 seconds
  
  constructor(correlationId?: string) {
    super(correlationId);
  }
  
  /**
   * Setup Telegram webhook
   */
  async setupWebhook(config: TelegramConfig): Promise<WebhookSetupResult> {
    try {
      this.validateConfig(config, ['botToken']);
      
      const botToken = config.credentials.botToken;
      const webhookUrl = config.webhookUrl!;
      const webhookSecret = config.settings.webhookSecret;
      
      // Test bot token first
      const botInfo = await this.getBotInfo(botToken);
      if (!botInfo) {
        return {
          success: false,
          error: 'Invalid bot token or bot not accessible'
        };
      }
      
      // Setup webhook
      const webhookParams: any = {
        url: webhookUrl,
        allowed_updates: config.settings.allowedUpdates || ['message', 'callback_query'],
        drop_pending_updates: config.settings.dropPendingUpdates || true,
        max_connections: Math.min(config.settings.maxConnections || 40, 100)
      };
      
      if (webhookSecret) {
        webhookParams.secret_token = webhookSecret;
      }
      
      const response = await this.makeApiCall(botToken, 'setWebhook', webhookParams);
      
      if (!response.ok) {
        return {
          success: false,
          error: response.description || 'Failed to setup webhook',
          details: response
        };
      }
      
      // Verify webhook setup
      const webhookInfo = await this.getWebhookInfo(botToken);
      
      return {
        success: true,
        webhookUrl: webhookInfo.url,
        details: {
          botInfo,
          webhookInfo,
          pendingUpdateCount: webhookInfo.pending_update_count
        }
      };
      
    } catch (error) {
      this.logger.error('Telegram webhook setup failed:', {
        correlationId: this.correlationId,
        error: error instanceof Error ? error.message : String(error),
        agentId: config.agentId
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
  
  /**
   * Process inbound Telegram update
   */
  async processInbound(payload: WebhookPayload): Promise<InboundMessage> {
    try {
      const update: TelegramUpdate = payload.data;
      
      // Validate update structure
      if (!update.update_id) {
        throw this.createError('INVALID_UPDATE', 'Missing update_id in Telegram update');
      }
      
      // Extract message from different update types
      const message = update.message || 
                     update.edited_message || 
                     update.channel_post || 
                     update.edited_channel_post;
      
      if (!message) {
        // Handle callback queries
        if (update.callback_query) {
          return this.processCallbackQuery(update.callback_query, payload.agentId);
        }
        
        throw this.createError('UNSUPPORTED_UPDATE', 'Unsupported update type');
      }
      
      // Convert to standardized message format
      return this.convertToInboundMessage(message, payload.agentId, update.update_id);
      
    } catch (error) {
      this.logger.error('Failed to process Telegram inbound message:', {
        correlationId: this.correlationId,
        error: error instanceof Error ? error.message : String(error),
        agentId: payload.agentId,
        updateId: payload.data?.update_id
      });
      
      throw error;
    }
  }
  
  /**
   * Send outbound message to Telegram
   */
  async sendOutbound(message: OutboundMessage): Promise<SendResult> {
    try {
      // Get bot token from agent configuration
      const botToken = await this.getBotTokenForAgent(message.agentId);
      if (!botToken) {
        throw this.createError('MISSING_TOKEN', 'Bot token not found for agent');
      }
      
      // Convert message to Telegram format
      const telegramMessage = this.convertToTelegramMessage(message);
      
      // Send message with retry logic
      const response = await this.sendMessageWithRetry(botToken, telegramMessage);
      
      if (!response.ok) {
        const error = this.createTelegramError(response);
        return {
          success: false,
          error
        };
      }
      
      return {
        success: true,
        messageId: message.id,
        platformMessageId: response.result.message_id.toString(),
        deliveredAt: new Date()
      };
      
    } catch (error) {
      this.logger.error('Failed to send Telegram outbound message:', {
        correlationId: this.correlationId,
        error: error instanceof Error ? error.message : String(error),
        messageId: message.id,
        agentId: message.agentId
      });
      
      return {
        success: false,
        error: error instanceof Error ? 
          this.createError('SEND_FAILED', error.message, true) :
          this.createError('SEND_FAILED', 'Unknown error occurred', true)
      };
    }
  }
  
  /**
   * Validate Telegram webhook signature
   */
  validateWebhook(payload: any, signature?: string): boolean {
    try {
      // If no signature provided, validation passes (optional security)
      if (!signature) {
        return true;
      }
      
      // Get webhook secret from configuration
      const webhookSecret = this.getWebhookSecret(payload.agentId);
      if (!webhookSecret) {
        return true; // No secret configured, skip validation
      }
      
      // Calculate expected signature
      const payloadString = JSON.stringify(payload);
      const expectedSignature = createHmac('sha256', webhookSecret)
        .update(payloadString)
        .digest('hex');
      
      // Compare signatures
      return signature === expectedSignature;
      
    } catch (error) {
      this.logger.error('Telegram webhook validation failed:', {
        correlationId: this.correlationId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return false;
    }
  }
  
  /**
   * Get Telegram rate limiting information
   */
  getRateLimit(): RateLimitInfo {
    return {
      requestsPerSecond: 30,
      requestsPerMinute: 1800,
      requestsPerHour: 108000,
      burstLimit: 30,
      windowSize: 1000 // 1 second
    };
  }
  
  /**
   * Test Telegram bot connection
   */
  async testConnection(config: TelegramConfig): Promise<boolean> {
    try {
      this.validateConfig(config, ['botToken']);
      
      const botInfo = await this.getBotInfo(config.credentials.botToken);
      return botInfo !== null;
      
    } catch (error) {
      this.logger.error('Telegram connection test failed:', {
        correlationId: this.correlationId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return false;
    }
  }
  
  /**
   * Get Telegram platform capabilities
   */
  getCapabilities(): PlatformCapabilities {
    return {
      supportsMedia: true,
      supportsLocation: true,
      supportsContacts: true,
      supportsFiles: true,
      supportsTemplates: false,
      supportsButtons: true,
      supportsCarousels: false,
      maxMessageLength: 4096,
      maxFileSize: 50 * 1024 * 1024, // 50MB
      supportedMediaTypes: [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/avi', 'video/mov',
        'audio/mp3', 'audio/wav', 'audio/ogg',
        'application/pdf', 'application/zip'
      ],
      supportedMessageTypes: ['text', 'image', 'document', 'audio', 'video', 'location', 'contact', 'sticker']
    };
  }
  
  /**
   * Cleanup Telegram webhook
   */
  async cleanup(config: PlatformConfig): Promise<void> {
    try {
      const telegramConfig = config as TelegramConfig;
      const botToken = telegramConfig.credentials.botToken;
      
      // Delete webhook
      await this.makeApiCall(botToken, 'deleteWebhook', { drop_pending_updates: true });
      
      this.logger.info('Telegram webhook cleaned up successfully:', {
        correlationId: this.correlationId,
        agentId: config.agentId
      });
      
    } catch (error) {
      this.logger.error('Failed to cleanup Telegram webhook:', {
        correlationId: this.correlationId,
        error: error instanceof Error ? error.message : String(error),
        agentId: config.agentId
      });
    }
  }
  
  // Private helper methods
  
  private async getBotInfo(botToken: string): Promise<TelegramUser | null> {
    try {
      const response = await this.makeApiCall(botToken, 'getMe');
      return response.ok ? response.result : null;
    } catch (error) {
      return null;
    }
  }
  
  private async getWebhookInfo(botToken: string): Promise<any> {
    const response = await this.makeApiCall(botToken, 'getWebhookInfo');
    return response.result;
  }
  
  private async makeApiCall(botToken: string, method: string, params?: any): Promise<any> {
    const url = `${this.baseUrl}/bot${botToken}/${method}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: params ? JSON.stringify(params) : undefined,
      signal: AbortSignal.timeout(this.requestTimeout)
    });
    
    return await response.json();
  }
  
  private convertToInboundMessage(
    message: TelegramMessage, 
    agentId: string, 
    updateId: number
  ): InboundMessage {
    const messageId = this.generateMessageId(this.platform, message.message_id.toString());
    const conversationId = this.extractConversationId(this.platform, message.chat.id.toString());
    
    // Extract message content
    const content = this.extractMessageContent(message);
    const metadata = this.extractMessageMetadata(message);
    
    return {
      id: messageId,
      platform: this.platform,
      platformMessageId: message.message_id.toString(),
      agentId,
      conversationId,
      senderId: message.from?.id.toString() || message.chat.id.toString(),
      senderName: this.getSenderName(message.from),
      content,
      metadata,
      timestamp: new Date(message.date * 1000),
      correlationId: this.generateCorrelationId()
    };
  }
  
  private extractMessageContent(message: TelegramMessage): MessageContent {
    // Handle different message types
    if (message.text) {
      return {
        type: 'text',
        text: message.text
      };
    }
    
    if (message.photo && message.photo.length > 0) {
      const photo = message.photo[message.photo.length - 1]; // Get highest resolution
      return {
        type: 'image',
        mediaUrl: photo.file_id,
        caption: message.caption
      };
    }
    
    if (message.document) {
      return {
        type: 'document',
        mediaUrl: message.document.file_id,
        fileName: message.document.file_name,
        fileSize: message.document.file_size,
        mediaType: message.document.mime_type,
        caption: message.caption
      };
    }
    
    if (message.audio) {
      return {
        type: 'audio',
        mediaUrl: message.audio.file_id,
        mediaType: message.audio.mime_type,
        caption: message.caption
      };
    }
    
    if (message.video) {
      return {
        type: 'video',
        mediaUrl: message.video.file_id,
        mediaType: message.video.mime_type,
        caption: message.caption
      };
    }
    
    if (message.voice) {
      return {
        type: 'audio',
        mediaUrl: message.voice.file_id,
        mediaType: message.voice.mime_type
      };
    }
    
    if (message.location) {
      return {
        type: 'location',
        location: {
          latitude: message.location.latitude,
          longitude: message.location.longitude
        }
      };
    }
    
    if (message.contact) {
      return {
        type: 'contact',
        contact: {
          name: message.contact.first_name + (message.contact.last_name ? ` ${message.contact.last_name}` : ''),
          phone: message.contact.phone_number
        }
      };
    }
    
    if (message.sticker) {
      return {
        type: 'sticker',
        mediaUrl: message.sticker.file_id
      };
    }
    
    // Default to text for unsupported types
    return {
      type: 'text',
      text: '[Unsupported message type]'
    };
  }
  
  private extractMessageMetadata(message: TelegramMessage): MessageMetadata {
    const metadata: MessageMetadata = {
      platformSpecific: {
        messageId: message.message_id,
        chatType: message.chat.type,
        chatId: message.chat.id
      }
    };
    
    // Handle forwarded messages
    if (message.forward_from || message.forward_from_chat) {
      metadata.isForwarded = true;
      metadata.platformSpecific.forwardInfo = {
        from: message.forward_from,
        fromChat: message.forward_from_chat,
        date: message.forward_date
      };
    }
    
    // Handle replies
    if (message.reply_to_message) {
      metadata.isReply = true;
      metadata.originalMessageId = message.reply_to_message.message_id.toString();
    }
    
    // Extract entities (mentions, hashtags, etc.)
    if (message.entities) {
      metadata.entities = message.entities.map(entity => ({
        type: this.mapTelegramEntityType(entity.type),
        offset: entity.offset,
        length: entity.length,
        value: entity.url || (entity.user ? `@${entity.user.username}` : undefined)
      }));
      
      // Extract mentions and hashtags
      metadata.mentions = message.entities
        .filter(e => e.type === 'mention' || e.type === 'text_mention')
        .map(e => e.user?.username || message.text?.substring(e.offset + 1, e.offset + e.length))
        .filter(Boolean) as string[];
      
      metadata.hashtags = message.entities
        .filter(e => e.type === 'hashtag')
        .map(e => message.text?.substring(e.offset + 1, e.offset + e.length))
        .filter(Boolean) as string[];
    }
    
    return metadata;
  }
  
  private mapTelegramEntityType(telegramType: string): any {
    const typeMap: Record<string, any> = {
      'mention': 'mention',
      'text_mention': 'mention',
      'hashtag': 'hashtag',
      'url': 'url',
      'email': 'email',
      'phone_number': 'phone',
      'bold': 'bold',
      'italic': 'italic',
      'code': 'code'
    };
    
    return typeMap[telegramType] || telegramType;
  }
  
  private getSenderName(user?: TelegramUser): string | undefined {
    if (!user) return undefined;
    
    let name = user.first_name;
    if (user.last_name) {
      name += ` ${user.last_name}`;
    }
    if (user.username) {
      name += ` (@${user.username})`;
    }
    
    return name;
  }
  
  private processCallbackQuery(callbackQuery: TelegramCallbackQuery, agentId: string): InboundMessage {
    const messageId = this.generateMessageId(this.platform, callbackQuery.id);
    const conversationId = this.extractConversationId(
      this.platform, 
      callbackQuery.from.id.toString()
    );
    
    return {
      id: messageId,
      platform: this.platform,
      platformMessageId: callbackQuery.id,
      agentId,
      conversationId,
      senderId: callbackQuery.from.id.toString(),
      senderName: this.getSenderName(callbackQuery.from),
      content: {
        type: 'text',
        text: callbackQuery.data || '[Button clicked]'
      },
      metadata: {
        platformSpecific: {
          callbackQuery: true,
          chatInstance: callbackQuery.chat_instance,
          messageId: callbackQuery.message?.message_id
        }
      },
      timestamp: new Date(),
      correlationId: this.generateCorrelationId()
    };
  }
  
  private convertToTelegramMessage(message: OutboundMessage): any {
    const telegramMessage: any = {
      chat_id: message.recipientId,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    };
    
    // Handle different content types
    switch (message.content.type) {
      case 'text':
        telegramMessage.text = message.content.text;
        break;
        
      case 'image':
        telegramMessage.photo = message.content.mediaUrl;
        if (message.content.caption) {
          telegramMessage.caption = message.content.caption;
        }
        break;
        
      case 'document':
        telegramMessage.document = message.content.mediaUrl;
        if (message.content.caption) {
          telegramMessage.caption = message.content.caption;
        }
        break;
        
      case 'audio':
        telegramMessage.audio = message.content.mediaUrl;
        break;
        
      case 'video':
        telegramMessage.video = message.content.mediaUrl;
        if (message.content.caption) {
          telegramMessage.caption = message.content.caption;
        }
        break;
        
      case 'location':
        telegramMessage.latitude = message.content.location?.latitude;
        telegramMessage.longitude = message.content.location?.longitude;
        break;
        
      default:
        telegramMessage.text = message.content.text || '[Unsupported message type]';
    }
    
    // Handle reply
    if (message.replyToMessageId) {
      telegramMessage.reply_to_message_id = parseInt(message.replyToMessageId);
    }
    
    return telegramMessage;
  }
  
  private async sendMessageWithRetry(botToken: string, message: any): Promise<any> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // Determine the API method based on message content
        let method = 'sendMessage';
        if (message.photo) method = 'sendPhoto';
        else if (message.document) method = 'sendDocument';
        else if (message.audio) method = 'sendAudio';
        else if (message.video) method = 'sendVideo';
        else if (message.latitude && message.longitude) method = 'sendLocation';
        
        const response = await this.makeApiCall(botToken, method, message);
        
        if (response.ok) {
          return response;
        }
        
        // Handle rate limiting
        if (response.error_code === 429) {
          const retryAfter = response.parameters?.retry_after || Math.pow(2, attempt);
          await this.sleep(retryAfter * 1000);
          continue;
        }
        
        // Don't retry certain errors
        if (response.error_code === 400 || response.error_code === 403) {
          return response;
        }
        
        lastError = response;
        
        // Wait before retry
        if (attempt < this.maxRetries) {
          await this.sleep(this.calculateRetryDelay({ code: 'API_ERROR', message: 'API call failed', platform: this.platform, isRetryable: true }, attempt));
        }
        
      } catch (error) {
        lastError = error;
        
        if (attempt < this.maxRetries) {
          await this.sleep(this.calculateRetryDelay({ code: 'NETWORK_ERROR', message: 'Network error', platform: this.platform, isRetryable: true }, attempt));
        }
      }
    }
    
    throw lastError;
  }
  
  private createTelegramError(response: any): PlatformError {
    const isRetryable = response.error_code >= 500 || response.error_code === 429;
    
    return this.createError(
      `TELEGRAM_${response.error_code}`,
      response.description || 'Telegram API error',
      isRetryable,
      {
        errorCode: response.error_code,
        parameters: response.parameters
      }
    );
  }
  
  private async getBotTokenForAgent(agentId: string): Promise<string | null> {
    // This would typically fetch from database
    // For now, return environment variable or null
    return process.env.TELEGRAM_BOT_TOKEN || null;
  }
  
  private getWebhookSecret(agentId: string): string | null {
    // This would typically fetch from database
    // For now, return environment variable or null
    return process.env.TELEGRAM_WEBHOOK_SECRET || null;
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
