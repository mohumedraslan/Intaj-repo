/**
 * Agent repository for managing AI agents
 */

import { BaseRepository, BaseEntity } from './base/BaseRepository';

/**
 * Agent entity interface
 */
export interface Agent extends BaseEntity {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  model: string;
  base_prompt?: string;
  avatar_url?: string;
  status: 'active' | 'inactive' | 'draft';
  settings: {
    temperature?: number;
    max_tokens?: number;
    timeout_ms?: number;
    enable_rag?: boolean;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
}

/**
 * Agent template interface
 */
export interface AgentTemplate extends BaseEntity {
  id: string;
  type: string;
  name: string;
  description?: string;
  base_prompt: string;
  default_config: Record<string, any>;
  available_tools: string[];
  created_at: string;
  updated_at: string;
}

/**
 * Agent repository class
 */
export class AgentRepository extends BaseRepository<Agent> {
  constructor() {
    super('agents');
  }

  /**
   * Find agents by user ID
   */
  async findByUserId(userId: string, correlationId?: string) {
    try {
      this.logger.debug('Finding agents by user ID', { correlationId, userId });

      const { data, error, count } = await this.client
        .from(this.tableName)
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        this.logger.error('Error finding agents by user ID', {
          correlationId,
          userId,
          error
        });
        return { data: [], count: 0, error };
      }

      this.logger.debug('Found agents by user ID', { 
        correlationId, 
        userId,
        count: data?.length || 0
      });

      return { 
        data: (data as Agent[]) || [], 
        count: count || 0, 
        error: null 
      };

    } catch (error) {
      this.logger.error('Exception finding agents by user ID', {
        correlationId,
        userId,
        error: error as Error
      });
      return { data: [], count: 0, error: error as Error };
    }
  }

  /**
   * Find active agents by user ID
   */
  async findActiveByUserId(userId: string, correlationId?: string) {
    try {
      this.logger.debug('Finding active agents by user ID', { correlationId, userId });

      const { data, error, count } = await this.client
        .from(this.tableName)
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        this.logger.error('Error finding active agents by user ID', {
          correlationId,
          userId,
          error
        });
        return { data: [], count: 0, error };
      }

      return { 
        data: (data as Agent[]) || [], 
        count: count || 0, 
        error: null 
      };

    } catch (error) {
      this.logger.error('Exception finding active agents by user ID', {
        correlationId,
        userId,
        error: error as Error
      });
      return { data: [], count: 0, error: error as Error };
    }
  }

  /**
   * Update agent status
   */
  async updateStatus(
    agentId: string,
    status: Agent['status'],
    correlationId?: string
  ) {
    try {
      this.logger.debug('Updating agent status', { 
        correlationId, 
        agentId,
        status 
      });

      const { data, error } = await this.client
        .from(this.tableName)
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', agentId)
        .select()
        .single();

      if (error) {
        this.logger.error('Error updating agent status', {
          correlationId,
          agentId,
          status,
          error
        });
        return { data: null, error };
      }

      this.logger.info('Updated agent status', { 
        correlationId, 
        agentId,
        status 
      });

      return { data: data as Agent, error: null };

    } catch (error) {
      this.logger.error('Exception updating agent status', {
        correlationId,
        agentId,
        status,
        error: error as Error
      });
      return { data: null, error: error as Error };
    }
  }

  /**
   * Update agent settings
   */
  async updateSettings(
    agentId: string,
    settings: Partial<Agent['settings']>,
    correlationId?: string
  ) {
    try {
      this.logger.debug('Updating agent settings', { 
        correlationId, 
        agentId 
      });

      // First get current settings
      const { data: currentAgent } = await this.findById(agentId, correlationId);
      if (!currentAgent) {
        throw new Error('Agent not found');
      }

      const updatedSettings = {
        ...currentAgent.settings,
        ...settings
      };

      const { data, error } = await this.client
        .from(this.tableName)
        .update({ 
          settings: updatedSettings,
          updated_at: new Date().toISOString()
        })
        .eq('id', agentId)
        .select()
        .single();

      if (error) {
        this.logger.error('Error updating agent settings', {
          correlationId,
          agentId,
          error
        });
        return { data: null, error };
      }

      this.logger.info('Updated agent settings', { 
        correlationId, 
        agentId 
      });

      return { data: data as Agent, error: null };

    } catch (error) {
      this.logger.error('Exception updating agent settings', {
        correlationId,
        agentId,
        error: error as Error
      });
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get agent with connection count
   */
  async getAgentWithStats(agentId: string, correlationId?: string) {
    try {
      this.logger.debug('Getting agent with statistics', { correlationId, agentId });

      // Get agent data
      const { data: agent, error: agentError } = await this.findById(agentId, correlationId);
      if (agentError || !agent) {
        return { data: null, error: agentError || new Error('Agent not found') };
      }

      // Get connection count
      const { count: connectionCount } = await this.client
        .from('connections')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agentId);

      // Get message count
      const { count: messageCount } = await this.client
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agentId);

      // Get conversation count
      const { count: conversationCount } = await this.client
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agentId);

      const agentWithStats = {
        ...agent,
        stats: {
          connectionCount: connectionCount || 0,
          messageCount: messageCount || 0,
          conversationCount: conversationCount || 0
        }
      };

      this.logger.debug('Retrieved agent with statistics', { 
        correlationId, 
        agentId,
        stats: agentWithStats.stats
      });

      return { data: agentWithStats, error: null };

    } catch (error) {
      this.logger.error('Exception getting agent with statistics', {
        correlationId,
        agentId,
        error: error as Error
      });
      return { data: null, error: error as Error };
    }
  }

  /**
   * Search agents by name or description
   */
  async searchAgents(
    userId: string,
    searchTerm: string,
    correlationId?: string
  ) {
    try {
      this.logger.debug('Searching agents', { 
        correlationId, 
        userId,
        searchTerm 
      });

      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false });

      if (error) {
        this.logger.error('Error searching agents', {
          correlationId,
          userId,
          searchTerm,
          error
        });
        return { data: [], error };
      }

      this.logger.debug('Found agents by search', { 
        correlationId, 
        userId,
        searchTerm,
        count: data?.length || 0
      });

      return { data: (data as Agent[]) || [], error: null };

    } catch (error) {
      this.logger.error('Exception searching agents', {
        correlationId,
        userId,
        searchTerm,
        error: error as Error
      });
      return { data: [], error: error as Error };
    }
  }
}
