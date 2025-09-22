/**
 * WhatsApp Business API Platform Adapter
 * Implements WhatsApp Business API integration with proper error handling
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
import { createHmac } from 'crypto';

// WhatsApp-specific types
export interface WhatsAppConfig extends PlatformConfig {
  credentials: {
    accessToken: string;
    phoneNumberId: string;
    businessAccountId: string;
    appId: string;
    appSecret: string;
  };
  settings: {
    webhookVerifyToken: string;
    apiVersion?: string;
    enableReadReceipts?: boolean;
    enableTypingIndicator?: boolean;
  };
}

export interface WhatsAppWebhookEntry {
  id: string;
  changes: WhatsAppChange[];
}

export interface WhatsAppChange {
  value: {
    messaging_product: string;
    metadata: {
      display_phone_number: string;
      phone_number_id: string;
    };
    contacts?: WhatsAppContact[];
    messages?: WhatsAppMessage[];
    statuses?: WhatsAppStatus[];
  };
  field: string;
}

export interface WhatsAppMessage {
  id: string;
  from: string;
  timestamp: string;
  type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'contacts' | 'button' | 'interactive';
  text?: {
    body: string;
  };
  image?: WhatsAppMedia;
  document?: WhatsAppMedia;
  audio?: WhatsAppMedia;
  video?: WhatsAppMedia;
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  contacts?: WhatsAppContactMessage[];
  button?: {
    text: string;
    payload: string;
  };
  interactive?: {
    type: 'button_reply' | 'list_reply';
    button_reply?: {
      id: string;
      title: string;
    };
    list_reply?: {
      id: string;
      title: string;
      description?: string;
    };
  };
  context?: {
    from: string;
    id: string;
  };
}

export interface WhatsAppMedia {
  id: string;
  mime_type: string;
  sha256: string;
  filename?: string;
  caption?: string;
}

export interface WhatsAppContact {
  profile: {
    name: string;
  };
  wa_id: string;
}

export interface WhatsAppContactMessage {
  addresses?: any[];
  birthday?: string;
  emails?: any[];
  name: {
    formatted_name: string;
    first_name?: string;
    last_name?: string;
    middle_name?: string;
    suffix?: string;
    prefix?: string;
  };
  org?: any;
  phones?: any[];
  urls?: any[];
}

export interface WhatsAppStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  conversation?: {
    id: string;
    expiration_timestamp?: string;
    origin: {
      type: string;
    };
  };
  pricing?: {
    billable: boolean;
    pricing_model: string;
    category: string;
  };
}

export interface WhatsAppSendMessageRequest {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: string;
  text?: {
    preview_url?: boolean;
    body: string;
  };
  image?: {
    id?: string;
    link?: string;
    caption?: string;
  };
  document?: {
    id?: string;
    link?: string;
    caption?: string;
    filename?: string;
  };
  audio?: {
    id?: string;
    link?: string;
  };
  video?: {
    id?: string;
    link?: string;
    caption?: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  contacts?: WhatsAppContactMessage[];
  context?: {
    message_id: string;
  };
}

export class WhatsAppAdapter extends BasePlatformAdapter {
  readonly platform = 'whatsapp';
  readonly version = '17.0';
  
  private readonly baseUrl = 'https://graph.facebook.com';
  private readonly maxRetries = 3;
  private readonly requestTimeout = 30000; // 30 seconds
  
  constructor(correlationId?: string) {
    super(correlationId);
  }
  
  /**
   * Setup WhatsApp webhook
   */
  async setupWebhook(config: WhatsAppConfig): Promise<WebhookSetupResult> {
    try {
      this.validateConfig(config, ['accessToken', 'phoneNumberId', 'businessAccountId', 'appId']);
      
      const { accessToken, phoneNumberId, businessAccountId, appId } = config.credentials;
      const webhookUrl = config.webhookUrl!;
      const verifyToken = config.settings.webhookVerifyToken;
      
      // Test access token and phone number
      const phoneNumberInfo = await this.getPhoneNumberInfo(phoneNumberId, accessToken);
      if (!phoneNumberInfo) {
        return {
          success: false,
          error: 'Invalid access token or phone number ID'
        };
      }
      
      // Setup webhook subscription
      const subscriptionResult = await this.setupWebhookSubscription(
        appId,
        accessToken,
        webhookUrl,
        verifyToken
      );
      
      if (!subscriptionResult.success) {
        return subscriptionResult;
      }
      
      return {
        success: true,
        webhookUrl,
        details: {
          phoneNumberInfo,
          subscriptionId: subscriptionResult.details?.subscriptionId
        }
      };
      
    } catch (error) {
      this.logger.error('WhatsApp webhook setup failed:', {
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
   * Process inbound WhatsApp webhook
   */
  async processInbound(payload: WebhookPayload): Promise<InboundMessage> {
    try {
      const webhookData = payload.data;
      
      // Validate webhook structure
      if (!webhookData.entry || !Array.isArray(webhookData.entry)) {
        throw this.createError('INVALID_WEBHOOK', 'Invalid WhatsApp webhook structure');
      }
      
      // Process the first entry with messages
      const entry = webhookData.entry.find((e: WhatsAppWebhookEntry) => 
        e.changes?.some(c => c.value.messages && c.value.messages.length > 0)
      );
      
      if (!entry) {
        throw this.createError('NO_MESSAGES', 'No messages found in webhook');
      }
      
      // Get the first message from the first change
      const change = entry.changes.find(c => c.value.messages && c.value.messages.length > 0);
      const message = change!.value.messages![0];
      const contact = change!.value.contacts?.[0];
      
      // Convert to standardized message format
      return this.convertToInboundMessage(message, contact, payload.agentId);
      
    } catch (error) {
      this.logger.error('Failed to process WhatsApp inbound message:', {
        correlationId: this.correlationId,
        error: error instanceof Error ? error.message : String(error),
        agentId: payload.agentId
      });
      
      throw error;
    }
  }
  
  /**
   * Send outbound message to WhatsApp
   */
  async sendOutbound(message: OutboundMessage): Promise<SendResult> {
    try {
      // Get access token and phone number ID from agent configuration
      const config = await this.getConfigForAgent(message.agentId);
      if (!config) {
        throw this.createError('MISSING_CONFIG', 'WhatsApp configuration not found for agent');
      }
      
      // Convert message to WhatsApp format
      const whatsappMessage = this.convertToWhatsAppMessage(message);
      
      // Send message with retry logic
      const response = await this.sendMessageWithRetry(
        config.phoneNumberId,
        config.accessToken,
        whatsappMessage
      );
      
      if (!response.messages || response.messages.length === 0) {
        throw this.createError('SEND_FAILED', 'No message ID returned from WhatsApp API');
      }
      
      return {
        success: true,
        messageId: message.id,
        platformMessageId: response.messages[0].id,
        deliveredAt: new Date()
      };
      
    } catch (error) {
      this.logger.error('Failed to send WhatsApp outbound message:', {
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
   * Validate WhatsApp webhook signature
   */
  validateWebhook(payload: any, signature?: string): boolean {
    try {
      // WhatsApp uses X-Hub-Signature-256 header
      if (!signature) {
        return false;
      }
      
      // Get app secret from configuration
      const appSecret = this.getAppSecret(payload.agentId);
      if (!appSecret) {
        this.logger.warn('No app secret configured for WhatsApp webhook validation');
        return false;
      }
      
      // Calculate expected signature
      const payloadString = JSON.stringify(payload);
      const expectedSignature = 'sha256=' + createHmac('sha256', appSecret)
        .update(payloadString)
        .digest('hex');
      
      // Compare signatures
      return signature === expectedSignature;
      
    } catch (error) {
      this.logger.error('WhatsApp webhook validation failed:', {
        correlationId: this.correlationId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return false;
    }
  }
  
  /**
   * Get WhatsApp rate limiting information
   */
  getRateLimit(): RateLimitInfo {
    return {
      requestsPerSecond: 80, // 80 messages per second per phone number
      requestsPerMinute: 4800,
      requestsPerHour: 288000,
      burstLimit: 80,
      windowSize: 1000 // 1 second
    };
  }
  
  /**
   * Test WhatsApp connection
   */
  async testConnection(config: WhatsAppConfig): Promise<boolean> {
    try {
      this.validateConfig(config, ['accessToken', 'phoneNumberId']);
      
      const phoneNumberInfo = await this.getPhoneNumberInfo(
        config.credentials.phoneNumberId,
        config.credentials.accessToken
      );
      
      return phoneNumberInfo !== null;
      
    } catch (error) {
      this.logger.error('WhatsApp connection test failed:', {
        correlationId: this.correlationId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return false;
    }
  }
  
  /**
   * Get WhatsApp platform capabilities
   */
  getCapabilities(): PlatformCapabilities {
    return {
      supportsMedia: true,
      supportsLocation: true,
      supportsContacts: true,
      supportsFiles: true,
      supportsTemplates: true,
      supportsButtons: true,
      supportsCarousels: true,
      maxMessageLength: 4096,
      maxFileSize: 100 * 1024 * 1024, // 100MB
      supportedMediaTypes: [
        'image/jpeg', 'image/png', 'image/webp',
        'video/mp4', 'video/3gpp',
        'audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/amr', 'audio/ogg',
        'application/pdf', 'application/vnd.ms-powerpoint', 'application/msword',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ],
      supportedMessageTypes: ['text', 'image', 'document', 'audio', 'video', 'location', 'contact']
    };
  }
  
  /**
   * Cleanup WhatsApp webhook
   */
  async cleanup(config: PlatformConfig): Promise<void> {
    try {
      const whatsappConfig = config as WhatsAppConfig;
      const { appId, accessToken } = whatsappConfig.credentials;
      
      // Remove webhook subscription
      await this.removeWebhookSubscription(appId, accessToken);
      
      this.logger.info('WhatsApp webhook cleaned up successfully:', {
        correlationId: this.correlationId,
        agentId: config.agentId
      });
      
    } catch (error) {
      this.logger.error('Failed to cleanup WhatsApp webhook:', {
        correlationId: this.correlationId,
        error: error instanceof Error ? error.message : String(error),
        agentId: config.agentId
      });
    }
  }
  
  // Private helper methods
  
  private async getPhoneNumberInfo(phoneNumberId: string, accessToken: string): Promise<any> {
    try {
      const url = `${this.baseUrl}/v${this.version}/${phoneNumberId}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(this.requestTimeout)
      });
      
      if (!response.ok) {
        return null;
      }
      
      return await response.json();
    } catch (error) {
      return null;
    }
  }
  
  private async setupWebhookSubscription(
    appId: string,
    accessToken: string,
    webhookUrl: string,
    verifyToken: string
  ): Promise<WebhookSetupResult> {
    try {
      const url = `${this.baseUrl}/v${this.version}/${appId}/subscriptions`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          object: 'whatsapp_business_account',
          callback_url: webhookUrl,
          verify_token: verifyToken,
          fields: ['messages']
        }),
        signal: AbortSignal.timeout(this.requestTimeout)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: result.error?.message || 'Failed to setup webhook subscription'
        };
      }
      
      return {
        success: true,
        details: {
          subscriptionId: result.id
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
  
  private async removeWebhookSubscription(appId: string, accessToken: string): Promise<void> {
    try {
      const url = `${this.baseUrl}/v${this.version}/${appId}/subscriptions`;
      
      await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          object: 'whatsapp_business_account'
        }),
        signal: AbortSignal.timeout(this.requestTimeout)
      });
      
    } catch (error) {
      // Log but don't throw - cleanup is best effort
      this.logger.error('Failed to remove WhatsApp webhook subscription:', {
        correlationId: this.correlationId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  private convertToInboundMessage(
    message: WhatsAppMessage,
    contact: WhatsAppContact | undefined,
    agentId: string
  ): InboundMessage {
    const messageId = this.generateMessageId(this.platform, message.id);
    const conversationId = this.extractConversationId(this.platform, message.from);
    
    // Extract message content
    const content = this.extractMessageContent(message);
    const metadata = this.extractMessageMetadata(message);
    
    return {
      id: messageId,
      platform: this.platform,
      platformMessageId: message.id,
      agentId,
      conversationId,
      senderId: message.from,
      senderName: contact?.profile?.name,
      content,
      metadata,
      timestamp: new Date(parseInt(message.timestamp) * 1000),
      correlationId: this.generateCorrelationId()
    };
  }
  
  private extractMessageContent(message: WhatsAppMessage): MessageContent {
    switch (message.type) {
      case 'text':
        return {
          type: 'text',
          text: message.text?.body || ''
        };
        
      case 'image':
        return {
          type: 'image',
          mediaUrl: message.image?.id,
          mediaType: message.image?.mime_type,
          caption: message.image?.caption
        };
        
      case 'document':
        return {
          type: 'document',
          mediaUrl: message.document?.id,
          mediaType: message.document?.mime_type,
          fileName: message.document?.filename,
          caption: message.document?.caption
        };
        
      case 'audio':
        return {
          type: 'audio',
          mediaUrl: message.audio?.id,
          mediaType: message.audio?.mime_type
        };
        
      case 'video':
        return {
          type: 'video',
          mediaUrl: message.video?.id,
          mediaType: message.video?.mime_type,
          caption: message.video?.caption
        };
        
      case 'location':
        return {
          type: 'location',
          location: {
            latitude: message.location!.latitude,
            longitude: message.location!.longitude,
            address: message.location?.address
          }
        };
        
      case 'contacts':
        if (message.contacts && message.contacts.length > 0) {
          const contact = message.contacts[0];
          return {
            type: 'contact',
            contact: {
              name: contact.name.formatted_name,
              phone: contact.phones?.[0]?.phone,
              email: contact.emails?.[0]?.email
            }
          };
        }
        break;
        
      case 'button':
        return {
          type: 'text',
          text: message.button?.text || '[Button clicked]'
        };
        
      case 'interactive':
        const interactiveText = message.interactive?.button_reply?.title || 
                               message.interactive?.list_reply?.title || 
                               '[Interactive element]';
        return {
          type: 'text',
          text: interactiveText
        };
    }
    
    return {
      type: 'text',
      text: '[Unsupported message type]'
    };
  }
  
  private extractMessageMetadata(message: WhatsAppMessage): MessageMetadata {
    const metadata: MessageMetadata = {
      platformSpecific: {
        messageId: message.id,
        messageType: message.type,
        timestamp: message.timestamp
      }
    };
    
    // Handle replies
    if (message.context) {
      metadata.isReply = true;
      metadata.originalMessageId = message.context.id;
      metadata.platformSpecific.contextFrom = message.context.from;
    }
    
    // Handle interactive elements
    if (message.button || message.interactive) {
      metadata.platformSpecific.interactive = true;
      
      if (message.button) {
        metadata.platformSpecific.buttonPayload = message.button.payload;
      }
      
      if (message.interactive) {
        metadata.platformSpecific.interactiveType = message.interactive.type;
        metadata.platformSpecific.interactiveId = 
          message.interactive.button_reply?.id || message.interactive.list_reply?.id;
      }
    }
    
    return metadata;
  }
  
  private convertToWhatsAppMessage(message: OutboundMessage): WhatsAppSendMessageRequest {
    const whatsappMessage: WhatsAppSendMessageRequest = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: message.recipientId,
      type: message.content.type
    };
    
    // Handle different content types
    switch (message.content.type) {
      case 'text':
        whatsappMessage.text = {
          body: message.content.text || '',
          preview_url: true
        };
        break;
        
      case 'image':
        whatsappMessage.image = {
          id: message.content.mediaUrl,
          caption: message.content.caption
        };
        break;
        
      case 'document':
        whatsappMessage.document = {
          id: message.content.mediaUrl,
          caption: message.content.caption,
          filename: message.content.fileName
        };
        break;
        
      case 'audio':
        whatsappMessage.audio = {
          id: message.content.mediaUrl
        };
        break;
        
      case 'video':
        whatsappMessage.video = {
          id: message.content.mediaUrl,
          caption: message.content.caption
        };
        break;
        
      case 'location':
        whatsappMessage.location = {
          latitude: message.content.location!.latitude,
          longitude: message.content.location!.longitude,
          name: message.content.location?.address,
          address: message.content.location?.address
        };
        break;
        
      case 'contact':
        if (message.content.contact) {
          whatsappMessage.contacts = [{
            name: {
              formatted_name: message.content.contact.name,
              first_name: message.content.contact.name.split(' ')[0]
            },
            phones: message.content.contact.phone ? [{
              phone: message.content.contact.phone,
              type: 'MAIN'
            }] : undefined,
            emails: message.content.contact.email ? [{
              email: message.content.contact.email,
              type: 'WORK'
            }] : undefined
          }];
        }
        break;
        
      default:
        // Fallback to text
        whatsappMessage.type = 'text';
        whatsappMessage.text = {
          body: message.content.text || '[Unsupported message type]'
        };
    }
    
    // Handle reply
    if (message.replyToMessageId) {
      whatsappMessage.context = {
        message_id: message.replyToMessageId
      };
    }
    
    return whatsappMessage;
  }
  
  private async sendMessageWithRetry(
    phoneNumberId: string,
    accessToken: string,
    message: WhatsAppSendMessageRequest
  ): Promise<any> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const url = `${this.baseUrl}/v${this.version}/${phoneNumberId}/messages`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(message),
          signal: AbortSignal.timeout(this.requestTimeout)
        });
        
        const result = await response.json();
        
        if (response.ok) {
          return result;
        }
        
        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after');
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;
          await this.sleep(delay);
          continue;
        }
        
        // Don't retry certain errors
        if (response.status === 400 || response.status === 403) {
          throw this.createWhatsAppError(result, response.status);
        }
        
        lastError = this.createWhatsAppError(result, response.status);
        
        // Wait before retry
        if (attempt < this.maxRetries) {
          await this.sleep(this.calculateRetryDelay(lastError, attempt));
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
  
  private createWhatsAppError(response: any, statusCode: number): PlatformError {
    const isRetryable = statusCode >= 500 || statusCode === 429;
    const errorCode = response.error?.code || statusCode;
    const errorMessage = response.error?.message || 'WhatsApp API error';
    
    return this.createError(
      `WHATSAPP_${errorCode}`,
      errorMessage,
      isRetryable,
      {
        statusCode,
        errorCode: response.error?.code,
        errorSubcode: response.error?.error_subcode,
        fbtraceId: response.error?.fbtrace_id
      }
    );
  }
  
  private async getConfigForAgent(agentId: string): Promise<{ phoneNumberId: string; accessToken: string } | null> {
    // This would typically fetch from database
    // For now, return environment variables or null
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    
    if (!phoneNumberId || !accessToken) {
      return null;
    }
    
    return { phoneNumberId, accessToken };
  }
  
  private getAppSecret(agentId: string): string | null {
    // This would typically fetch from database
    // For now, return environment variable or null
    return process.env.WHATSAPP_APP_SECRET || null;
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
