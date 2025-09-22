/**
 * Conversation repository for managing chat conversations
 */

import { BaseRepository, BaseEntity } from './base/BaseRepository';

/**
 * Conversation entity interface
 */
export interface Conversation extends BaseEntity {
  id: string;
  agent_id: string;
  user_id: string;
  connection_id?: string;
  external_id: string; // Platform-specific conversation ID
  platform: string;
  status: 'active' | 'closed' | 'archived';
  last_message_at?: string;
  metadata?: {
    participant_name?: string;
    participant_id?: string;
    chat_type?: string;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
}

/**
 * Conversation repository class
 */
export class ConversationRepository extends BaseRepository<Conversation> {
  constructor() {
    super('conversations');
  }

  /**
   * Find conversation by external ID and platform
   */
  async findByExternalId(
    externalId: string,
    platform: string,
    correlationId?: string
  ) {
    try {
      this.logger.debug('Finding conversation by external ID', { 
        correlationId, 
        externalId,
        platform 
      });

      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('external_id', externalId)
        .eq('platform', platform)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        this.logger.error('Error finding conversation by external ID', {
          correlationId,
          externalId,
          platform,
          error
        });
        return { data: null, error };
      }

      return { data: data as Conversation || null, error: null };

    } catch (error) {
      this.logger.error('Exception finding conversation by external ID', {
        correlationId,
        externalId,
        platform,
        error: error as Error
      });
      return { data: null, error: error as Error };
    }
  }

  /**
   * Find conversations by agent ID
   */
  async findByAgentId(
    agentId: string,
    limit: number = 50,
    offset: number = 0,
    correlationId?: string
  ) {
    try {
      this.logger.debug('Finding conversations by agent ID', { 
        correlationId, 
        agentId,
        limit,
        offset 
      });

      const { data, error, count } = await this.client
        .from(this.tableName)
        .select('*', { count: 'exact' })
        .eq('agent_id', agentId)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .range(offset, offset + limit - 1);

      if (error) {
        this.logger.error('Error finding conversations by agent ID', {
          correlationId,
          agentId,
          error
        });
        return { data: [], count: 0, error };
      }

      return { 
        data: (data as Conversation[]) || [], 
        count: count || 0, 
        error: null 
      };

    } catch (error) {
      this.logger.error('Exception finding conversations by agent ID', {
        correlationId,
        agentId,
        error: error as Error
      });
      return { data: [], count: 0, error: error as Error };
    }
  }

  /**
   * Find active conversations by user ID
   */
  async findActiveByUserId(
    userId: string,
    limit: number = 20,
    correlationId?: string
  ) {
    try {
      this.logger.debug('Finding active conversations by user ID', { 
        correlationId, 
        userId,
        limit 
      });

      const { data, error } = await this.client
        .from(this.tableName)
        .select(`
          *,
          agents!inner(name, user_id)
        `)
        .eq('agents.user_id', userId)
        .eq('status', 'active')
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .limit(limit);

      if (error) {
        this.logger.error('Error finding active conversations by user ID', {
          correlationId,
          userId,
          error
        });
        return { data: [], error };
      }

      return { data: (data as any[]) || [], error: null };

    } catch (error) {
      this.logger.error('Exception finding active conversations by user ID', {
        correlationId,
        userId,
        error: error as Error
      });
      return { data: [], error: error as Error };
    }
  }

  /**
   * Update last message timestamp
   */
  async updateLastMessageAt(
    conversationId: string,
    timestamp?: string,
    correlationId?: string
  ) {
    try {
      this.logger.debug('Updating conversation last message timestamp', { 
        correlationId, 
        conversationId 
      });

      const lastMessageAt = timestamp || new Date().toISOString();

      const { data, error } = await this.client
        .from(this.tableName)
        .update({ 
          last_message_at: lastMessageAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)
        .select()
        .single();

      if (error) {
        this.logger.error('Error updating conversation last message timestamp', {
          correlationId,
          conversationId,
          error
        });
        return { data: null, error };
      }

      this.logger.debug('Updated conversation last message timestamp', { 
        correlationId, 
        conversationId 
      });

      return { data: data as Conversation, error: null };

    } catch (error) {
      this.logger.error('Exception updating conversation last message timestamp', {
        correlationId,
        conversationId,
        error: error as Error
      });
      return { data: null, error: error as Error };
    }
  }

  /**
   * Update conversation status
   */
  async updateStatus(
    conversationId: string,
    status: Conversation['status'],
    correlationId?: string
  ) {
    try {
      this.logger.debug('Updating conversation status', { 
        correlationId, 
        conversationId,
        status 
      });

      const { data, error } = await this.client
        .from(this.tableName)
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)
        .select()
        .single();

      if (error) {
        this.logger.error('Error updating conversation status', {
          correlationId,
          conversationId,
          status,
          error
        });
        return { data: null, error };
      }

      this.logger.info('Updated conversation status', { 
        correlationId, 
        conversationId,
        status 
      });

      return { data: data as Conversation, error: null };

    } catch (error) {
      this.logger.error('Exception updating conversation status', {
        correlationId,
        conversationId,
        status,
        error: error as Error
      });
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get conversation statistics for an agent
   */
  async getConversationStats(agentId: string, correlationId?: string) {
    try {
      this.logger.debug('Getting conversation statistics', { correlationId, agentId });

      // Get total conversation count
      const { count: totalCount } = await this.client
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agentId);

      // Get active conversation count
      const { count: activeCount } = await this.client
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agentId)
        .eq('status', 'active');

      // Get closed conversation count
      const { count: closedCount } = await this.client
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agentId)
        .eq('status', 'closed');

      // Get conversations from last 24 hours
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const { count: recentCount } = await this.client
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agentId)
        .gte('created_at', yesterday.toISOString());

      const stats = {
        totalCount: totalCount || 0,
        activeCount: activeCount || 0,
        closedCount: closedCount || 0,
        recentCount: recentCount || 0
      };

      this.logger.debug('Retrieved conversation statistics', { 
        correlationId, 
        agentId,
        stats 
      });

      return { data: stats, error: null };

    } catch (error) {
      this.logger.error('Exception getting conversation statistics', {
        correlationId,
        agentId,
        error: error as Error
      });
      return { data: null, error: error as Error };
    }
  }

  /**
   * Find or create conversation
   */
  async findOrCreate(
    conversationData: {
      agent_id: string;
      user_id: string;
      external_id: string;
      platform: string;
      connection_id?: string;
      metadata?: Conversation['metadata'];
    },
    correlationId?: string
  ) {
    try {
      this.logger.debug('Finding or creating conversation', { 
        correlationId, 
        externalId: conversationData.external_id,
        platform: conversationData.platform
      });

      // First try to find existing conversation
      const { data: existing } = await this.findByExternalId(
        conversationData.external_id,
        conversationData.platform,
        correlationId
      );

      if (existing) {
        this.logger.debug('Found existing conversation', { 
          correlationId, 
          conversationId: existing.id
        });
        return { data: existing, error: null };
      }

      // Create new conversation
      const { data, error } = await this.create({
        ...conversationData,
        status: 'active',
        last_message_at: new Date().toISOString()
      }, correlationId);

      if (error) {
        this.logger.error('Error creating new conversation', {
          correlationId,
          conversationData,
          error
        });
        return { data: null, error };
      }

      this.logger.info('Created new conversation', { 
        correlationId, 
        conversationId: data!.id
      });

      return { data, error: null };

    } catch (error) {
      this.logger.error('Exception finding or creating conversation', {
        correlationId,
        conversationData,
        error: error as Error
      });
      return { data: null, error: error as Error };
    }
  }
}
