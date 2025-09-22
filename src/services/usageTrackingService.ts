/**
 * Usage Tracking Service
 * Tracks LLM usage, costs, and generates analytics reports
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { ErrorFactory } from '@/lib/errors';

export interface UsageLog {
  id: string;
  agentId: string;
  conversationId: string;
  messageId: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd?: number;
  latencyMs: number;
  requestId: string;
  responseStatus: 'success' | 'error' | 'timeout';
  errorMessage?: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface UsageReport {
  totalTokens: number;
  totalCost: number;
  requestCount: number;
  averageLatency: number;
  successRate: number;
  modelBreakdown: Record<string, {
    tokens: number;
    cost: number;
    requests: number;
    averageLatency: number;
  }>;
  providerBreakdown: Record<string, {
    tokens: number;
    cost: number;
    requests: number;
    averageLatency: number;
  }>;
  dailyUsage: Array<{
    date: string;
    tokens: number;
    cost: number;
    requests: number;
  }>;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export class UsageTrackingService {
  private supabase;
  
  constructor() {
    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  
  /**
   * Log LLM usage
   */
  async logUsage(usage: UsageLog): Promise<void> {
    try {
      const usageData = {
        id: usage.id,
        agent_id: usage.agentId,
        conversation_id: usage.conversationId,
        message_id: usage.messageId,
        provider: usage.provider,
        model: usage.model,
        tokens_input: usage.promptTokens,
        tokens_output: usage.completionTokens,
        tokens_total: usage.totalTokens,
        cost_usd: usage.costUsd,
        latency_ms: usage.latencyMs,
        request_id: usage.requestId,
        response_status: usage.responseStatus,
        error_message: usage.errorMessage,
        metadata: usage.metadata,
        created_at: usage.createdAt.toISOString()
      };
      
      const { error } = await this.supabase
        .from('llm_usage_logs')
        .insert(usageData);
      
      if (error) {
        console.error('Failed to log usage:', error);
        throw ErrorFactory.database(`Failed to log usage: ${error.message}`);
      }
      
    } catch (error) {
      console.error('Usage logging error:', error);
      // Don't throw error to prevent breaking the main flow
    }
  }
  
  /**
   * Get usage report for a user
   */
  async getUserUsage(
    userId: string,
    period: DateRange,
    correlationId: string
  ): Promise<UsageReport> {
    try {
      const { data: logs, error } = await this.supabase
        .from('llm_usage_logs')
        .select(`
          *,
          agents!inner(user_id)
        `)
        .eq('agents.user_id', userId)
        .gte('created_at', period.start.toISOString())
        .lte('created_at', period.end.toISOString());
      
      if (error) {
        throw ErrorFactory.database(`Failed to fetch usage data: ${error.message}`, correlationId);
      }
      
      return this.generateUsageReport(logs || []);
      
    } catch (error) {
      console.error('Failed to get user usage:', error);
      throw error;
    }
  }
  
  /**
   * Get usage report for an agent
   */
  async getAgentUsage(
    agentId: string,
    period: DateRange,
    correlationId: string
  ): Promise<UsageReport> {
    try {
      const { data: logs, error } = await this.supabase
        .from('llm_usage_logs')
        .select('*')
        .eq('agent_id', agentId)
        .gte('created_at', period.start.toISOString())
        .lte('created_at', period.end.toISOString());
      
      if (error) {
        throw ErrorFactory.database(`Failed to fetch agent usage data: ${error.message}`, correlationId);
      }
      
      return this.generateUsageReport(logs || []);
      
    } catch (error) {
      console.error('Failed to get agent usage:', error);
      throw error;
    }
  }
  
  /**
   * Get usage summary for dashboard
   */
  async getUsageSummary(
    userId: string,
    correlationId: string
  ): Promise<{
    today: { tokens: number; cost: number; requests: number };
    thisMonth: { tokens: number; cost: number; requests: number };
    lastMonth: { tokens: number; cost: number; requests: number };
  }> {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      
      const [todayUsage, thisMonthUsage, lastMonthUsage] = await Promise.all([
        this.getUserUsage(userId, { start: todayStart, end: now }, correlationId),
        this.getUserUsage(userId, { start: monthStart, end: now }, correlationId),
        this.getUserUsage(userId, { start: lastMonthStart, end: lastMonthEnd }, correlationId)
      ]);
      
      return {
        today: {
          tokens: todayUsage.totalTokens,
          cost: todayUsage.totalCost,
          requests: todayUsage.requestCount
        },
        thisMonth: {
          tokens: thisMonthUsage.totalTokens,
          cost: thisMonthUsage.totalCost,
          requests: thisMonthUsage.requestCount
        },
        lastMonth: {
          tokens: lastMonthUsage.totalTokens,
          cost: lastMonthUsage.totalCost,
          requests: lastMonthUsage.requestCount
        }
      };
      
    } catch (error) {
      console.error('Failed to get usage summary:', error);
      throw error;
    }
  }
  
  /**
   * Check if user is approaching usage limits
   */
  async checkUsageLimits(
    userId: string,
    subscriptionTier: 'free' | 'pro' | 'enterprise',
    correlationId: string
  ): Promise<{
    isNearLimit: boolean;
    percentUsed: number;
    limit: number;
    current: number;
    resetDate: Date;
  }> {
    try {
      // Define limits per subscription tier
      const limits = {
        free: { tokens: 10000, requests: 100 },
        pro: { tokens: 1000000, requests: 10000 },
        enterprise: { tokens: 10000000, requests: 100000 }
      };
      
      const limit = limits[subscriptionTier];
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      
      const usage = await this.getUserUsage(
        userId,
        { start: monthStart, end: now },
        correlationId
      );
      
      const percentUsed = (usage.totalTokens / limit.tokens) * 100;
      const isNearLimit = percentUsed >= 80; // 80% threshold
      
      return {
        isNearLimit,
        percentUsed,
        limit: limit.tokens,
        current: usage.totalTokens,
        resetDate: nextMonth
      };
      
    } catch (error) {
      console.error('Failed to check usage limits:', error);
      throw error;
    }
  }
  
  // Private helper methods
  
  private generateUsageReport(logs: any[]): UsageReport {
    const report: UsageReport = {
      totalTokens: 0,
      totalCost: 0,
      requestCount: logs.length,
      averageLatency: 0,
      successRate: 0,
      modelBreakdown: {},
      providerBreakdown: {},
      dailyUsage: []
    };
    
    if (logs.length === 0) {
      return report;
    }
    
    let totalLatency = 0;
    let successCount = 0;
    const dailyUsageMap = new Map<string, { tokens: number; cost: number; requests: number }>();
    
    for (const log of logs) {
      // Totals
      report.totalTokens += log.tokens_total || 0;
      report.totalCost += log.cost_usd || 0;
      totalLatency += log.latency_ms || 0;
      
      if (log.response_status === 'success') {
        successCount++;
      }
      
      // Model breakdown
      if (!report.modelBreakdown[log.model]) {
        report.modelBreakdown[log.model] = {
          tokens: 0,
          cost: 0,
          requests: 0,
          averageLatency: 0
        };
      }
      
      const modelStats = report.modelBreakdown[log.model];
      modelStats.tokens += log.tokens_total || 0;
      modelStats.cost += log.cost_usd || 0;
      modelStats.requests++;
      modelStats.averageLatency = (modelStats.averageLatency * (modelStats.requests - 1) + (log.latency_ms || 0)) / modelStats.requests;
      
      // Provider breakdown
      if (!report.providerBreakdown[log.provider]) {
        report.providerBreakdown[log.provider] = {
          tokens: 0,
          cost: 0,
          requests: 0,
          averageLatency: 0
        };
      }
      
      const providerStats = report.providerBreakdown[log.provider];
      providerStats.tokens += log.tokens_total || 0;
      providerStats.cost += log.cost_usd || 0;
      providerStats.requests++;
      providerStats.averageLatency = (providerStats.averageLatency * (providerStats.requests - 1) + (log.latency_ms || 0)) / providerStats.requests;
      
      // Daily usage
      const date = new Date(log.created_at).toISOString().split('T')[0];
      if (!dailyUsageMap.has(date)) {
        dailyUsageMap.set(date, { tokens: 0, cost: 0, requests: 0 });
      }
      
      const dailyStats = dailyUsageMap.get(date)!;
      dailyStats.tokens += log.tokens_total || 0;
      dailyStats.cost += log.cost_usd || 0;
      dailyStats.requests++;
    }
    
    // Calculate averages
    report.averageLatency = totalLatency / logs.length;
    report.successRate = (successCount / logs.length) * 100;
    
    // Convert daily usage map to array
    report.dailyUsage = Array.from(dailyUsageMap.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    return report;
  }
}

// Singleton instance
let usageTrackingInstance: UsageTrackingService | null = null;

/**
 * Get or create usage tracking service singleton
 */
export function getUsageTrackingService(): UsageTrackingService {
  if (!usageTrackingInstance) {
    usageTrackingInstance = new UsageTrackingService();
  }
  return usageTrackingInstance;
}

// Export types
export type { UsageReport, DateRange };
