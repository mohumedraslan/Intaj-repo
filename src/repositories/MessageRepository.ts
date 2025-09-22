/**
 * Message repository for managing conversation messages
 */

import { BaseRepository, BaseEntity } from './base/BaseRepository';

/**
 * Message entity interface
 */
export interface Message extends BaseEntity {
  id: string;
  agent_id: string;
  user_id: string;
  conversation_id?: string;
  content: string;
  direction: 'inbound' | 'outbound';
  status: 'pending' | 'processing' | 'sent' | 'delivered' | 'failed';
  platform?: string;
  platform_message_id?: string;
  metadata?: {
    sender_id?: string;
    sender_name?: string;
    chat_id?: string;
    message_type?: string;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
}

/**
 * Message repository class
 */
export class MessageRepository extends BaseRepository<Message> {
  constructor() {
    super('messages');
  }

  /**
   * Find messages by conversation ID
   */
  async findByConversationId(
    conversationId: string,
    limit: number = 50,
    correlationId?: string
  ) {
    try {
      this.logger.debug('Finding messages by conversation ID', { 
        correlationId, 
        conversationId,
        limit 
      });

      const { data, error, count } = await this.client
        .from(this.tableName)
        .select('*', { count: 'exact' })
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        this.logger.error('Error finding messages by conversation ID', {
          correlationId,
          conversationId,
          error
        });
        return { data: [], count: 0, error };
      }

      return { 
        data: (data as Message[]) || [], 
        count: count || 0, 
        error: null 
      };

    } catch (error) {
      this.logger.error('Exception finding messages by conversation ID', {
        correlationId,
        conversationId,
        error: error as Error
      });
      return { data: [], count: 0, error: error as Error };
    }
  }

  /**
   * Find messages by agent ID
   */
  async findByAgentId(
    agentId: string,
    limit: number = 100,
    offset: number = 0,
    correlationId?: string
  ) {
    try {
      this.logger.debug('Finding messages by agent ID', { 
        correlationId, 
        agentId,
        limit,
        offset 
      });

      const { data, error, count } = await this.client
        .from(this.tableName)
        .select('*', { count: 'exact' })
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        this.logger.error('Error finding messages by agent ID', {
          correlationId,
          agentId,
          error
        });
        return { data: [], count: 0, error };
      }

      return { 
        data: (data as Message[]) || [], 
        count: count || 0, 
        error: null 
      };

    } catch (error) {
      this.logger.error('Exception finding messages by agent ID', {
        correlationId,
        agentId,
        error: error as Error
      });
      return { data: [], count: 0, error: error as Error };
    }
  }

  /**
   * Find pending messages for processing
   */
  async findPendingMessages(limit: number = 10, correlationId?: string) {
    try {
      this.logger.debug('Finding pending messages', { 
        correlationId, 
        limit 
      });

      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('status', 'pending')
        .eq('direction', 'inbound')
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        this.logger.error('Error finding pending messages', {
          correlationId,
          error
        });
        return { data: [], error };
      }

      this.logger.debug('Found pending messages', { 
        correlationId, 
        count: data?.length || 0
      });

      return { data: (data as Message[]) || [], error: null };

    } catch (error) {
      this.logger.error('Exception finding pending messages', {
        correlationId,
        error: error as Error
      });
      return { data: [], error: error as Error };
    }
  }

  /**
   * Update message status
   */
  async updateStatus(
    messageId: string,
    status: Message['status'],
    correlationId?: string
  ) {
    try {
      this.logger.debug('Updating message status', { 
        correlationId, 
        messageId,
        status 
      });

      const { data, error } = await this.client
        .from(this.tableName)
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .select()
        .single();

      if (error) {
        this.logger.error('Error updating message status', {
          correlationId,
          messageId,
          status,
          error
        });
        return { data: null, error };
      }

      this.logger.info('Updated message status', { 
        correlationId, 
        messageId,
        status 
      });

      return { data: data as Message, error: null };

    } catch (error) {
      this.logger.error('Exception updating message status', {
        correlationId,
        messageId,
        status,
        error: error as Error
      });
      return { data: null, error: error as Error };
    }
  }

  /**
   * Find message by platform message ID
   */
  async findByPlatformMessageId(
    platformMessageId: string,
    platform: string,
    correlationId?: string
  ) {
    try {
      this.logger.debug('Finding message by platform message ID', { 
        correlationId, 
        platformMessageId,
        platform 
      });

      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('platform_message_id', platformMessageId)
        .eq('platform', platform)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        this.logger.error('Error finding message by platform message ID', {
          correlationId,
          platformMessageId,
          platform,
          error
        });
        return { data: null, error };
      }

      return { data: data as Message || null, error: null };

    } catch (error) {
      this.logger.error('Exception finding message by platform message ID', {
        correlationId,
        platformMessageId,
        platform,
        error: error as Error
      });
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get message statistics for an agent
   */
  async getMessageStats(agentId: string, correlationId?: string) {
    try {
      this.logger.debug('Getting message statistics', { correlationId, agentId });

      // Get total message count
      const { count: totalCount } = await this.client
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agentId);

      // Get inbound message count
      const { count: inboundCount } = await this.client
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agentId)
        .eq('direction', 'inbound');

      // Get outbound message count
      const { count: outboundCount } = await this.client
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agentId)
        .eq('direction', 'outbound');

      // Get failed message count
      const { count: failedCount } = await this.client
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agentId)
        .eq('status', 'failed');

      const stats = {
        totalCount: totalCount || 0,
        inboundCount: inboundCount || 0,
        outboundCount: outboundCount || 0,
        failedCount: failedCount || 0,
        successRate: totalCount ? ((totalCount - (failedCount || 0)) / totalCount) * 100 : 0
      };

      this.logger.debug('Retrieved message statistics', { 
        correlationId, 
        agentId,
        stats 
      });

      return { data: stats, error: null };

    } catch (error) {
      this.logger.error('Exception getting message statistics', {
        correlationId,
        agentId,
        error: error as Error
      });
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get recent messages for dashboard
   */
  async getRecentMessages(
    userId: string,
    limit: number = 10,
    correlationId?: string
  ) {
    try {
      this.logger.debug('Getting recent messages', { 
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
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        this.logger.error('Error getting recent messages', {
          correlationId,
          userId,
          error
        });
        return { data: [], error };
      }

      return { data: (data as any[]) || [], error: null };

    } catch (error) {
      this.logger.error('Exception getting recent messages', {
        correlationId,
        userId,
        error: error as Error
      });
      return { data: [], error: error as Error };
    }
  }
}
