/**
 * Agent service for managing AI agents and their configurations
 */

import { BaseService, ValidationError, NotFoundError, ForbiddenError } from './base/BaseService';
import { AgentRepository, Agent } from '../repositories/AgentRepository';
import { generateCorrelationId } from '../lib/logging/Logger';

/**
 * Agent creation data interface
 */
export interface CreateAgentData {
  name: string;
  description?: string;
  model: string;
  base_prompt?: string;
  avatar_url?: string;
  settings?: Agent['settings'];
}

/**
 * Agent update data interface
 */
export interface UpdateAgentData {
  name?: string;
  description?: string;
  model?: string;
  base_prompt?: string;
  avatar_url?: string;
  status?: Agent['status'];
  settings?: Partial<Agent['settings']>;
}

/**
 * Agent with statistics interface
 */
export interface AgentWithStats extends Agent {
  stats: {
    connectionCount: number;
    messageCount: number;
    conversationCount: number;
  };
}

/**
 * Agent service class
 */
export class AgentService extends BaseService {
  private agentRepository: AgentRepository;
  private validModels = [
    'gpt-4o',
    'gpt-4o-mini',
    'claude-3-sonnet',
    'claude-3-haiku',
    'llama-3-70b',
    'llama-3-8b'
  ];

  constructor() {
    super('AgentService');
    this.agentRepository = new AgentRepository();
  }

  /**
   * Create a new agent
   */
  async createAgent(
    userId: string,
    agentData: CreateAgentData,
    correlationId: string = generateCorrelationId()
  ): Promise<Agent> {
    const startTime = Date.now();
    this.logOperationStart('createAgent', { correlationId, userId });

    try {
      // Validate required fields
      this.validateRequired({ userId, ...agentData }, ['userId', 'name', 'model'], correlationId);

      // Validate agent data
      this.validateAgentData(agentData);

      // Create agent with default settings
      const newAgentData = {
        user_id: userId,
        name: agentData.name.trim(),
        description: agentData.description?.trim(),
        model: agentData.model,
        base_prompt: agentData.base_prompt?.trim(),
        avatar_url: agentData.avatar_url,
        status: 'draft' as const,
        settings: {
          temperature: 0.7,
          max_tokens: 1000,
          timeout_ms: 10000,
          enable_rag: false,
          ...agentData.settings
        }
      };

      const result = await this.agentRepository.create(newAgentData, correlationId);

      if (result.error) {
        throw result.error;
      }

      const duration = Date.now() - startTime;
      this.logOperationSuccess('createAgent', { 
        correlationId, 
        userId,
        agentId: result.data!.id,
        duration 
      });

      return result.data!;

    } catch (error) {
      this.handleError(error, { 
        correlationId, 
        operation: 'createAgent',
        userId,
        agentData: this.sanitizeForLogging(agentData)
      });
    }
  }

  /**
   * Get agent by ID with user access validation
   */
  async getAgentById(
    agentId: string,
    userId: string,
    correlationId: string = generateCorrelationId()
  ): Promise<Agent> {
    this.logOperationStart('getAgentById', { correlationId, agentId, userId });

    try {
      this.validateRequired({ agentId, userId }, ['agentId', 'userId'], correlationId);

      const result = await this.agentRepository.findById(agentId, correlationId);

      if (result.error) {
        throw result.error;
      }

      if (!result.data) {
        throw new NotFoundError('Agent', agentId);
      }

      // Validate user access
      this.validateUserAccess(userId, result.data.user_id, correlationId);

      this.logOperationSuccess('getAgentById', { correlationId, agentId, userId });

      return result.data;

    } catch (error) {
      this.handleError(error, { 
        correlationId, 
        operation: 'getAgentById',
        agentId,
        userId 
      });
    }
  }

  /**
   * Get agent with statistics
   */
  async getAgentWithStats(
    agentId: string,
    userId: string,
    correlationId: string = generateCorrelationId()
  ): Promise<AgentWithStats> {
    this.logOperationStart('getAgentWithStats', { correlationId, agentId, userId });

    try {
      this.validateRequired({ agentId, userId }, ['agentId', 'userId'], correlationId);

      const result = await this.agentRepository.getAgentWithStats(agentId, correlationId);

      if (result.error) {
        throw result.error;
      }

      if (!result.data) {
        throw new NotFoundError('Agent', agentId);
      }

      // Validate user access
      this.validateUserAccess(userId, result.data.user_id, correlationId);

      this.logOperationSuccess('getAgentWithStats', { 
        correlationId, 
        agentId, 
        userId,
        stats: result.data.stats
      });

      return result.data as AgentWithStats;

    } catch (error) {
      this.handleError(error, { 
        correlationId, 
        operation: 'getAgentWithStats',
        agentId,
        userId 
      });
    }
  }

  /**
   * Get all agents for a user
   */
  async getUserAgents(
    userId: string,
    correlationId: string = generateCorrelationId()
  ): Promise<Agent[]> {
    this.logOperationStart('getUserAgents', { correlationId, userId });

    try {
      this.validateRequired({ userId }, ['userId'], correlationId);

      const result = await this.agentRepository.findByUserId(userId, correlationId);

      if (result.error) {
        throw result.error;
      }

      this.logOperationSuccess('getUserAgents', { 
        correlationId, 
        userId,
        count: result.data.length
      });

      return result.data;

    } catch (error) {
      this.handleError(error, { 
        correlationId, 
        operation: 'getUserAgents',
        userId 
      });
    }
  }

  /**
   * Get active agents for a user
   */
  async getActiveUserAgents(
    userId: string,
    correlationId: string = generateCorrelationId()
  ): Promise<Agent[]> {
    this.logOperationStart('getActiveUserAgents', { correlationId, userId });

    try {
      this.validateRequired({ userId }, ['userId'], correlationId);

      const result = await this.agentRepository.findActiveByUserId(userId, correlationId);

      if (result.error) {
        throw result.error;
      }

      this.logOperationSuccess('getActiveUserAgents', { 
        correlationId, 
        userId,
        count: result.data.length
      });

      return result.data;

    } catch (error) {
      this.handleError(error, { 
        correlationId, 
        operation: 'getActiveUserAgents',
        userId 
      });
    }
  }

  /**
   * Update agent
   */
  async updateAgent(
    agentId: string,
    userId: string,
    updateData: UpdateAgentData,
    correlationId: string = generateCorrelationId()
  ): Promise<Agent> {
    const startTime = Date.now();
    this.logOperationStart('updateAgent', { correlationId, agentId, userId });

    try {
      this.validateRequired({ agentId, userId }, ['agentId', 'userId'], correlationId);

      // Verify agent exists and user has access
      await this.getAgentById(agentId, userId, correlationId);

      // Validate update data
      if (updateData.name !== undefined) {
        this.validateAgentName(updateData.name);
      }
      if (updateData.model !== undefined) {
        this.validateModel(updateData.model);
      }

      const result = await this.agentRepository.update(agentId, updateData, correlationId);

      if (result.error) {
        throw result.error;
      }

      const duration = Date.now() - startTime;
      this.logOperationSuccess('updateAgent', { 
        correlationId, 
        agentId,
        userId,
        duration 
      });

      return result.data!;

    } catch (error) {
      this.handleError(error, { 
        correlationId, 
        operation: 'updateAgent',
        agentId,
        userId,
        updateData: this.sanitizeForLogging(updateData)
      });
    }
  }

  /**
   * Update agent status
   */
  async updateAgentStatus(
    agentId: string,
    userId: string,
    status: Agent['status'],
    correlationId: string = generateCorrelationId()
  ): Promise<Agent> {
    const startTime = Date.now();
    this.logOperationStart('updateAgentStatus', { correlationId, agentId, userId, status });

    try {
      this.validateRequired({ agentId, userId, status }, ['agentId', 'userId', 'status'], correlationId);

      // Verify agent exists and user has access
      await this.getAgentById(agentId, userId, correlationId);

      const result = await this.agentRepository.updateStatus(agentId, status, correlationId);

      if (result.error) {
        throw result.error;
      }

      const duration = Date.now() - startTime;
      this.logOperationSuccess('updateAgentStatus', { 
        correlationId, 
        agentId,
        userId,
        status,
        duration 
      });

      return result.data!;

    } catch (error) {
      this.handleError(error, { 
        correlationId, 
        operation: 'updateAgentStatus',
        agentId,
        userId,
        status
      });
    }
  }

  /**
   * Update agent settings
   */
  async updateAgentSettings(
    agentId: string,
    userId: string,
    settings: Partial<Agent['settings']>,
    correlationId: string = generateCorrelationId()
  ): Promise<Agent> {
    const startTime = Date.now();
    this.logOperationStart('updateAgentSettings', { correlationId, agentId, userId });

    try {
      this.validateRequired({ agentId, userId }, ['agentId', 'userId'], correlationId);

      // Verify agent exists and user has access
      await this.getAgentById(agentId, userId, correlationId);

      // Validate settings
      this.validateAgentSettings(settings);

      const result = await this.agentRepository.updateSettings(agentId, settings, correlationId);

      if (result.error) {
        throw result.error;
      }

      const duration = Date.now() - startTime;
      this.logOperationSuccess('updateAgentSettings', { 
        correlationId, 
        agentId,
        userId,
        duration 
      });

      return result.data!;

    } catch (error) {
      this.handleError(error, { 
        correlationId, 
        operation: 'updateAgentSettings',
        agentId,
        userId,
        settings
      });
    }
  }

  /**
   * Delete agent
   */
  async deleteAgent(
    agentId: string,
    userId: string,
    correlationId: string = generateCorrelationId()
  ): Promise<boolean> {
    const startTime = Date.now();
    this.logOperationStart('deleteAgent', { correlationId, agentId, userId });

    try {
      this.validateRequired({ agentId, userId }, ['agentId', 'userId'], correlationId);

      // Verify agent exists and user has access
      await this.getAgentById(agentId, userId, correlationId);

      const result = await this.agentRepository.delete(agentId, correlationId);

      if (result.error) {
        throw result.error;
      }

      const duration = Date.now() - startTime;
      this.logOperationSuccess('deleteAgent', { 
        correlationId, 
        agentId,
        userId,
        duration 
      });

      return true;

    } catch (error) {
      this.handleError(error, { 
        correlationId, 
        operation: 'deleteAgent',
        agentId,
        userId
      });
    }
  }

  /**
   * Search agents
   */
  async searchAgents(
    userId: string,
    searchTerm: string,
    correlationId: string = generateCorrelationId()
  ): Promise<Agent[]> {
    this.logOperationStart('searchAgents', { correlationId, userId, searchTerm });

    try {
      this.validateRequired({ userId, searchTerm }, ['userId', 'searchTerm'], correlationId);

      if (searchTerm.trim().length < 2) {
        throw new ValidationError('Search term must be at least 2 characters long');
      }

      const result = await this.agentRepository.searchAgents(
        userId,
        searchTerm.trim(),
        correlationId
      );

      if (result.error) {
        throw result.error;
      }

      this.logOperationSuccess('searchAgents', { 
        correlationId, 
        userId,
        searchTerm,
        count: result.data.length
      });

      return result.data;

    } catch (error) {
      this.handleError(error, { 
        correlationId, 
        operation: 'searchAgents',
        userId,
        searchTerm
      });
    }
  }

  /**
   * Validate agent creation/update data
   */
  private validateAgentData(agentData: CreateAgentData): void {
    this.validateAgentName(agentData.name);
    this.validateModel(agentData.model);

    if (agentData.settings) {
      this.validateAgentSettings(agentData.settings);
    }
  }

  /**
   * Validate agent name
   */
  private validateAgentName(name: string): void {
    if (!name || typeof name !== 'string') {
      throw new ValidationError('Agent name is required and must be a string');
    }

    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      throw new ValidationError('Agent name cannot be empty');
    }

    if (trimmedName.length > 100) {
      throw new ValidationError('Agent name must be less than 100 characters');
    }

    if (trimmedName.length < 2) {
      throw new ValidationError('Agent name must be at least 2 characters long');
    }
  }

  /**
   * Validate model
   */
  private validateModel(model: string): void {
    if (!model || !this.validModels.includes(model)) {
      throw new ValidationError(
        `Invalid model. Must be one of: ${this.validModels.join(', ')}`
      );
    }
  }

  /**
   * Validate agent settings
   */
  private validateAgentSettings(settings: Partial<Agent['settings']>): void {
    if (settings.temperature !== undefined) {
      if (typeof settings.temperature !== 'number' || 
          settings.temperature < 0 || 
          settings.temperature > 2) {
        throw new ValidationError('Temperature must be a number between 0 and 2');
      }
    }

    if (settings.max_tokens !== undefined) {
      if (typeof settings.max_tokens !== 'number' || 
          settings.max_tokens < 1 || 
          settings.max_tokens > 4000) {
        throw new ValidationError('Max tokens must be a number between 1 and 4000');
      }
    }

    if (settings.timeout_ms !== undefined) {
      if (typeof settings.timeout_ms !== 'number' || 
          settings.timeout_ms < 1000 || 
          settings.timeout_ms > 30000) {
        throw new ValidationError('Timeout must be a number between 1000 and 30000 milliseconds');
      }
    }

    if (settings.enable_rag !== undefined) {
      if (typeof settings.enable_rag !== 'boolean') {
        throw new ValidationError('Enable RAG must be a boolean');
      }
    }
  }
}
