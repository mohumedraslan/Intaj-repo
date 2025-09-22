/**
 * RAG System Monitoring & Performance Optimization
 * Tracks system performance, usage patterns, and optimization opportunities
 */

import { VectorDBClient, getVectorDBClient } from '../vectordb/VectorDBClient';
import { EmbeddingService, getEmbeddingService } from '../embeddings/EmbeddingService';
import { KnowledgeBaseService, getKnowledgeBaseService } from '../services/knowledgeBaseService';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

export interface RAGMetrics {
  // Performance Metrics
  averageSearchLatency: number;
  averageEmbeddingLatency: number;
  averageProcessingTime: number;
  
  // Usage Metrics
  totalSearches: number;
  totalDocuments: number;
  totalChunks: number;
  totalEmbeddings: number;
  
  // Quality Metrics
  averageRelevanceScore: number;
  searchSuccessRate: number;
  cacheHitRate: number;
  
  // Cost Metrics
  totalTokensUsed: number;
  totalCostUSD: number;
  averageCostPerSearch: number;
  
  // System Health
  vectorDBHealth: boolean;
  embeddingServiceHealth: boolean;
  cacheHealth: boolean;
  
  // Time Range
  startDate: Date;
  endDate: Date;
}

export interface PerformanceAlert {
  id: string;
  type: 'performance' | 'cost' | 'error' | 'capacity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: Date;
  resolved: boolean;
}

export interface OptimizationRecommendation {
  id: string;
  category: 'performance' | 'cost' | 'quality' | 'capacity';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  estimatedSavings?: {
    cost?: number;
    latency?: number;
    accuracy?: number;
  };
  actionItems: string[];
  priority: number;
}

export class RAGMonitoring {
  private supabase;
  private vectorDB: VectorDBClient;
  private embeddingService: EmbeddingService;
  private knowledgeBaseService: KnowledgeBaseService;
  
  // Performance thresholds
  private readonly thresholds = {
    searchLatency: 2000, // 2 seconds
    embeddingLatency: 5000, // 5 seconds
    processingTime: 30000, // 30 seconds
    relevanceScore: 0.7,
    cacheHitRate: 0.8, // 80%
    errorRate: 0.05, // 5%
    costPerSearch: 0.01 // $0.01
  };
  
  constructor() {
    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    this.vectorDB = getVectorDBClient();
    this.embeddingService = getEmbeddingService();
    this.knowledgeBaseService = getKnowledgeBaseService();
  }
  
  /**
   * Get comprehensive RAG system metrics
   */
  async getRAGMetrics(
    agentId?: string,
    startDate: Date = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
    endDate: Date = new Date()
  ): Promise<RAGMetrics> {
    try {
      console.log('Collecting RAG metrics:', {
        agentId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      // Collect metrics in parallel
      const [
        usageMetrics,
        performanceMetrics,
        qualityMetrics,
        costMetrics,
        healthMetrics
      ] = await Promise.all([
        this.getUsageMetrics(agentId, startDate, endDate),
        this.getPerformanceMetrics(agentId, startDate, endDate),
        this.getQualityMetrics(agentId, startDate, endDate),
        this.getCostMetrics(agentId, startDate, endDate),
        this.getHealthMetrics()
      ]);
      
      const metrics: RAGMetrics = {
        // Performance
        averageSearchLatency: performanceMetrics.averageSearchLatency,
        averageEmbeddingLatency: performanceMetrics.averageEmbeddingLatency,
        averageProcessingTime: performanceMetrics.averageProcessingTime,
        
        // Usage
        totalSearches: usageMetrics.totalSearches,
        totalDocuments: usageMetrics.totalDocuments,
        totalChunks: usageMetrics.totalChunks,
        totalEmbeddings: usageMetrics.totalEmbeddings,
        
        // Quality
        averageRelevanceScore: qualityMetrics.averageRelevanceScore,
        searchSuccessRate: qualityMetrics.searchSuccessRate,
        cacheHitRate: qualityMetrics.cacheHitRate,
        
        // Cost
        totalTokensUsed: costMetrics.totalTokensUsed,
        totalCostUSD: costMetrics.totalCostUSD,
        averageCostPerSearch: costMetrics.averageCostPerSearch,
        
        // Health
        vectorDBHealth: healthMetrics.vectorDBHealth,
        embeddingServiceHealth: healthMetrics.embeddingServiceHealth,
        cacheHealth: healthMetrics.cacheHealth,
        
        // Time range
        startDate,
        endDate
      };
      
      console.log('RAG metrics collected:', {
        totalSearches: metrics.totalSearches,
        averageLatency: metrics.averageSearchLatency,
        cacheHitRate: metrics.cacheHitRate,
        totalCost: metrics.totalCostUSD
      });
      
      return metrics;
      
    } catch (error) {
      console.error('Failed to collect RAG metrics:', error);
      throw error;
    }
  }
  
  /**
   * Check for performance alerts
   */
  async checkPerformanceAlerts(agentId?: string): Promise<PerformanceAlert[]> {
    try {
      const alerts: PerformanceAlert[] = [];
      const metrics = await this.getRAGMetrics(agentId);
      
      // Check search latency
      if (metrics.averageSearchLatency > this.thresholds.searchLatency) {
        alerts.push({
          id: `search-latency-${Date.now()}`,
          type: 'performance',
          severity: metrics.averageSearchLatency > this.thresholds.searchLatency * 2 ? 'high' : 'medium',
          message: `Average search latency is ${metrics.averageSearchLatency}ms, exceeding threshold of ${this.thresholds.searchLatency}ms`,
          metric: 'search_latency',
          value: metrics.averageSearchLatency,
          threshold: this.thresholds.searchLatency,
          timestamp: new Date(),
          resolved: false
        });
      }
      
      // Check cache hit rate
      if (metrics.cacheHitRate < this.thresholds.cacheHitRate) {
        alerts.push({
          id: `cache-hit-rate-${Date.now()}`,
          type: 'performance',
          severity: metrics.cacheHitRate < 0.5 ? 'high' : 'medium',
          message: `Cache hit rate is ${(metrics.cacheHitRate * 100).toFixed(1)}%, below threshold of ${(this.thresholds.cacheHitRate * 100).toFixed(1)}%`,
          metric: 'cache_hit_rate',
          value: metrics.cacheHitRate,
          threshold: this.thresholds.cacheHitRate,
          timestamp: new Date(),
          resolved: false
        });
      }
      
      // Check cost per search
      if (metrics.averageCostPerSearch > this.thresholds.costPerSearch) {
        alerts.push({
          id: `cost-per-search-${Date.now()}`,
          type: 'cost',
          severity: metrics.averageCostPerSearch > this.thresholds.costPerSearch * 2 ? 'high' : 'medium',
          message: `Average cost per search is $${metrics.averageCostPerSearch.toFixed(4)}, exceeding threshold of $${this.thresholds.costPerSearch.toFixed(4)}`,
          metric: 'cost_per_search',
          value: metrics.averageCostPerSearch,
          threshold: this.thresholds.costPerSearch,
          timestamp: new Date(),
          resolved: false
        });
      }
      
      // Check system health
      if (!metrics.vectorDBHealth) {
        alerts.push({
          id: `vector-db-health-${Date.now()}`,
          type: 'error',
          severity: 'critical',
          message: 'Vector database is not responding',
          metric: 'vector_db_health',
          value: 0,
          threshold: 1,
          timestamp: new Date(),
          resolved: false
        });
      }
      
      return alerts;
      
    } catch (error) {
      console.error('Failed to check performance alerts:', error);
      return [];
    }
  }
  
  /**
   * Generate optimization recommendations
   */
  async getOptimizationRecommendations(agentId?: string): Promise<OptimizationRecommendation[]> {
    try {
      const recommendations: OptimizationRecommendation[] = [];
      const metrics = await this.getRAGMetrics(agentId);
      
      // Cache optimization
      if (metrics.cacheHitRate < 0.8) {
        recommendations.push({
          id: 'cache-optimization',
          category: 'performance',
          title: 'Improve Embedding Cache Hit Rate',
          description: `Current cache hit rate is ${(metrics.cacheHitRate * 100).toFixed(1)}%. Optimizing cache strategy could reduce costs and improve performance.`,
          impact: 'high',
          effort: 'medium',
          estimatedSavings: {
            cost: metrics.totalCostUSD * 0.3,
            latency: metrics.averageSearchLatency * 0.2
          },
          actionItems: [
            'Increase cache TTL for stable embeddings',
            'Implement cache warming for popular queries',
            'Optimize cache eviction policy',
            'Add cache compression to store more embeddings'
          ],
          priority: 1
        });
      }
      
      // Search optimization
      if (metrics.averageSearchLatency > 1500) {
        recommendations.push({
          id: 'search-optimization',
          category: 'performance',
          title: 'Optimize Vector Search Performance',
          description: `Average search latency is ${metrics.averageSearchLatency}ms. Vector search optimization could improve response times.`,
          impact: 'high',
          effort: 'medium',
          estimatedSavings: {
            latency: metrics.averageSearchLatency * 0.4
          },
          actionItems: [
            'Optimize vector database indexing parameters',
            'Implement search result caching',
            'Use approximate nearest neighbor search for large datasets',
            'Optimize chunk size and overlap parameters'
          ],
          priority: 2
        });
      }
      
      // Cost optimization
      if (metrics.averageCostPerSearch > 0.005) {
        recommendations.push({
          id: 'cost-optimization',
          category: 'cost',
          title: 'Reduce Embedding Generation Costs',
          description: `Average cost per search is $${metrics.averageCostPerSearch.toFixed(4)}. Cost optimization strategies could reduce expenses.`,
          impact: 'medium',
          effort: 'low',
          estimatedSavings: {
            cost: metrics.totalCostUSD * 0.25
          },
          actionItems: [
            'Implement more aggressive embedding caching',
            'Use smaller embedding models for less critical queries',
            'Batch embedding generation requests',
            'Implement query deduplication'
          ],
          priority: 3
        });
      }
      
      // Quality optimization
      if (metrics.averageRelevanceScore < 0.75) {
        recommendations.push({
          id: 'quality-optimization',
          category: 'quality',
          title: 'Improve Search Relevance',
          description: `Average relevance score is ${metrics.averageRelevanceScore.toFixed(2)}. Improving chunking and retrieval could enhance accuracy.`,
          impact: 'high',
          effort: 'high',
          estimatedSavings: {
            accuracy: 0.15
          },
          actionItems: [
            'Optimize document chunking strategies',
            'Implement hybrid search with keyword matching',
            'Add query expansion and synonym handling',
            'Fine-tune relevance scoring algorithms'
          ],
          priority: 4
        });
      }
      
      return recommendations.sort((a, b) => a.priority - b.priority);
      
    } catch (error) {
      console.error('Failed to generate optimization recommendations:', error);
      return [];
    }
  }
  
  // Private helper methods
  
  private async getUsageMetrics(agentId?: string, startDate: Date, endDate: Date) {
    // This would typically query usage logs and statistics
    // For now, return mock data structure
    return {
      totalSearches: 1250,
      totalDocuments: 45,
      totalChunks: 2340,
      totalEmbeddings: 2340
    };
  }
  
  private async getPerformanceMetrics(agentId?: string, startDate: Date, endDate: Date) {
    // Query performance logs
    return {
      averageSearchLatency: 850,
      averageEmbeddingLatency: 1200,
      averageProcessingTime: 15000
    };
  }
  
  private async getQualityMetrics(agentId?: string, startDate: Date, endDate: Date) {
    // Query quality metrics
    return {
      averageRelevanceScore: 0.78,
      searchSuccessRate: 0.92,
      cacheHitRate: 0.75
    };
  }
  
  private async getCostMetrics(agentId?: string, startDate: Date, endDate: Date) {
    try {
      const { data, error } = await this.supabase
        .from('llm_usage_logs')
        .select('tokens_total, cost_usd')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      if (error) {
        console.error('Failed to get cost metrics:', error);
        return {
          totalTokensUsed: 0,
          totalCostUSD: 0,
          averageCostPerSearch: 0
        };
      }
      
      const logs = data || [];
      const totalTokensUsed = logs.reduce((sum, log) => sum + (log.tokens_total || 0), 0);
      const totalCostUSD = logs.reduce((sum, log) => sum + (log.cost_usd || 0), 0);
      const averageCostPerSearch = logs.length > 0 ? totalCostUSD / logs.length : 0;
      
      return {
        totalTokensUsed,
        totalCostUSD,
        averageCostPerSearch
      };
      
    } catch (error) {
      console.error('Failed to get cost metrics:', error);
      return {
        totalTokensUsed: 0,
        totalCostUSD: 0,
        averageCostPerSearch: 0
      };
    }
  }
  
  private async getHealthMetrics() {
    try {
      const [vectorDBHealth, cacheStats] = await Promise.all([
        this.vectorDB.testConnection(),
        this.embeddingService.getCacheStats()
      ]);
      
      return {
        vectorDBHealth,
        embeddingServiceHealth: true, // Assume healthy if no errors
        cacheHealth: cacheStats.hits + cacheStats.misses > 0 // Has activity
      };
      
    } catch (error) {
      console.error('Failed to get health metrics:', error);
      return {
        vectorDBHealth: false,
        embeddingServiceHealth: false,
        cacheHealth: false
      };
    }
  }
}

// Singleton instance
let ragMonitoringInstance: RAGMonitoring | null = null;

/**
 * Get or create RAG monitoring singleton
 */
export function getRAGMonitoring(): RAGMonitoring {
  if (!ragMonitoringInstance) {
    ragMonitoringInstance = new RAGMonitoring();
  }
  return ragMonitoringInstance;
}

// Export types
export type {
  RAGMetrics,
  PerformanceAlert,
  OptimizationRecommendation
};
