/**
 * Observability System Initialization
 * Central initialization and configuration for all observability components
 */

import { initializeTracing, shutdownTracing } from '../tracing/tracer';
import { initializeErrorTracking } from '../monitoring/errorTracking';
import { getMetricsCollector } from '../metrics/MetricsCollector';
import { getHealthChecker } from '../health/HealthChecker';
import { createLogger } from '../logging/Logger';
import { trackResourceUsage } from '../metrics/businessMetrics';

const logger = createLogger('ObservabilitySystem');

export interface ObservabilityConfig {
  enableTracing?: boolean;
  enableErrorTracking?: boolean;
  enableMetrics?: boolean;
  enableHealthChecks?: boolean;
  resourceMonitoringInterval?: number;
  metricsExportInterval?: number;
}

class ObservabilitySystem {
  private static instance: ObservabilitySystem;
  private isInitialized = false;
  private config: ObservabilityConfig;
  private resourceMonitoringInterval?: NodeJS.Timeout;
  private metricsExportInterval?: NodeJS.Timeout;

  constructor(config: ObservabilityConfig = {}) {
    this.config = {
      enableTracing: true,
      enableErrorTracking: true,
      enableMetrics: true,
      enableHealthChecks: true,
      resourceMonitoringInterval: 60000, // 1 minute
      metricsExportInterval: 30000, // 30 seconds
      ...config
    };
  }

  static getInstance(config?: ObservabilityConfig): ObservabilitySystem {
    if (!this.instance) {
      this.instance = new ObservabilitySystem(config);
    }
    return this.instance;
  }

  /**
   * Initialize all observability components
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Observability system already initialized');
      return;
    }

    try {
      logger.info('Initializing observability system', {
        config: this.config
      });

      // Initialize tracing first (provides context for other components)
      if (this.config.enableTracing) {
        await this.initializeTracing();
      }

      // Initialize error tracking
      if (this.config.enableErrorTracking) {
        await this.initializeErrorTracking();
      }

      // Initialize metrics collection
      if (this.config.enableMetrics) {
        await this.initializeMetrics();
      }

      // Initialize health checks
      if (this.config.enableHealthChecks) {
        await this.initializeHealthChecks();
      }

      // Start background monitoring
      this.startBackgroundMonitoring();

      this.isInitialized = true;

      logger.info('Observability system initialized successfully', {
        tracing: this.config.enableTracing,
        errorTracking: this.config.enableErrorTracking,
        metrics: this.config.enableMetrics,
        healthChecks: this.config.enableHealthChecks
      });

    } catch (error) {
      logger.error('Failed to initialize observability system', { error });
      throw error;
    }
  }

  /**
   * Shutdown all observability components
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      logger.info('Shutting down observability system');

      // Stop background monitoring
      if (this.resourceMonitoringInterval) {
        clearInterval(this.resourceMonitoringInterval);
      }
      if (this.metricsExportInterval) {
        clearInterval(this.metricsExportInterval);
      }

      // Shutdown tracing
      if (this.config.enableTracing) {
        await shutdownTracing();
      }

      this.isInitialized = false;

      logger.info('Observability system shutdown complete');

    } catch (error) {
      logger.error('Error during observability system shutdown', { error });
    }
  }

  /**
   * Check if observability system is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get system status
   */
  async getStatus(): Promise<{
    initialized: boolean;
    components: {
      tracing: boolean;
      errorTracking: boolean;
      metrics: boolean;
      healthChecks: boolean;
    };
    uptime: number;
  }> {
    const healthChecker = getHealthChecker();
    const healthReport = await healthChecker.checkHealth();

    return {
      initialized: this.isInitialized,
      components: {
        tracing: this.config.enableTracing || false,
        errorTracking: this.config.enableErrorTracking || false,
        metrics: this.config.enableMetrics || false,
        healthChecks: this.config.enableHealthChecks || false
      },
      uptime: healthReport.uptime
    };
  }

  // Private initialization methods

  private async initializeTracing(): Promise<void> {
    try {
      initializeTracing();
      logger.info('Distributed tracing initialized');
    } catch (error) {
      logger.error('Failed to initialize tracing', { error });
      throw error;
    }
  }

  private async initializeErrorTracking(): Promise<void> {
    try {
      initializeErrorTracking();
      logger.info('Error tracking initialized');
    } catch (error) {
      logger.error('Failed to initialize error tracking', { error });
      throw error;
    }
  }

  private async initializeMetrics(): Promise<void> {
    try {
      const metricsCollector = getMetricsCollector();
      
      // Initialize with some basic system metrics
      metricsCollector.setGauge('system_start_time', Date.now(), {
        version: process.env.APP_VERSION || '1.0.0'
      });

      logger.info('Metrics collection initialized');
    } catch (error) {
      logger.error('Failed to initialize metrics', { error });
      throw error;
    }
  }

  private async initializeHealthChecks(): Promise<void> {
    try {
      const healthChecker = getHealthChecker();
      
      // Health checker is initialized with default checks
      // Additional custom checks can be added here
      
      logger.info('Health checks initialized');
    } catch (error) {
      logger.error('Failed to initialize health checks', { error });
      throw error;
    }
  }

  private startBackgroundMonitoring(): void {
    // Start resource monitoring
    if (this.config.resourceMonitoringInterval) {
      this.resourceMonitoringInterval = setInterval(async () => {
        try {
          await trackResourceUsage();
        } catch (error) {
          logger.debug('Resource monitoring error', { error });
        }
      }, this.config.resourceMonitoringInterval);
    }

    // Start periodic metrics export (for debugging)
    if (process.env.NODE_ENV === 'development' && this.config.metricsExportInterval) {
      this.metricsExportInterval = setInterval(async () => {
        try {
          const metricsCollector = getMetricsCollector();
          const summary = metricsCollector.getSummary();
          
          logger.debug('Metrics summary', summary);
        } catch (error) {
          logger.debug('Metrics export error', { error });
        }
      }, this.config.metricsExportInterval);
    }
  }
}

/**
 * Initialize observability system with default configuration
 */
export async function initializeObservability(config?: ObservabilityConfig): Promise<void> {
  const system = ObservabilitySystem.getInstance(config);
  await system.initialize();
}

/**
 * Shutdown observability system
 */
export async function shutdownObservability(): Promise<void> {
  const system = ObservabilitySystem.getInstance();
  await system.shutdown();
}

/**
 * Get observability system status
 */
export async function getObservabilityStatus(): Promise<any> {
  const system = ObservabilitySystem.getInstance();
  return system.getStatus();
}

/**
 * Check if observability system is ready
 */
export function isObservabilityReady(): boolean {
  const system = ObservabilitySystem.getInstance();
  return system.isReady();
}

// Export main classes for advanced usage
export { ObservabilitySystem };

// Re-export key components for convenience
export { createLogger } from '../logging/Logger';
export { getMetricsCollector } from '../metrics/MetricsCollector';
export { getHealthChecker } from '../health/HealthChecker';
export { captureError, captureMessage } from '../monitoring/errorTracking';
export { 
  withPerformanceMonitoring,
  withHttpPerformanceMonitoring,
  withLLMPerformanceMonitoring,
  withDatabasePerformanceMonitoring
} from '../middleware/performanceMiddleware';
export {
  trackMessageProcessed,
  trackLLMLatency,
  trackAPIRequest,
  trackDocumentProcessing,
  trackVectorSearch,
  trackCacheOperation,
  trackUserActivity,
  trackWebhookEvent,
  trackError
} from '../metrics/businessMetrics';

// Process event handlers for graceful shutdown
if (typeof process !== 'undefined') {
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down observability system');
    await shutdownObservability();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down observability system');
    await shutdownObservability();
    process.exit(0);
  });

  process.on('uncaughtException', (error) => {
    logger.fatal('Uncaught exception', { error });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.fatal('Unhandled rejection', { 
      reason: reason instanceof Error ? reason.message : String(reason),
      promise: String(promise)
    });
    process.exit(1);
  });
}
