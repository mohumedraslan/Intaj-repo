/**
 * Connection repository for managing platform integrations
 */

import { BaseRepository, BaseEntity } from './base/BaseRepository';

/**
 * Connection entity interface
 */
export interface Connection extends BaseEntity {
  id: string;
  agent_id: string;
  user_id: string;
  platform: 'telegram' | 'whatsapp' | 'discord' | 'slack' | 'website';
  status: 'active' | 'inactive' | 'error' | 'pending';
  config: {
    bot_token?: string;
    webhook_url?: string;
    phone_number?: string;
    access_token?: string;
    [key: string]: any;
  };
  credentials?: {
    encrypted_token?: string;
    refresh_token?: string;
    expires_at?: string;
    [key: string]: any;
  };
  metadata?: {
    bot_username?: string;
    bot_name?: string;
    webhook_verified?: boolean;
    last_error?: string;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
}

/**
 * Connection repository class
 */
export class ConnectionRepository extends BaseRepository<Connection> {
  constructor() {
    super('connections');
  }

  /**
   * Find connections by agent ID
   */
  async findByAgentId(agentId: string, correlationId?: string) {
    try {
      this.logger.debug('Finding connections by agent ID', { 
        correlationId, 
        agentId 
      });

      const { data, error, count } = await this.client
        .from(this.tableName)
        .select('*', { count: 'exact' })
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });

      if (error) {
        this.logger.error('Error finding connections by agent ID', {
          correlationId,
          agentId,
          error
        });
        return { data: [], count: 0, error };
      }

      return { 
        data: (data as Connection[]) || [], 
        count: count || 0, 
        error: null 
      };

    } catch (error) {
      this.logger.error('Exception finding connections by agent ID', {
        correlationId,
        agentId,
        error: error as Error
      });
      return { data: [], count: 0, error: error as Error };
    }
  }

  /**
   * Find connection by agent ID and platform
   */
  async findByAgentAndPlatform(
    agentId: string,
    platform: Connection['platform'],
    correlationId?: string
  ) {
    try {
      this.logger.debug('Finding connection by agent and platform', { 
        correlationId, 
        agentId,
        platform 
      });

      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('agent_id', agentId)
        .eq('platform', platform)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        this.logger.error('Error finding connection by agent and platform', {
          correlationId,
          agentId,
          platform,
          error
        });
        return { data: null, error };
      }

      return { data: data as Connection || null, error: null };

    } catch (error) {
      this.logger.error('Exception finding connection by agent and platform', {
        correlationId,
        agentId,
        platform,
        error: error as Error
      });
      return { data: null, error: error as Error };
    }
  }

  /**
   * Find active connections by user ID
   */
  async findActiveByUserId(userId: string, correlationId?: string) {
    try {
      this.logger.debug('Finding active connections by user ID', { 
        correlationId, 
        userId 
      });

      const { data, error } = await this.client
        .from(this.tableName)
        .select(`
          *,
          agents!inner(name, user_id)
        `)
        .eq('agents.user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        this.logger.error('Error finding active connections by user ID', {
          correlationId,
          userId,
          error
        });
        return { data: [], error };
      }

      return { data: (data as any[]) || [], error: null };

    } catch (error) {
      this.logger.error('Exception finding active connections by user ID', {
        correlationId,
        userId,
        error: error as Error
      });
      return { data: [], error: error as Error };
    }
  }

  /**
   * Update connection status
   */
  async updateStatus(
    connectionId: string,
    status: Connection['status'],
    errorMessage?: string,
    correlationId?: string
  ) {
    try {
      this.logger.debug('Updating connection status', { 
        correlationId, 
        connectionId,
        status 
      });

      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      // Update metadata with error if provided
      if (errorMessage) {
        const { data: current } = await this.findById(connectionId, correlationId);
        if (current) {
          updateData.metadata = {
            ...current.metadata,
            last_error: errorMessage,
            last_error_at: new Date().toISOString()
          };
        }
      }

      const { data, error } = await this.client
        .from(this.tableName)
        .update(updateData)
        .eq('id', connectionId)
        .select()
        .single();

      if (error) {
        this.logger.error('Error updating connection status', {
          correlationId,
          connectionId,
          status,
          error
        });
        return { data: null, error };
      }

      this.logger.info('Updated connection status', { 
        correlationId, 
        connectionId,
        status 
      });

      return { data: data as Connection, error: null };

    } catch (error) {
      this.logger.error('Exception updating connection status', {
        correlationId,
        connectionId,
        status,
        error: error as Error
      });
      return { data: null, error: error as Error };
    }
  }

  /**
   * Update connection config
   */
  async updateConfig(
    connectionId: string,
    config: Partial<Connection['config']>,
    correlationId?: string
  ) {
    try {
      this.logger.debug('Updating connection config', { 
        correlationId, 
        connectionId 
      });

      // First get current config
      const { data: current } = await this.findById(connectionId, correlationId);
      if (!current) {
        throw new Error('Connection not found');
      }

      const updatedConfig = {
        ...current.config,
        ...config
      };

      const { data, error } = await this.client
        .from(this.tableName)
        .update({ 
          config: updatedConfig,
          updated_at: new Date().toISOString()
        })
        .eq('id', connectionId)
        .select()
        .single();

      if (error) {
        this.logger.error('Error updating connection config', {
          correlationId,
          connectionId,
          error
        });
        return { data: null, error };
      }

      this.logger.info('Updated connection config', { 
        correlationId, 
        connectionId 
      });

      return { data: data as Connection, error: null };

    } catch (error) {
      this.logger.error('Exception updating connection config', {
        correlationId,
        connectionId,
        error: error as Error
      });
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get connection statistics by platform
   */
  async getConnectionStatsByPlatform(userId: string, correlationId?: string) {
    try {
      this.logger.debug('Getting connection statistics by platform', { 
        correlationId, 
        userId 
      });

      const { data, error } = await this.client
        .from(this.tableName)
        .select(`
          platform,
          status,
          agents!inner(user_id)
        `)
        .eq('agents.user_id', userId);

      if (error) {
        this.logger.error('Error getting connection statistics', {
          correlationId,
          userId,
          error
        });
        return { data: null, error };
      }

      // Group by platform and status
      const stats = (data as any[]).reduce((acc, connection) => {
        const platform = connection.platform;
        const status = connection.status;

        if (!acc[platform]) {
          acc[platform] = {
            total: 0,
            active: 0,
            inactive: 0,
            error: 0,
            pending: 0
          };
        }

        acc[platform].total++;
        acc[platform][status]++;

        return acc;
      }, {} as Record<string, any>);

      this.logger.debug('Retrieved connection statistics', { 
        correlationId, 
        userId,
        stats 
      });

      return { data: stats, error: null };

    } catch (error) {
      this.logger.error('Exception getting connection statistics', {
        correlationId,
        userId,
        error: error as Error
      });
      return { data: null, error: error as Error };
    }
  }

  /**
   * Find connections needing webhook verification
   */
  async findPendingWebhookVerification(correlationId?: string) {
    try {
      this.logger.debug('Finding connections needing webhook verification', { 
        correlationId 
      });

      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('status', 'pending')
        .is('metadata->webhook_verified', null)
        .order('created_at', { ascending: true })
        .limit(10);

      if (error) {
        this.logger.error('Error finding connections needing webhook verification', {
          correlationId,
          error
        });
        return { data: [], error };
      }

      return { data: (data as Connection[]) || [], error: null };

    } catch (error) {
      this.logger.error('Exception finding connections needing webhook verification', {
        correlationId,
        error: error as Error
      });
      return { data: [], error: error as Error };
    }
  }
}
