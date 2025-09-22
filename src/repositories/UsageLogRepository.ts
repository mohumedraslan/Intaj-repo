/**
 * Repository for managing enhanced usage logs
 * Handles LLM usage tracking, costs, and performance metrics
 */

import { BaseRepository, RepositoryResult } from './base/BaseRepository';

export interface UsageLog {
  id: string;
  agent_id: string;
  conversation_id?: string;
  message_id?: string;
  provider: string;
  model: string;
  tokens_input: number;
  tokens_output: number;
  tokens_total: number; // Generated column
  cost_usd?: number;
  latency_ms?: number;
  request_id?: string;
  response_status: string;
  error_message?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface CreateUsageLogData {
  agent_id: string;
  conversation_id?: string;
  message_id?: string;
  provider: string;
  model: string;
  tokens_input: number;
  tokens_output: number;
  cost_usd?: number;
  latency_ms?: number;
  request_id?: string;
  response_status?: string;
  error_message?: string;
  metadata?: Record<string, any>;
}

export interface UsageStats {
  total_requests: number;
  total_tokens: number;
  total_cost: number;
  avg_latency: number;
  success_rate: number;
  top_models: Array<{ model: string; count: number; tokens: number }>;
  daily_usage: Array<{ date: string; requests: number; tokens: number; cost: number }>;
}

export class UsageLogRepository extends BaseRepository<UsageLog> {
  constructor() {
    super('usage_logs_enhanced');
  }

  /**
   * Find usage logs by agent ID
   */
  async findByAgentId(
    agentId: string,
    limit: number = 100,
    offset: number = 0,
    correlationId?: string
  ): Promise<RepositoryResult<UsageLog[]>> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Finding usage logs by agent ID', {
        correlationId,
        agentId,
        limit,
        offset,
        operation: 'findByAgentId'
      });

      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        this.logger.error('Failed to find usage logs by agent ID', {
          correlationId,
          agentId,
          error: error.message,
          duration: Date.now() - startTime
        });
        return { data: null, error: new Error(error.message) };
      }

      this.logger.info('Successfully found usage logs by agent ID', {
        correlationId,
        agentId,
        count: data?.length || 0,
        duration: Date.now() - startTime
      });

      return { data: data || [], error: null };
    } catch (error) {
      this.logger.error('Exception in findByAgentId', {
        correlationId,
        agentId,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      });
      return { data: null, error: new Error(error instanceof Error ? error.message : String(error)) };
    }
  }

  /**
   * Create a new usage log entry
   */
  async create(
    usageData: CreateUsageLogData,
    correlationId?: string
  ): Promise<RepositoryResult<UsageLog>> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Creating usage log', {
        correlationId,
        agentId: usageData.agent_id,
        provider: usageData.provider,
        model: usageData.model,
        tokens: usageData.tokens_input + usageData.tokens_output,
        operation: 'create'
      });

      const { data, error } = await this.client
        .from(this.tableName)
        .insert({
          ...usageData,
          response_status: usageData.response_status || 'success',
          metadata: usageData.metadata || {}
        })
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to create usage log', {
          correlationId,
          agentId: usageData.agent_id,
          error: error.message,
          duration: Date.now() - startTime
        });
        return { data: null, error: new Error(error.message) };
      }

      this.logger.info('Successfully created usage log', {
        correlationId,
        usageLogId: data.id,
        agentId: data.agent_id,
        tokens: data.tokens_total,
        duration: Date.now() - startTime
      });

      return { data, error: null };
    } catch (error) {
      this.logger.error('Exception in create', {
        correlationId,
        agentId: usageData.agent_id,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      });
      return { data: null, error: new Error(error instanceof Error ? error.message : String(error)) };
    }
  }
}