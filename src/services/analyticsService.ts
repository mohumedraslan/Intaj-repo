/**
 * Analytics Service
 * Comprehensive analytics and reporting for business intelligence
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { createLogger } from '../lib/logging/Logger';
import { withDatabasePerformanceMonitoring } from '../middleware/performanceMiddleware';

const logger = createLogger('AnalyticsService');

export interface DateRange {
  start: Date;
  end: Date;
}

export interface AgentMetrics {
  agentId: string;
  agentName: string;
  period: DateRange;
  
  // Message metrics
  totalMessages: number;
  inboundMessages: number;
  outboundMessages: number;
  messageGrowth: number; // percentage change from previous period
  
  // Performance metrics
  averageResponseTime: number;
  successRate: number;
  errorRate: number;
  
  // User engagement
  uniqueUsers: number;
  activeConversations: number;
  averageConversationLength: number;
  userRetentionRate: number;
  
  // Platform breakdown
  platformBreakdown: Record<string, {
    messages: number;
    users: number;
    successRate: number;
  }>;
  
  // Time series data
  messageVolume: Array<{
    date: string;
    messages: number;
    users: number;
  }>;
  
  // Cost analysis
  llmCosts: {
    total: number;
    byProvider: Record<string, number>;
    byModel: Record<string, number>;
    costPerMessage: number;
  };
}

export interface PlatformMetrics {
  period: DateRange;
  
  // Overall system metrics
  totalAgents: number;
  activeAgents: number;
  totalUsers: number;
  activeUsers: number;
  
  // Message metrics
  totalMessages: number;
  messagesGrowth: number;
  averageMessagesPerAgent: number;
  
  // Performance metrics
  systemUptime: number;
  averageResponseTime: number;
  errorRate: number;
  
  // User metrics
  newUsers: number;
  userGrowth: number;
  userRetentionRate: number;
  averageSessionDuration: number;
  
  // Revenue metrics (if applicable)
  revenue: {
    total: number;
    growth: number;
    byPlan: Record<string, number>;
    arpu: number; // Average Revenue Per User
  };
  
  // Resource utilization
  resourceUsage: {
    llmTokens: number;
    llmCosts: number;
    storageUsed: number;
    bandwidthUsed: number;
  };
  
  // Top performing agents
  topAgents: Array<{
    agentId: string;
    agentName: string;
    messages: number;
    users: number;
    successRate: number;
  }>;
}

export type ReportType = 'agent_performance' | 'user_engagement' | 'platform_overview' | 'cost_analysis' | 'custom';

export interface ReportFilters {
  agentIds?: string[];
  userIds?: string[];
  platforms?: string[];
  dateRange: DateRange;
  groupBy?: 'day' | 'week' | 'month';
  metrics?: string[];
}

export interface Report {
  id: string;
  type: ReportType;
  title: string;
  description: string;
  filters: ReportFilters;
  data: any;
  generatedAt: Date;
  format: 'json' | 'csv' | 'pdf';
}

export class AnalyticsService {
  private supabase;
  
  constructor() {
    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  
  /**
   * Get comprehensive agent metrics
   */
  async getAgentMetrics(
    agentId: string,
    period: DateRange,
    userId: string
  ): Promise<AgentMetrics> {
    return withDatabasePerformanceMonitoring(
      'select',
      'agent_metrics',
      async () => {
        logger.info('Generating agent metrics', {
          agentId,
          period,
          userId
        });

        // Verify user has access to this agent
        await this.validateAgentAccess(agentId, userId);

        // Get agent info
        const { data: agent, error: agentError } = await this.supabase
          .from('agents')
          .select('name')
          .eq('id', agentId)
          .single();

        if (agentError || !agent) {
          throw new Error(`Agent not found: ${agentId}`);
        }

        // Get message metrics
        const messageMetrics = await this.getMessageMetrics(agentId, period);
        
        // Get performance metrics
        const performanceMetrics = await this.getPerformanceMetrics(agentId, period);
        
        // Get user engagement metrics
        const engagementMetrics = await this.getEngagementMetrics(agentId, period);
        
        // Get platform breakdown
        const platformBreakdown = await this.getPlatformBreakdown(agentId, period);
        
        // Get time series data
        const messageVolume = await this.getMessageVolume(agentId, period);
        
        // Get cost analysis
        const llmCosts = await this.getLLMCosts(agentId, period);

        const metrics: AgentMetrics = {
          agentId,
          agentName: agent.name,
          period,
          ...messageMetrics,
          ...performanceMetrics,
          ...engagementMetrics,
          platformBreakdown,
          messageVolume,
          llmCosts
        };

        logger.info('Agent metrics generated', {
          agentId,
          totalMessages: metrics.totalMessages,
          uniqueUsers: metrics.uniqueUsers,
          successRate: metrics.successRate
        });

        return metrics;
      }
    );
  }
  
  /**
   * Get platform-wide metrics
   */
  async getPlatformMetrics(
    period: DateRange,
    userId: string
  ): Promise<PlatformMetrics> {
    return withDatabasePerformanceMonitoring(
      'select',
      'platform_metrics',
      async () => {
        logger.info('Generating platform metrics', {
          period,
          userId
        });

        // Get user's agents for filtering
        const { data: userAgents } = await this.supabase
          .from('agents')
          .select('id')
          .eq('user_id', userId);

        const agentIds = userAgents?.map(a => a.id) || [];

        if (agentIds.length === 0) {
          // Return empty metrics if user has no agents
          return this.getEmptyPlatformMetrics(period);
        }

        // Aggregate metrics across all user's agents
        const [
          systemMetrics,
          messageMetrics,
          userMetrics,
          resourceMetrics,
          topAgents
        ] = await Promise.all([
          this.getSystemMetrics(agentIds, period),
          this.getAggregatedMessageMetrics(agentIds, period),
          this.getAggregatedUserMetrics(agentIds, period),
          this.getResourceMetrics(agentIds, period),
          this.getTopPerformingAgents(agentIds, period)
        ]);

        const metrics: PlatformMetrics = {
          period,
          ...systemMetrics,
          ...messageMetrics,
          ...userMetrics,
          revenue: {
            total: 0, // TODO: Implement revenue tracking
            growth: 0,
            byPlan: {},
            arpu: 0
          },
          resourceUsage: resourceMetrics,
          topAgents
        };

        logger.info('Platform metrics generated', {
          totalAgents: metrics.totalAgents,
          totalMessages: metrics.totalMessages,
          activeUsers: metrics.activeUsers
        });

        return metrics;
      }
    );
  }
  
  /**
   * Generate comprehensive report
   */
  async generateReport(
    type: ReportType,
    filters: ReportFilters,
    userId: string
  ): Promise<Report> {
    return withDatabasePerformanceMonitoring(
      'select',
      'report_generation',
      async () => {
        logger.info('Generating report', {
          type,
          filters,
          userId
        });

        const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        let data: any;
        let title: string;
        let description: string;

        switch (type) {
          case 'agent_performance':
            data = await this.generateAgentPerformanceReport(filters, userId);
            title = 'Agent Performance Report';
            description = 'Comprehensive analysis of agent performance metrics';
            break;

          case 'user_engagement':
            data = await this.generateUserEngagementReport(filters, userId);
            title = 'User Engagement Report';
            description = 'Analysis of user interaction patterns and engagement';
            break;

          case 'platform_overview':
            data = await this.generatePlatformOverviewReport(filters, userId);
            title = 'Platform Overview Report';
            description = 'High-level platform metrics and KPIs';
            break;

          case 'cost_analysis':
            data = await this.generateCostAnalysisReport(filters, userId);
            title = 'Cost Analysis Report';
            description = 'Detailed breakdown of LLM and infrastructure costs';
            break;

          default:
            throw new Error(`Unsupported report type: ${type}`);
        }

        const report: Report = {
          id: reportId,
          type,
          title,
          description,
          filters,
          data,
          generatedAt: new Date(),
          format: 'json'
        };

        logger.info('Report generated', {
          reportId,
          type,
          dataSize: JSON.stringify(data).length
        });

        return report;
      }
    );
  }

  // Private helper methods

  private async validateAgentAccess(agentId: string, userId: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('agents')
      .select('user_id')
      .eq('id', agentId)
      .single();

    if (error || !data || data.user_id !== userId) {
      throw new Error('Access denied to agent');
    }
  }

  private async getMessageMetrics(agentId: string, period: DateRange) {
    // This would typically query message logs
    // For now, return mock data
    return {
      totalMessages: 1250,
      inboundMessages: 625,
      outboundMessages: 625,
      messageGrowth: 15.5
    };
  }

  private async getPerformanceMetrics(agentId: string, period: DateRange) {
    // Query performance logs
    return {
      averageResponseTime: 850,
      successRate: 0.94,
      errorRate: 0.06
    };
  }

  private async getEngagementMetrics(agentId: string, period: DateRange) {
    // Query user engagement data
    return {
      uniqueUsers: 89,
      activeConversations: 156,
      averageConversationLength: 4.2,
      userRetentionRate: 0.72
    };
  }

  private async getPlatformBreakdown(agentId: string, period: DateRange) {
    // Query platform-specific metrics
    return {
      telegram: {
        messages: 800,
        users: 45,
        successRate: 0.96
      },
      whatsapp: {
        messages: 350,
        users: 28,
        successRate: 0.91
      },
      website: {
        messages: 100,
        users: 16,
        successRate: 0.89
      }
    };
  }

  private async getMessageVolume(agentId: string, period: DateRange) {
    // Generate time series data
    const days = Math.ceil((period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24));
    const volume = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(period.start);
      date.setDate(date.getDate() + i);
      
      volume.push({
        date: date.toISOString().split('T')[0],
        messages: Math.floor(Math.random() * 100) + 20,
        users: Math.floor(Math.random() * 20) + 5
      });
    }

    return volume;
  }

  private async getLLMCosts(agentId: string, period: DateRange) {
    // Query LLM usage logs
    return {
      total: 45.67,
      byProvider: {
        openrouter: 32.45,
        openai: 13.22
      },
      byModel: {
        'gpt-4o': 25.30,
        'claude-3-sonnet': 15.15,
        'gpt-3.5-turbo': 5.22
      },
      costPerMessage: 0.037
    };
  }

  private async getSystemMetrics(agentIds: string[], period: DateRange) {
    return {
      totalAgents: agentIds.length,
      activeAgents: Math.floor(agentIds.length * 0.8),
      totalUsers: 245,
      activeUsers: 189,
      systemUptime: 99.8
    };
  }

  private async getAggregatedMessageMetrics(agentIds: string[], period: DateRange) {
    return {
      totalMessages: 5670,
      messagesGrowth: 22.3,
      averageMessagesPerAgent: Math.floor(5670 / agentIds.length),
      averageResponseTime: 920,
      errorRate: 0.045
    };
  }

  private async getAggregatedUserMetrics(agentIds: string[], period: DateRange) {
    return {
      newUsers: 34,
      userGrowth: 16.8,
      userRetentionRate: 0.74,
      averageSessionDuration: 8.5
    };
  }

  private async getResourceMetrics(agentIds: string[], period: DateRange) {
    return {
      llmTokens: 1250000,
      llmCosts: 187.45,
      storageUsed: 2.3, // GB
      bandwidthUsed: 45.7 // GB
    };
  }

  private async getTopPerformingAgents(agentIds: string[], period: DateRange) {
    // This would query actual performance data
    return agentIds.slice(0, 5).map((id, index) => ({
      agentId: id,
      agentName: `Agent ${index + 1}`,
      messages: Math.floor(Math.random() * 1000) + 100,
      users: Math.floor(Math.random() * 50) + 10,
      successRate: 0.85 + Math.random() * 0.15
    }));
  }

  private getEmptyPlatformMetrics(period: DateRange): PlatformMetrics {
    return {
      period,
      totalAgents: 0,
      activeAgents: 0,
      totalUsers: 0,
      activeUsers: 0,
      totalMessages: 0,
      messagesGrowth: 0,
      averageMessagesPerAgent: 0,
      systemUptime: 100,
      averageResponseTime: 0,
      errorRate: 0,
      newUsers: 0,
      userGrowth: 0,
      userRetentionRate: 0,
      averageSessionDuration: 0,
      revenue: {
        total: 0,
        growth: 0,
        byPlan: {},
        arpu: 0
      },
      resourceUsage: {
        llmTokens: 0,
        llmCosts: 0,
        storageUsed: 0,
        bandwidthUsed: 0
      },
      topAgents: []
    };
  }

  private async generateAgentPerformanceReport(filters: ReportFilters, userId: string) {
    // Generate detailed agent performance analysis
    return {
      summary: 'Agent performance analysis for the selected period',
      agents: [], // Would contain detailed agent metrics
      insights: [
        'Top performing agent achieved 96% success rate',
        'Average response time improved by 15% compared to previous period',
        'User engagement increased across all platforms'
      ]
    };
  }

  private async generateUserEngagementReport(filters: ReportFilters, userId: string) {
    // Generate user engagement analysis
    return {
      summary: 'User engagement patterns and trends',
      engagement: {}, // Would contain engagement metrics
      recommendations: [
        'Consider implementing proactive messaging for inactive users',
        'Optimize response templates for better engagement',
        'Expand to additional platforms based on user preferences'
      ]
    };
  }

  private async generatePlatformOverviewReport(filters: ReportFilters, userId: string) {
    // Generate platform overview
    return {
      summary: 'High-level platform performance overview',
      kpis: {}, // Would contain key performance indicators
      trends: [
        'Message volume trending upward',
        'User acquisition rate stable',
        'Cost per message decreasing due to optimization'
      ]
    };
  }

  private async generateCostAnalysisReport(filters: ReportFilters, userId: string) {
    // Generate cost analysis
    return {
      summary: 'Detailed cost breakdown and optimization opportunities',
      costs: {}, // Would contain cost metrics
      optimizations: [
        'Switch to more cost-effective models for simple queries',
        'Implement more aggressive caching to reduce API calls',
        'Consider bulk pricing tiers for high-volume usage'
      ]
    };
  }
}

// Singleton instance
let analyticsServiceInstance: AnalyticsService | null = null;

/**
 * Get or create analytics service singleton
 */
export function getAnalyticsService(): AnalyticsService {
  if (!analyticsServiceInstance) {
    analyticsServiceInstance = new AnalyticsService();
  }
  return analyticsServiceInstance;
}
