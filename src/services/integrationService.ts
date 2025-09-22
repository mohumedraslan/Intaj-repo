/**
 * Integration service for managing platform connections and integrations
 */

import { BaseService, ValidationError, NotFoundError } from './base/BaseService';
import { ConnectionRepository, Connection } from '../repositories/ConnectionRepository';
import { AgentRepository } from '../repositories/AgentRepository';
import { generateCorrelationId } from '../lib/logging/Logger';

/**
 * Connection creation data interface
 */
export interface CreateConnectionData {
  agent_id: string;
  platform: Connection['platform'];
  config: Connection['config'];
  credentials?: Connection['credentials'];
  metadata?: Connection['metadata'];
}

/**
 * Connection update data interface
 */
export interface UpdateConnectionData {
  status?: Connection['status'];
  config?: Partial<Connection['config']>;
  credentials?: Partial<Connection['credentials']>;
  metadata?: Partial<Connection['metadata']>;
}

/**
 * Webhook setup data interface
 */
export interface WebhookSetupData {
  agent_id: string;
  platform: string;
  bot_token?: string;
  webhook_url?: string;
  phone_number?: string;
  access_token?: string;
}

/**
 * Platform connection statistics interface
 */
export interface PlatformStats {
  [platform: string]: {
    total: number;
    active: number;
    inactive: number;
    error: number;
    pending: number;
  };
}

/**
 * Integration service class
 */
export class IntegrationService extends BaseService {
  private connectionRepository: ConnectionRepository;
  private agentRepository: AgentRepository;

  private supportedPlatforms: Connection['platform'][] = [
    'telegram',
    'whatsapp',
    'discord',
    'slack',
    'website'
  ];

  constructor() {
    super('IntegrationService');
    this.connectionRepository = new ConnectionRepository();
    this.agentRepository = new AgentRepository();
  }

  /**
   * Create a new platform connection
   */
  async createConnection(
    userId: string,
    connectionData: CreateConnectionData,
    correlationId: string = generateCorrelationId()
  ): Promise<Connection> {
    const startTime = Date.now();
    this.logOperationStart('createConnection', { 
      correlationId, 
      userId,
      platform: connectionData.platform
    });

    try {
      // Validate required fields
      this.validateRequired(
        { userId, ...connectionData }, 
        ['userId', 'agent_id', 'platform', 'config'], 
        correlationId
      );

      // Validate platform
      this.validatePlatform(connectionData.platform);

      // Validate agent exists and user has access
      const agent = await this.agentRepository.findById(connectionData.agent_id, correlationId);
      if (agent.error || !agent.data) {
        throw new NotFoundError('Agent', connectionData.agent_id);
      }
      this.validateUserAccess(userId, agent.data.user_id, correlationId);

      // Check if connection already exists for this agent and platform
      const existing = await this.connectionRepository.findByAgentAndPlatform(
        connectionData.agent_id,
        connectionData.platform,
        correlationId
      );

      if (existing.data) {
        throw new ValidationError(
          `Connection already exists for agent ${connectionData.agent_id} on platform ${connectionData.platform}`
        );
      }

      // Validate platform-specific configuration
      this.validatePlatformConfig(connectionData.platform, connectionData.config);

      // Create connection
      const newConnectionData = {
        ...connectionData,
        user_id: userId,
        status: 'pending' as const
      };

      const result = await this.connectionRepository.create(newConnectionData, correlationId);

      if (result.error) {
        throw result.error;
      }

      const duration = Date.now() - startTime;
      this.logOperationSuccess('createConnection', { 
        correlationId, 
        userId,
        connectionId: result.data!.id,
        platform: connectionData.platform,
        duration 
      });

      return result.data!;

    } catch (error) {
      this.handleError(error, { 
        correlationId, 
        operation: 'createConnection',
        userId,
        connectionData: this.sanitizeForLogging(connectionData)
      });
    }
  }

  /**
   * Setup webhook for a platform connection
   */
  async setupWebhook(
    userId: string,
    webhookData: WebhookSetupData,
    correlationId: string = generateCorrelationId()
  ): Promise<Connection> {
    const startTime = Date.now();
    this.logOperationStart('setupWebhook', { 
      correlationId, 
      userId,
      platform: webhookData.platform
    });

    try {
      // Validate required fields
      this.validateRequired(
        { userId, ...webhookData }, 
        ['userId', 'agent_id', 'platform'], 
        correlationId
      );

      // Validate agent exists and user has access
      const agent = await this.agentRepository.findById(webhookData.agent_id, correlationId);
      if (agent.error || !agent.data) {
        throw new NotFoundError('Agent', webhookData.agent_id);
      }
      this.validateUserAccess(userId, agent.data.user_id, correlationId);

      // Find existing connection or create new one
      let connection = await this.connectionRepository.findByAgentAndPlatform(
        webhookData.agent_id,
        webhookData.platform as Connection['platform'],
        correlationId
      );

      if (connection.error) {
        throw connection.error;
      }

      let connectionData: Connection;
      
      if (!connection.data) {
        // Create new connection
        const newConnectionData: CreateConnectionData = {
          agent_id: webhookData.agent_id,
          platform: webhookData.platform as Connection['platform'],
          config: {
            bot_token: webhookData.bot_token,
            webhook_url: webhookData.webhook_url,
            phone_number: webhookData.phone_number,
            access_token: webhookData.access_token
          }
        };

        connectionData = await this.createConnection(userId, newConnectionData, correlationId);
      } else {
        // Update existing connection
        const updateData: UpdateConnectionData = {
          config: {
            ...connection.data.config,
            bot_token: webhookData.bot_token,
            webhook_url: webhookData.webhook_url,
            phone_number: webhookData.phone_number,
            access_token: webhookData.access_token
          },
          status: 'pending'
        };

        connectionData = await this.updateConnection(
          connection.data.id,
          userId,
          updateData,
          correlationId
        );
      }

      // Here you would typically call the platform's API to set up the webhook
      // For now, we'll just update the status to active
      const finalConnection = await this.connectionRepository.updateStatus(
        connectionData.id,
        'active',
        undefined,
        correlationId
      );

      if (finalConnection.error) {
        throw finalConnection.error;
      }

      const duration = Date.now() - startTime;
      this.logOperationSuccess('setupWebhook', { 
        correlationId, 
        userId,
        connectionId: connectionData.id,
        platform: webhookData.platform,
        duration 
      });

      return finalConnection.data!;

    } catch (error) {
      this.handleError(error, { 
        correlationId, 
        operation: 'setupWebhook',
        userId,
        webhookData: this.sanitizeForLogging(webhookData)
      });
    }
  }

  /**
   * Get connection by ID with user access validation
   */
  async getConnectionById(
    connectionId: string,
    userId: string,
    correlationId: string = generateCorrelationId()
  ): Promise<Connection> {
    this.logOperationStart('getConnectionById', { correlationId, connectionId, userId });

    try {
      this.validateRequired({ connectionId, userId }, ['connectionId', 'userId'], correlationId);

      const result = await this.connectionRepository.findById(connectionId, correlationId);

      if (result.error) {
        throw result.error;
      }

      if (!result.data) {
        throw new NotFoundError('Connection', connectionId);
      }

      // Validate user access
      this.validateUserAccess(userId, result.data.user_id, correlationId);

      this.logOperationSuccess('getConnectionById', { correlationId, connectionId, userId });

      return result.data;

    } catch (error) {
      this.handleError(error, { 
        correlationId, 
        operation: 'getConnectionById',
        connectionId,
        userId 
      });
    }
  }

  /**
   * Get connections by agent ID
   */
  async getAgentConnections(
    agentId: string,
    userId: string,
    correlationId: string = generateCorrelationId()
  ): Promise<Connection[]> {
    this.logOperationStart('getAgentConnections', { correlationId, agentId, userId });

    try {
      this.validateRequired({ agentId, userId }, ['agentId', 'userId'], correlationId);

      // Verify agent exists and user has access
      const agent = await this.agentRepository.findById(agentId, correlationId);
      if (agent.error || !agent.data) {
        throw new NotFoundError('Agent', agentId);
      }
      this.validateUserAccess(userId, agent.data.user_id, correlationId);

      const result = await this.connectionRepository.findByAgentId(agentId, correlationId);

      if (result.error) {
        throw result.error;
      }

      this.logOperationSuccess('getAgentConnections', { 
        correlationId, 
        agentId,
        userId,
        count: result.data.length
      });

      return result.data;

    } catch (error) {
      this.handleError(error, { 
        correlationId, 
        operation: 'getAgentConnections',
        agentId,
        userId
      });
    }
  }

  /**
   * Get active connections for a user
   */
  async getUserActiveConnections(
    userId: string,
    correlationId: string = generateCorrelationId()
  ): Promise<any[]> {
    this.logOperationStart('getUserActiveConnections', { correlationId, userId });

    try {
      this.validateRequired({ userId }, ['userId'], correlationId);

      const result = await this.connectionRepository.findActiveByUserId(userId, correlationId);

      if (result.error) {
        throw result.error;
      }

      this.logOperationSuccess('getUserActiveConnections', { 
        correlationId, 
        userId,
        count: result.data.length
      });

      return result.data;

    } catch (error) {
      this.handleError(error, { 
        correlationId, 
        operation: 'getUserActiveConnections',
        userId
      });
    }
  }

  /**
   * Update connection
   */
  async updateConnection(
    connectionId: string,
    userId: string,
    updateData: UpdateConnectionData,
    correlationId: string = generateCorrelationId()
  ): Promise<Connection> {
    const startTime = Date.now();
    this.logOperationStart('updateConnection', { correlationId, connectionId, userId });

    try {
      this.validateRequired({ connectionId, userId }, ['connectionId', 'userId'], correlationId);

      // Verify connection exists and user has access
      await this.getConnectionById(connectionId, userId, correlationId);

      const result = await this.connectionRepository.update(connectionId, updateData, correlationId);

      if (result.error) {
        throw result.error;
      }

      const duration = Date.now() - startTime;
      this.logOperationSuccess('updateConnection', { 
        correlationId, 
        connectionId,
        userId,
        duration 
      });

      return result.data!;

    } catch (error) {
      this.handleError(error, { 
        correlationId, 
        operation: 'updateConnection',
        connectionId,
        userId,
        updateData: this.sanitizeForLogging(updateData)
      });
    }
  }

  /**
   * Update connection status
   */
  async updateConnectionStatus(
    connectionId: string,
    userId: string,
    status: Connection['status'],
    errorMessage?: string,
    correlationId: string = generateCorrelationId()
  ): Promise<Connection> {
    const startTime = Date.now();
    this.logOperationStart('updateConnectionStatus', { 
      correlationId, 
      connectionId, 
      userId,
      status 
    });

    try {
      this.validateRequired(
        { connectionId, userId, status }, 
        ['connectionId', 'userId', 'status'], 
        correlationId
      );

      // Verify connection exists and user has access
      await this.getConnectionById(connectionId, userId, correlationId);

      const result = await this.connectionRepository.updateStatus(
        connectionId,
        status,
        errorMessage,
        correlationId
      );

      if (result.error) {
        throw result.error;
      }

      const duration = Date.now() - startTime;
      this.logOperationSuccess('updateConnectionStatus', { 
        correlationId, 
        connectionId,
        userId,
        status,
        duration 
      });

      return result.data!;

    } catch (error) {
      this.handleError(error, { 
        correlationId, 
        operation: 'updateConnectionStatus',
        connectionId,
        userId,
        status,
        errorMessage
      });
    }
  }

  /**
   * Delete connection
   */
  async deleteConnection(
    connectionId: string,
    userId: string,
    correlationId: string = generateCorrelationId()
  ): Promise<boolean> {
    const startTime = Date.now();
    this.logOperationStart('deleteConnection', { correlationId, connectionId, userId });

    try {
      this.validateRequired({ connectionId, userId }, ['connectionId', 'userId'], correlationId);

      // Verify connection exists and user has access
      await this.getConnectionById(connectionId, userId, correlationId);

      const result = await this.connectionRepository.delete(connectionId, correlationId);

      if (result.error) {
        throw result.error;
      }

      const duration = Date.now() - startTime;
      this.logOperationSuccess('deleteConnection', { 
        correlationId, 
        connectionId,
        userId,
        duration 
      });

      return true;

    } catch (error) {
      this.handleError(error, { 
        correlationId, 
        operation: 'deleteConnection',
        connectionId,
        userId
      });
    }
  }

  /**
   * Get connection statistics by platform
   */
  async getConnectionStatsByPlatform(
    userId: string,
    correlationId: string = generateCorrelationId()
  ): Promise<PlatformStats> {
    this.logOperationStart('getConnectionStatsByPlatform', { correlationId, userId });

    try {
      this.validateRequired({ userId }, ['userId'], correlationId);

      const result = await this.connectionRepository.getConnectionStatsByPlatform(
        userId,
        correlationId
      );

      if (result.error) {
        throw result.error;
      }

      this.logOperationSuccess('getConnectionStatsByPlatform', { 
        correlationId, 
        userId,
        stats: result.data
      });

      return result.data!;

    } catch (error) {
      this.handleError(error, { 
        correlationId, 
        operation: 'getConnectionStatsByPlatform',
        userId
      });
    }
  }

  /**
   * Get connections needing webhook verification
   */
  async getPendingWebhookVerifications(
    correlationId: string = generateCorrelationId()
  ): Promise<Connection[]> {
    this.logOperationStart('getPendingWebhookVerifications', { correlationId });

    try {
      const result = await this.connectionRepository.findPendingWebhookVerification(correlationId);

      if (result.error) {
        throw result.error;
      }

      this.logOperationSuccess('getPendingWebhookVerifications', { 
        correlationId, 
        count: result.data.length
      });

      return result.data;

    } catch (error) {
      this.handleError(error, { 
        correlationId, 
        operation: 'getPendingWebhookVerifications'
      });
    }
  }

  /**
   * Validate platform
   */
  private validatePlatform(platform: string): void {
    if (!this.supportedPlatforms.includes(platform as Connection['platform'])) {
      throw new ValidationError(
        `Unsupported platform: ${platform}. Supported platforms: ${this.supportedPlatforms.join(', ')}`
      );
    }
  }

  /**
   * Validate platform-specific configuration
   */
  private validatePlatformConfig(platform: Connection['platform'], config: Connection['config']): void {
    switch (platform) {
      case 'telegram':
        if (!config.bot_token) {
          throw new ValidationError('Telegram integration requires bot_token in config');
        }
        if (!this.isValidTelegramToken(config.bot_token)) {
          throw new ValidationError('Invalid Telegram bot token format');
        }
        break;

      case 'whatsapp':
        if (!config.phone_number && !config.access_token) {
          throw new ValidationError('WhatsApp integration requires phone_number or access_token in config');
        }
        break;

      case 'discord':
        if (!config.bot_token) {
          throw new ValidationError('Discord integration requires bot_token in config');
        }
        break;

      case 'slack':
        if (!config.bot_token) {
          throw new ValidationError('Slack integration requires bot_token in config');
        }
        break;

      case 'website':
        // Website integration doesn't require specific config
        break;

      default:
        throw new ValidationError(`Unknown platform: ${platform}`);
    }
  }

  /**
   * Validate Telegram bot token format
   */
  private isValidTelegramToken(token: string): boolean {
    const telegramTokenRegex = /^\d+:[A-Za-z0-9_-]{35}$/;
    return telegramTokenRegex.test(token);
  }
}
