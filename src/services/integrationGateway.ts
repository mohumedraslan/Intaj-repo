/**
 * Integration Gateway Service
 * Manages multi-platform integrations with unified interface
 */

import { 
  PlatformAdapter, 
  PlatformAdapterRegistry,
  PlatformConfig,
  WebhookPayload,
  InboundMessage,
  OutboundMessage
} from '@/integrations/base/PlatformAdapter';
import { TelegramAdapter } from '@/integrations/telegram/TelegramAdapter';
import { WhatsAppAdapter } from '@/integrations/whatsapp/WhatsAppAdapter';
import { getMessageQueue, MessageQueue } from '@/lib/queue/MessageQueue';
import { ErrorFactory } from '@/lib/errors';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Integration status types
export interface IntegrationStatus {
  id: string;
  agentId: string;
  platform: string;
  status: 'active' | 'inactive' | 'error' | 'pending';
  lastMessageAt?: Date;
  messageCount: number;
  errorCount: number;
  lastError?: string;
  webhookUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SetupIntegrationRequest {
  agentId: string;
  platform: string;
  credentials: Record<string, any>;
  settings: Record<string, any>;
  webhookUrl?: string;
}

export interface WebhookProcessingResult {
  success: boolean;
  messageId?: string;
  jobId?: string;
  error?: string;
  shouldRetry?: boolean;
}

export class IntegrationGatewayService {
  private supabase;
  private messageQueue: MessageQueue;
  private adapters: Map<string, PlatformAdapter> = new Map();
  private registry: PlatformAdapterRegistry;
  
  constructor() {
    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    this.messageQueue = getMessageQueue();
    this.registry = PlatformAdapterRegistry.getInstance();
    
    this.registerAdapters();
  }
  
  /**
   * Register all available platform adapters
   */
  private registerAdapters(): void {
    // Register Telegram adapter
    this.registry.register('telegram', () => new TelegramAdapter());
    
    // Register WhatsApp adapter
    this.registry.register('whatsapp', () => new WhatsAppAdapter());
    
    console.log('Platform adapters registered:', this.registry.getSupportedPlatforms());
  }
  
  /**
   * Setup a new integration for an agent
   */
  async setupIntegration(
    request: SetupIntegrationRequest,
    correlationId: string
  ): Promise<IntegrationStatus> {
    try {
      const { agentId, platform, credentials, settings, webhookUrl } = request;
      
      // Validate agent exists and user has permission
      const agent = await this.validateAgent(agentId);
      if (!agent) {
        throw ErrorFactory.notFound('Agent', correlationId);
      }
      
      // Check if platform is supported
      if (!this.registry.isSupported(platform)) {
        throw ErrorFactory.businessLogic(
          `Platform ${platform} is not supported`,
          { supportedPlatforms: this.registry.getSupportedPlatforms() },
          correlationId
        );
      }
      
      // Check if integration already exists
      const existingIntegration = await this.getIntegrationByAgentAndPlatform(agentId, platform);
      if (existingIntegration) {
        throw ErrorFactory.conflict(
          `Integration for ${platform} already exists for this agent`,
          correlationId
        );
      }
      
      // Get platform adapter
      const adapter = this.registry.get(platform);
      if (!adapter) {
        throw ErrorFactory.internal(`Failed to get adapter for platform: ${platform}`, correlationId);
      }
      
      // Test connection first
      const config: PlatformConfig = {
        agentId,
        platform,
        credentials,
        settings,
        webhookUrl: webhookUrl || this.generateWebhookUrl(agentId, platform)
      };
      
      const connectionTest = await adapter.testConnection(config);
      if (!connectionTest) {
        throw ErrorFactory.businessLogic(
          'Connection test failed. Please check your credentials.',
          { platform },
          correlationId
        );
      }
      
      // Setup webhook
      const webhookResult = await adapter.setupWebhook(config);
      if (!webhookResult.success) {
        throw ErrorFactory.externalService(
          platform,
          `Webhook setup failed: ${webhookResult.error}`,
          correlationId
        );
      }
      
      // Store integration in database
      const integrationData = {
        agent_id: agentId,
        platform,
        name: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Integration`,
        status: 'active' as const,
        credentials: this.encryptCredentials(credentials),
        settings: {
          ...settings,
          webhookUrl: webhookResult.webhookUrl || config.webhookUrl,
          setupDetails: webhookResult.details
        },
        user_id: agent.user_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data: integration, error } = await this.supabase
        .from('connections')
        .insert(integrationData)
        .select()
        .single();
      
      if (error) {
        // Cleanup webhook if database insert fails
        await adapter.cleanup(config).catch(console.error);
        throw ErrorFactory.database(`Failed to store integration: ${error.message}`, correlationId);
      }
      
      // Create integration status
      const status: IntegrationStatus = {
        id: integration.id,
        agentId,
        platform,
        status: 'active',
        messageCount: 0,
        errorCount: 0,
        webhookUrl: webhookResult.webhookUrl || config.webhookUrl,
        createdAt: new Date(integration.created_at),
        updatedAt: new Date(integration.updated_at)
      };
      
      console.log('Integration setup completed:', {
        correlationId,
        integrationId: integration.id,
        agentId,
        platform,
        webhookUrl: status.webhookUrl
      });
      
      return status;
      
    } catch (error) {
      console.error('Integration setup failed:', {
        correlationId,
        error: error instanceof Error ? error.message : String(error),
        agentId: request.agentId,
        platform: request.platform
      });
      
      throw error;
    }
  }
  
  /**
   * Process incoming webhook from any platform
   */
  async processWebhook(
    platform: string,
    agentId: string,
    payload: any,
    headers: Record<string, string>,
    correlationId: string
  ): Promise<WebhookProcessingResult> {
    try {
      // Validate platform is supported
      if (!this.registry.isSupported(platform)) {
        return {
          success: false,
          error: `Platform ${platform} is not supported`,
          shouldRetry: false
        };
      }
      
      // Get platform adapter
      const adapter = this.registry.get(platform);
      if (!adapter) {
        return {
          success: false,
          error: `Failed to get adapter for platform: ${platform}`,
          shouldRetry: false
        };
      }
      
      // Validate webhook signature if provided
      const signature = headers['x-hub-signature-256'] || headers['x-telegram-bot-api-secret-token'];
      if (signature && !adapter.validateWebhook(payload, signature)) {
        return {
          success: false,
          error: 'Webhook signature validation failed',
          shouldRetry: false
        };
      }
      
      // Verify integration exists and is active
      const integration = await this.getIntegrationByAgentAndPlatform(agentId, platform);
      if (!integration || integration.status !== 'active') {
        return {
          success: false,
          error: 'Integration not found or inactive',
          shouldRetry: false
        };
      }
      
      // Create webhook payload
      const webhookPayload: WebhookPayload = {
        platform,
        agentId,
        data: payload,
        headers,
        timestamp: Date.now()
      };
      
      // Process inbound message
      const inboundMessage = await adapter.processInbound(webhookPayload);
      
      // Check for duplicate messages
      const isDuplicate = await this.checkDuplicateMessage(inboundMessage);
      if (isDuplicate) {
        console.log('Duplicate message detected, skipping:', {
          correlationId,
          messageId: inboundMessage.id,
          platformMessageId: inboundMessage.platformMessageId
        });
        
        return {
          success: true,
          messageId: inboundMessage.id
        };
      }
      
      // Store message in database
      await this.storeInboundMessage(inboundMessage);
      
      // Enqueue for processing
      const jobId = await this.messageQueue.enqueueInbound(inboundMessage, 0, 0);
      
      // Update integration statistics
      await this.updateIntegrationStats(integration.id, 'message_received');
      
      console.log('Webhook processed successfully:', {
        correlationId,
        platform,
        agentId,
        messageId: inboundMessage.id,
        jobId
      });
      
      return {
        success: true,
        messageId: inboundMessage.id,
        jobId
      };
      
    } catch (error) {
      console.error('Webhook processing failed:', {
        correlationId,
        platform,
        agentId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Update error statistics
      const integration = await this.getIntegrationByAgentAndPlatform(agentId, platform);
      if (integration) {
        await this.updateIntegrationStats(integration.id, 'error', error instanceof Error ? error.message : String(error));
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        shouldRetry: true
      };
    }
  }
  
  /**
   * Send outbound message through appropriate platform
   */
  async sendOutboundMessage(
    message: OutboundMessage,
    correlationId: string
  ): Promise<boolean> {
    try {
      // Get platform adapter
      const adapter = this.registry.get(message.platform);
      if (!adapter) {
        throw ErrorFactory.internal(`No adapter found for platform: ${message.platform}`, correlationId);
      }
      
      // Send message
      const result = await adapter.sendOutbound(message);
      
      if (result.success) {
        // Update message status in database
        await this.updateOutboundMessageStatus(message.id, 'sent', result.platformMessageId);
        
        // Update integration statistics
        const integration = await this.getIntegrationByAgentAndPlatform(message.agentId, message.platform);
        if (integration) {
          await this.updateIntegrationStats(integration.id, 'message_sent');
        }
        
        console.log('Outbound message sent successfully:', {
          correlationId,
          messageId: message.id,
          platform: message.platform,
          platformMessageId: result.platformMessageId
        });
        
        return true;
      } else {
        // Handle send failure
        await this.updateOutboundMessageStatus(message.id, 'failed', undefined, result.error?.message);
        
        // Update error statistics
        const integration = await this.getIntegrationByAgentAndPlatform(message.agentId, message.platform);
        if (integration) {
          await this.updateIntegrationStats(integration.id, 'error', result.error?.message);
        }
        
        console.error('Outbound message send failed:', {
          correlationId,
          messageId: message.id,
          platform: message.platform,
          error: result.error?.message
        });
        
        return false;
      }
      
    } catch (error) {
      console.error('Outbound message processing failed:', {
        correlationId,
        messageId: message.id,
        platform: message.platform,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return false;
    }
  }
  
  /**
   * Get integration status by agent and platform
   */
  async getIntegrationStatus(agentId: string, platform: string): Promise<IntegrationStatus | null> {
    const integration = await this.getIntegrationByAgentAndPlatform(agentId, platform);
    if (!integration) {
      return null;
    }
    
    // Get message statistics
    const { data: messageStats } = await this.supabase
      .from('messages')
      .select('id, created_at')
      .eq('agent_id', agentId)
      .eq('platform', platform)
      .order('created_at', { ascending: false })
      .limit(1);
    
    return {
      id: integration.id,
      agentId,
      platform,
      status: integration.status as any,
      lastMessageAt: messageStats?.[0] ? new Date(messageStats[0].created_at) : undefined,
      messageCount: integration.message_count || 0,
      errorCount: integration.error_count || 0,
      lastError: integration.last_error,
      webhookUrl: integration.settings?.webhookUrl,
      createdAt: new Date(integration.created_at),
      updatedAt: new Date(integration.updated_at)
    };
  }
  
  /**
   * List all integrations for an agent
   */
  async listIntegrations(agentId: string): Promise<IntegrationStatus[]> {
    const { data: integrations, error } = await this.supabase
      .from('connections')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw ErrorFactory.database(`Failed to fetch integrations: ${error.message}`);
    }
    
    return Promise.all(
      (integrations || []).map(async (integration) => {
        const status = await this.getIntegrationStatus(agentId, integration.platform);
        return status!;
      })
    );
  }
  
  /**
   * Disable an integration
   */
  async disableIntegration(agentId: string, platform: string, correlationId: string): Promise<void> {
    const integration = await this.getIntegrationByAgentAndPlatform(agentId, platform);
    if (!integration) {
      throw ErrorFactory.notFound('Integration', correlationId);
    }
    
    // Get platform adapter for cleanup
    const adapter = this.registry.get(platform);
    if (adapter) {
      const config: PlatformConfig = {
        agentId,
        platform,
        credentials: this.decryptCredentials(integration.credentials),
        settings: integration.settings || {}
      };
      
      await adapter.cleanup(config);
    }
    
    // Update status in database
    await this.supabase
      .from('connections')
      .update({ 
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('id', integration.id);
    
    console.log('Integration disabled:', {
      correlationId,
      integrationId: integration.id,
      agentId,
      platform
    });
  }
  
  // Private helper methods
  
  private async validateAgent(agentId: string): Promise<any> {
    const { data: agent, error } = await this.supabase
      .from('agents')
      .select('id, user_id, name, status')
      .eq('id', agentId)
      .single();
    
    return error ? null : agent;
  }
  
  private async getIntegrationByAgentAndPlatform(agentId: string, platform: string): Promise<any> {
    const { data: integration, error } = await this.supabase
      .from('connections')
      .select('*')
      .eq('agent_id', agentId)
      .eq('platform', platform)
      .single();
    
    return error ? null : integration;
  }
  
  private generateWebhookUrl(agentId: string, platform: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `${baseUrl}/api/v1/webhooks/${platform}/${agentId}`;
  }
  
  private encryptCredentials(credentials: Record<string, any>): Record<string, any> {
    // In production, implement proper encryption
    // For now, just return as-is (credentials should be encrypted at rest)
    return credentials;
  }
  
  private decryptCredentials(credentials: Record<string, any>): Record<string, any> {
    // In production, implement proper decryption
    // For now, just return as-is
    return credentials;
  }
  
  private async checkDuplicateMessage(message: InboundMessage): Promise<boolean> {
    const { data: existing, error } = await this.supabase
      .from('messages')
      .select('id')
      .eq('platform_message_id', message.platformMessageId)
      .eq('platform', message.platform)
      .single();
    
    return !error && existing !== null;
  }
  
  private async storeInboundMessage(message: InboundMessage): Promise<void> {
    const messageData = {
      id: message.id,
      agent_id: message.agentId,
      conversation_id: message.conversationId,
      platform: message.platform,
      platform_message_id: message.platformMessageId,
      sender_id: message.senderId,
      sender_name: message.senderName,
      content_type: message.content.type,
      content_text: message.content.text,
      content_media_url: message.content.mediaUrl,
      content_metadata: message.content,
      message_metadata: message.metadata,
      direction: 'inbound',
      status: 'received',
      created_at: message.timestamp.toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { error } = await this.supabase
      .from('messages')
      .insert(messageData);
    
    if (error) {
      console.error('Failed to store inbound message:', error);
      throw ErrorFactory.database(`Failed to store message: ${error.message}`);
    }
  }
  
  private async updateOutboundMessageStatus(
    messageId: string,
    status: string,
    platformMessageId?: string,
    errorMessage?: string
  ): Promise<void> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };
    
    if (platformMessageId) {
      updateData.platform_message_id = platformMessageId;
    }
    
    if (errorMessage) {
      updateData.error_message = errorMessage;
    }
    
    await this.supabase
      .from('messages')
      .update(updateData)
      .eq('id', messageId);
  }
  
  private async updateIntegrationStats(
    integrationId: string,
    type: 'message_received' | 'message_sent' | 'error',
    errorMessage?: string
  ): Promise<void> {
    const updates: any = {
      updated_at: new Date().toISOString()
    };
    
    switch (type) {
      case 'message_received':
      case 'message_sent':
        // Increment message count
        const { data: current } = await this.supabase
          .from('connections')
          .select('message_count')
          .eq('id', integrationId)
          .single();
        
        updates.message_count = (current?.message_count || 0) + 1;
        break;
        
      case 'error':
        // Increment error count and update last error
        const { data: currentError } = await this.supabase
          .from('connections')
          .select('error_count')
          .eq('id', integrationId)
          .single();
        
        updates.error_count = (currentError?.error_count || 0) + 1;
        updates.last_error = errorMessage;
        break;
    }
    
    await this.supabase
      .from('connections')
      .update(updates)
      .eq('id', integrationId);
  }
}

// Singleton instance
let integrationGatewayInstance: IntegrationGatewayService | null = null;

/**
 * Get or create integration gateway singleton
 */
export function getIntegrationGateway(): IntegrationGatewayService {
  if (!integrationGatewayInstance) {
    integrationGatewayInstance = new IntegrationGatewayService();
  }
  return integrationGatewayInstance;
}

// Export types
export type { IntegrationStatus, SetupIntegrationRequest, WebhookProcessingResult };
