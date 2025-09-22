/**
 * Platform Adapter Interface and Base Types
 * Defines the contract for all messaging platform integrations
 */

// Core message types
export interface InboundMessage {
  id: string;
  platform: string;
  platformMessageId: string;
  agentId: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  content: MessageContent;
  metadata: MessageMetadata;
  timestamp: Date;
  correlationId: string;
}

export interface OutboundMessage {
  id: string;
  platform: string;
  agentId: string;
  conversationId: string;
  recipientId: string;
  content: MessageContent;
  metadata: MessageMetadata;
  replyToMessageId?: string;
  correlationId: string;
}

export interface MessageContent {
  type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'contact' | 'sticker';
  text?: string;
  mediaUrl?: string;
  mediaType?: string;
  fileName?: string;
  fileSize?: number;
  caption?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  contact?: {
    name: string;
    phone?: string;
    email?: string;
  };
}

export interface MessageMetadata {
  isForwarded?: boolean;
  isReply?: boolean;
  originalMessageId?: string;
  mentions?: string[];
  hashtags?: string[];
  entities?: MessageEntity[];
  platformSpecific?: Record<string, any>;
}

export interface MessageEntity {
  type: 'mention' | 'hashtag' | 'url' | 'email' | 'phone' | 'bold' | 'italic' | 'code';
  offset: number;
  length: number;
  value?: string;
}

// Platform configuration types
export interface PlatformConfig {
  agentId: string;
  platform: string;
  credentials: Record<string, any>;
  settings: Record<string, any>;
  webhookUrl?: string;
  webhookSecret?: string;
}

export interface WebhookSetupResult {
  success: boolean;
  webhookUrl?: string;
  webhookId?: string;
  error?: string;
  details?: Record<string, any>;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  platformMessageId?: string;
  deliveredAt?: Date;
  error?: PlatformError;
  retryAfter?: number;
}

export interface WebhookPayload {
  platform: string;
  agentId: string;
  signature?: string;
  timestamp: number;
  data: any;
  headers: Record<string, string>;
}

// Rate limiting and error types
export interface RateLimitInfo {
  requestsPerSecond: number;
  requestsPerMinute: number;
  requestsPerHour: number;
  burstLimit: number;
  windowSize: number;
}

export interface PlatformError {
  code: string;
  message: string;
  platform: string;
  isRetryable: boolean;
  retryAfter?: number;
  details?: Record<string, any>;
  correlationId?: string;
}

export interface ErrorResponse {
  handled: boolean;
  shouldRetry: boolean;
  retryAfter?: number;
  escalate?: boolean;
}

// Platform adapter interface
export interface PlatformAdapter {
  readonly platform: string;
  readonly version: string;
  
  /**
   * Setup webhook for the platform
   */
  setupWebhook(config: PlatformConfig): Promise<WebhookSetupResult>;
  
  /**
   * Process inbound webhook payload
   */
  processInbound(payload: WebhookPayload): Promise<InboundMessage>;
  
  /**
   * Send outbound message
   */
  sendOutbound(message: OutboundMessage): Promise<SendResult>;
  
  /**
   * Validate webhook signature/authenticity
   */
  validateWebhook(payload: any, signature?: string): boolean;
  
  /**
   * Get rate limiting information for this platform
   */
  getRateLimit(): RateLimitInfo;
  
  /**
   * Handle platform-specific errors
   */
  handleError(error: PlatformError): Promise<ErrorResponse>;
  
  /**
   * Test platform connection/credentials
   */
  testConnection(config: PlatformConfig): Promise<boolean>;
  
  /**
   * Get platform capabilities
   */
  getCapabilities(): PlatformCapabilities;
  
  /**
   * Cleanup resources (webhooks, connections, etc.)
   */
  cleanup(config: PlatformConfig): Promise<void>;
}

export interface PlatformCapabilities {
  supportsMedia: boolean;
  supportsLocation: boolean;
  supportsContacts: boolean;
  supportsFiles: boolean;
  supportsTemplates: boolean;
  supportsButtons: boolean;
  supportsCarousels: boolean;
  maxMessageLength: number;
  maxFileSize: number;
  supportedMediaTypes: string[];
  supportedMessageTypes: MessageContent['type'][];
}

// Base adapter class with common functionality
export abstract class BasePlatformAdapter implements PlatformAdapter {
  abstract readonly platform: string;
  abstract readonly version: string;
  
  protected logger: Console = console;
  protected correlationId?: string;
  
  constructor(correlationId?: string) {
    this.correlationId = correlationId;
  }
  
  abstract setupWebhook(config: PlatformConfig): Promise<WebhookSetupResult>;
  abstract processInbound(payload: WebhookPayload): Promise<InboundMessage>;
  abstract sendOutbound(message: OutboundMessage): Promise<SendResult>;
  abstract validateWebhook(payload: any, signature?: string): boolean;
  abstract getRateLimit(): RateLimitInfo;
  abstract testConnection(config: PlatformConfig): Promise<boolean>;
  abstract getCapabilities(): PlatformCapabilities;
  
  /**
   * Default error handling implementation
   */
  async handleError(error: PlatformError): Promise<ErrorResponse> {
    this.logger.error(`Platform error in ${this.platform}:`, {
      correlationId: this.correlationId,
      error: error.message,
      code: error.code,
      isRetryable: error.isRetryable,
      details: error.details
    });
    
    // Default retry logic
    const shouldRetry = error.isRetryable && this.shouldRetryError(error);
    const retryAfter = error.retryAfter || this.calculateRetryDelay(error);
    
    return {
      handled: true,
      shouldRetry,
      retryAfter,
      escalate: !error.isRetryable && this.shouldEscalateError(error)
    };
  }
  
  /**
   * Default cleanup implementation
   */
  async cleanup(config: PlatformConfig): Promise<void> {
    this.logger.info(`Cleaning up ${this.platform} integration:`, {
      correlationId: this.correlationId,
      agentId: config.agentId,
      platform: config.platform
    });
    // Override in specific adapters for platform-specific cleanup
  }
  
  /**
   * Generate correlation ID for tracking
   */
  protected generateCorrelationId(): string {
    return this.correlationId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Standardize message ID format
   */
  protected generateMessageId(platform: string, platformMessageId: string): string {
    return `${platform}:${platformMessageId}:${Date.now()}`;
  }
  
  /**
   * Extract conversation ID from platform data
   */
  protected extractConversationId(platform: string, senderId: string, groupId?: string): string {
    const baseId = groupId || senderId;
    return `${platform}:${baseId}`;
  }
  
  /**
   * Validate required configuration fields
   */
  protected validateConfig(config: PlatformConfig, requiredFields: string[]): void {
    for (const field of requiredFields) {
      if (!config.credentials[field] && !config.settings[field]) {
        throw new Error(`Missing required configuration field: ${field}`);
      }
    }
  }
  
  /**
   * Create platform error
   */
  protected createError(
    code: string,
    message: string,
    isRetryable: boolean = false,
    details?: Record<string, any>
  ): PlatformError {
    return {
      code,
      message,
      platform: this.platform,
      isRetryable,
      details,
      correlationId: this.correlationId
    };
  }
  
  /**
   * Determine if error should be retried
   */
  protected shouldRetryError(error: PlatformError): boolean {
    // Don't retry authentication errors
    if (error.code.includes('AUTH') || error.code.includes('UNAUTHORIZED')) {
      return false;
    }
    
    // Don't retry validation errors
    if (error.code.includes('VALIDATION') || error.code.includes('BAD_REQUEST')) {
      return false;
    }
    
    // Retry rate limit and server errors
    return error.isRetryable;
  }
  
  /**
   * Calculate retry delay with exponential backoff
   */
  protected calculateRetryDelay(error: PlatformError, attempt: number = 1): number {
    if (error.retryAfter) {
      return error.retryAfter * 1000; // Convert to milliseconds
    }
    
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 60s
    const baseDelay = 1000;
    const maxDelay = 60000;
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return delay + jitter;
  }
  
  /**
   * Determine if error should be escalated
   */
  protected shouldEscalateError(error: PlatformError): boolean {
    // Escalate authentication and authorization errors
    if (error.code.includes('AUTH') || error.code.includes('FORBIDDEN')) {
      return true;
    }
    
    // Escalate configuration errors
    if (error.code.includes('CONFIG') || error.code.includes('SETUP')) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Sanitize sensitive data for logging
   */
  protected sanitizeForLogging(data: any): any {
    const sensitiveFields = ['token', 'password', 'secret', 'key', 'credential'];
    
    if (typeof data !== 'object' || data === null) {
      return data;
    }
    
    const sanitized = { ...data };
    
    for (const key in sanitized) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeForLogging(sanitized[key]);
      }
    }
    
    return sanitized;
  }
}

// Platform adapter registry
export class PlatformAdapterRegistry {
  private static instance: PlatformAdapterRegistry;
  private adapters: Map<string, () => PlatformAdapter> = new Map();
  
  static getInstance(): PlatformAdapterRegistry {
    if (!PlatformAdapterRegistry.instance) {
      PlatformAdapterRegistry.instance = new PlatformAdapterRegistry();
    }
    return PlatformAdapterRegistry.instance;
  }
  
  register(platform: string, adapterFactory: () => PlatformAdapter): void {
    this.adapters.set(platform.toLowerCase(), adapterFactory);
  }
  
  get(platform: string): PlatformAdapter | null {
    const factory = this.adapters.get(platform.toLowerCase());
    return factory ? factory() : null;
  }
  
  getSupportedPlatforms(): string[] {
    return Array.from(this.adapters.keys());
  }
  
  isSupported(platform: string): boolean {
    return this.adapters.has(platform.toLowerCase());
  }
}

// Export types
export type {
  InboundMessage,
  OutboundMessage,
  MessageContent,
  MessageMetadata,
  MessageEntity,
  PlatformConfig,
  WebhookSetupResult,
  SendResult,
  WebhookPayload,
  RateLimitInfo,
  PlatformError,
  ErrorResponse,
  PlatformCapabilities
};
