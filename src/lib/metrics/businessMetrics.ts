/**
 * Business Metrics Tracking
 * High-level business metrics for monitoring platform performance and usage
 */

import { MetricsCollector } from './MetricsCollector';
import { createLogger } from '../logging/Logger';

const logger = createLogger('BusinessMetrics');
const metrics = MetricsCollector.getInstance();

export class BusinessMetrics {
  /**
   * Track message processing
   */
  static async trackMessageProcessed(
    agentId: string,
    platform: string,
    messageType: 'inbound' | 'outbound' = 'inbound',
    success: boolean = true
  ): Promise<void> {
    try {
      metrics.incrementCounter('messages_processed_total', {
        agent_id: agentId,
        platform,
        message_type: messageType,
        status: success ? 'success' : 'failure'
      });

      // Track platform-specific metrics
      metrics.incrementCounter(`${platform}_messages_total`, {
        agent_id: agentId,
        message_type: messageType,
        status: success ? 'success' : 'failure'
      });

      logger.debug('Message processing tracked', {
        agentId,
        platform,
        messageType,
        success
      });
    } catch (error) {
      logger.error('Failed to track message processing', {
        error,
        agentId,
        platform,
        messageType
      });
    }
  }

  /**
   * Track LLM API usage and latency
   */
  static async trackLLMLatency(
    provider: string,
    model: string,
    latency: number,
    tokenCount?: number,
    cost?: number,
    success: boolean = true
  ): Promise<void> {
    try {
      // Track latency
      metrics.recordHistogram('llm_response_time_ms', latency, {
        provider,
        model,
        status: success ? 'success' : 'failure'
      });

      // Track request count
      metrics.incrementCounter('llm_requests_total', {
        provider,
        model,
        status: success ? 'success' : 'failure'
      });

      // Track token usage if provided
      if (tokenCount) {
        metrics.recordHistogram('llm_tokens_used', tokenCount, {
          provider,
          model
        });
      }

      // Track cost if provided
      if (cost) {
        metrics.recordHistogram('llm_cost_usd', cost, {
          provider,
          model
        });
      }

      logger.debug('LLM metrics tracked', {
        provider,
        model,
        latency,
        tokenCount,
        cost,
        success
      });
    } catch (error) {
      logger.error('Failed to track LLM metrics', {
        error,
        provider,
        model,
        latency
      });
    }
  }

  /**
   * Track API endpoint usage
   */
  static async trackAPIRequest(
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    userId?: string
  ): Promise<void> {
    try {
      const status = statusCode >= 200 && statusCode < 300 ? 'success' : 'failure';
      const statusClass = Math.floor(statusCode / 100) + 'xx';

      // Track request count
      metrics.incrementCounter('api_requests_total', {
        endpoint,
        method,
        status,
        status_code: statusCode.toString(),
        status_class: statusClass
      });

      // Track response time
      metrics.recordHistogram('api_response_time_ms', responseTime, {
        endpoint,
        method,
        status_class: statusClass
      });

      // Track user activity if userId provided
      if (userId) {
        metrics.incrementCounter('user_api_requests_total', {
          user_id: userId,
          endpoint,
          status
        });
      }

      logger.debug('API request tracked', {
        endpoint,
        method,
        statusCode,
        responseTime,
        userId
      });
    } catch (error) {
      logger.error('Failed to track API request', {
        error,
        endpoint,
        method,
        statusCode
      });
    }
  }

  /**
   * Track document processing
   */
  static async trackDocumentProcessing(
    agentId: string,
    fileType: string,
    fileSize: number,
    processingTime: number,
    chunksGenerated: number,
    success: boolean = true
  ): Promise<void> {
    try {
      // Track processing count
      metrics.incrementCounter('document_uploads_total', {
        agent_id: agentId,
        file_type: fileType,
        status: success ? 'success' : 'failure'
      });

      // Track processing time
      metrics.recordHistogram('document_processing_time_ms', processingTime, {
        agent_id: agentId,
        file_type: fileType
      });

      // Track file size
      metrics.recordHistogram('document_size_bytes', fileSize, {
        file_type: fileType
      });

      // Track chunks generated
      if (success) {
        metrics.recordHistogram('document_chunks_generated', chunksGenerated, {
          agent_id: agentId,
          file_type: fileType
        });
      }

      logger.debug('Document processing tracked', {
        agentId,
        fileType,
        fileSize,
        processingTime,
        chunksGenerated,
        success
      });
    } catch (error) {
      logger.error('Failed to track document processing', {
        error,
        agentId,
        fileType,
        fileSize
      });
    }
  }

  /**
   * Track vector search operations
   */
  static async trackVectorSearch(
    agentId: string,
    queryLength: number,
    resultsCount: number,
    searchTime: number,
    relevanceScore?: number
  ): Promise<void> {
    try {
      // Track search count
      metrics.incrementCounter('vector_searches_total', {
        agent_id: agentId
      });

      // Track search time
      metrics.recordHistogram('vector_search_time_ms', searchTime, {
        agent_id: agentId
      });

      // Track query characteristics
      metrics.recordHistogram('vector_search_query_length', queryLength, {
        agent_id: agentId
      });

      metrics.recordHistogram('vector_search_results_count', resultsCount, {
        agent_id: agentId
      });

      // Track relevance if provided
      if (relevanceScore !== undefined) {
        metrics.recordHistogram('vector_search_relevance_score', relevanceScore, {
          agent_id: agentId
        });
      }

      logger.debug('Vector search tracked', {
        agentId,
        queryLength,
        resultsCount,
        searchTime,
        relevanceScore
      });
    } catch (error) {
      logger.error('Failed to track vector search', {
        error,
        agentId,
        queryLength,
        resultsCount
      });
    }
  }

  /**
   * Track cache performance
   */
  static async trackCacheOperation(
    operation: 'hit' | 'miss' | 'set' | 'delete',
    cacheType: 'embedding' | 'llm_response' | 'session' | 'general',
    keySize?: number,
    valueSize?: number
  ): Promise<void> {
    try {
      // Track cache operations
      metrics.incrementCounter('cache_operations_total', {
        operation,
        cache_type: cacheType
      });

      // Track specific hit/miss ratios
      if (operation === 'hit') {
        metrics.incrementCounter('cache_hits_total', {
          cache_type: cacheType
        });
      } else if (operation === 'miss') {
        metrics.incrementCounter('cache_misses_total', {
          cache_type: cacheType
        });
      }

      // Track data sizes if provided
      if (keySize) {
        metrics.recordHistogram('cache_key_size_bytes', keySize, {
          cache_type: cacheType
        });
      }

      if (valueSize) {
        metrics.recordHistogram('cache_value_size_bytes', valueSize, {
          cache_type: cacheType
        });
      }

      logger.debug('Cache operation tracked', {
        operation,
        cacheType,
        keySize,
        valueSize
      });
    } catch (error) {
      logger.error('Failed to track cache operation', {
        error,
        operation,
        cacheType
      });
    }
  }

  /**
   * Track user activity
   */
  static async trackUserActivity(
    userId: string,
    action: string,
    resource?: string,
    success: boolean = true
  ): Promise<void> {
    try {
      metrics.incrementCounter('user_actions_total', {
        user_id: userId,
        action,
        resource: resource || 'unknown',
        status: success ? 'success' : 'failure'
      });

      logger.debug('User activity tracked', {
        userId,
        action,
        resource,
        success
      });
    } catch (error) {
      logger.error('Failed to track user activity', {
        error,
        userId,
        action,
        resource
      });
    }
  }

  /**
   * Track webhook events
   */
  static async trackWebhookEvent(
    platform: string,
    eventType: string,
    processingTime: number,
    success: boolean = true
  ): Promise<void> {
    try {
      metrics.incrementCounter('webhook_requests_total', {
        platform,
        event_type: eventType,
        status: success ? 'success' : 'failure'
      });

      metrics.recordHistogram('webhook_processing_time_ms', processingTime, {
        platform,
        event_type: eventType
      });

      logger.debug('Webhook event tracked', {
        platform,
        eventType,
        processingTime,
        success
      });
    } catch (error) {
      logger.error('Failed to track webhook event', {
        error,
        platform,
        eventType,
        processingTime
      });
    }
  }

  /**
   * Track system resource usage
   */
  static async trackResourceUsage(): Promise<void> {
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      // Track memory usage
      metrics.setGauge('memory_usage_bytes', memoryUsage.heapUsed, {
        type: 'heap_used'
      });
      metrics.setGauge('memory_usage_bytes', memoryUsage.heapTotal, {
        type: 'heap_total'
      });
      metrics.setGauge('memory_usage_bytes', memoryUsage.rss, {
        type: 'rss'
      });
      metrics.setGauge('memory_usage_bytes', memoryUsage.external, {
        type: 'external'
      });

      // Track CPU usage (in microseconds)
      metrics.setGauge('cpu_usage_microseconds', cpuUsage.user, {
        type: 'user'
      });
      metrics.setGauge('cpu_usage_microseconds', cpuUsage.system, {
        type: 'system'
      });

      logger.debug('Resource usage tracked', {
        memoryUsage,
        cpuUsage
      });
    } catch (error) {
      logger.error('Failed to track resource usage', { error });
    }
  }

  /**
   * Update active connection counts
   */
  static async updateActiveConnections(
    connectionType: 'database' | 'redis' | 'websocket' | 'http',
    count: number
  ): Promise<void> {
    try {
      metrics.setGauge('active_connections', count, {
        connection_type: connectionType
      });

      logger.debug('Active connections updated', {
        connectionType,
        count
      });
    } catch (error) {
      logger.error('Failed to update active connections', {
        error,
        connectionType,
        count
      });
    }
  }

  /**
   * Track error occurrences
   */
  static async trackError(
    errorType: string,
    service: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    context?: Record<string, any>
  ): Promise<void> {
    try {
      metrics.incrementCounter('errors_total', {
        error_type: errorType,
        service,
        severity
      });

      logger.error('Error tracked in metrics', {
        errorType,
        service,
        severity,
        context
      });
    } catch (error) {
      logger.error('Failed to track error metric', {
        error,
        errorType,
        service,
        severity
      });
    }
  }
}

// Export convenience functions
export const trackMessageProcessed = BusinessMetrics.trackMessageProcessed;
export const trackLLMLatency = BusinessMetrics.trackLLMLatency;
export const trackAPIRequest = BusinessMetrics.trackAPIRequest;
export const trackDocumentProcessing = BusinessMetrics.trackDocumentProcessing;
export const trackVectorSearch = BusinessMetrics.trackVectorSearch;
export const trackCacheOperation = BusinessMetrics.trackCacheOperation;
export const trackUserActivity = BusinessMetrics.trackUserActivity;
export const trackWebhookEvent = BusinessMetrics.trackWebhookEvent;
export const trackResourceUsage = BusinessMetrics.trackResourceUsage;
export const updateActiveConnections = BusinessMetrics.updateActiveConnections;
export const trackError = BusinessMetrics.trackError;
