/**
 * Performance Monitoring Middleware
 * Tracks operation performance, errors, and provides distributed tracing
 */

import { getTracingService } from '../lib/tracing/tracer';
import { getMetricsCollector } from '../lib/metrics/MetricsCollector';
import { createLogger } from '../lib/logging/Logger';
import { Span } from '@opentelemetry/api';

const logger = createLogger('PerformanceMiddleware');
const tracingService = getTracingService();
const metrics = getMetricsCollector();

export interface PerformanceOptions {
  operationName: string;
  category?: 'api' | 'llm' | 'database' | 'cache' | 'document' | 'general';
  trackMetrics?: boolean;
  trackTrace?: boolean;
  attributes?: Record<string, string | number | boolean>;
  timeout?: number;
}

export interface PerformanceResult<T> {
  result: T;
  duration: number;
  success: boolean;
  error?: Error;
  memoryUsage?: NodeJS.MemoryUsage;
}

/**
 * Performance monitoring wrapper for async operations
 */
export async function withPerformanceMonitoring<T>(
  options: PerformanceOptions,
  handler: (span?: Span) => Promise<T>
): Promise<T> {
  const {
    operationName,
    category = 'general',
    trackMetrics = true,
    trackTrace = true,
    attributes = {},
    timeout
  } = options;

  const startTime = Date.now();
  const startMemory = process.memoryUsage();
  let span: Span | undefined;

  try {
    logger.debug('Starting operation', {
      operationName,
      category,
      attributes
    });

    // Create trace span if tracing is enabled
    if (trackTrace && tracingService.isEnabled()) {
      return await tracingService.createSpan(
        operationName,
        async (traceSpan) => {
          span = traceSpan;
          
          // Set custom attributes
          span.setAttributes({
            'operation.category': category,
            'operation.name': operationName,
            ...attributes
          });

          // Execute with timeout if specified
          if (timeout) {
            return await executeWithTimeout(handler, timeout, span);
          }

          return await handler(span);
        }
      );
    } else {
      // Execute without tracing
      if (timeout) {
        return await executeWithTimeout(handler, timeout);
      }
      return await handler();
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    const endMemory = process.memoryUsage();

    // Log error with performance context
    logger.error('Operation failed', {
      operationName,
      category,
      duration,
      error,
      memoryDelta: {
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal
      }
    });

    // Track error metrics
    if (trackMetrics) {
      metrics.incrementCounter('operation_errors_total', {
        operation: operationName,
        category,
        error_type: error instanceof Error ? error.constructor.name : 'unknown'
      });

      metrics.recordHistogram('operation_duration_ms', duration, {
        operation: operationName,
        category,
        status: 'error'
      });
    }

    throw error;

  } finally {
    const duration = Date.now() - startTime;
    const endMemory = process.memoryUsage();

    // Track success metrics
    if (trackMetrics) {
      metrics.recordHistogram('operation_duration_ms', duration, {
        operation: operationName,
        category,
        status: 'success'
      });

      metrics.incrementCounter('operations_total', {
        operation: operationName,
        category,
        status: 'success'
      });

      // Track memory usage
      metrics.recordHistogram('operation_memory_delta_bytes', 
        endMemory.heapUsed - startMemory.heapUsed, {
        operation: operationName,
        category
      });
    }

    logger.debug('Operation completed', {
      operationName,
      category,
      duration,
      memoryDelta: {
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal
      }
    });
  }
}

/**
 * Execute operation with timeout
 */
async function executeWithTimeout<T>(
  handler: (span?: Span) => Promise<T>,
  timeoutMs: number,
  span?: Span
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      const error = new Error(`Operation timed out after ${timeoutMs}ms`);
      if (span) {
        span.recordException(error);
      }
      reject(error);
    }, timeoutMs);

    handler(span)
      .then(result => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * Performance monitoring decorator for class methods
 */
export function PerformanceMonitored(options: Omit<PerformanceOptions, 'operationName'>) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const operationName = `${target.constructor.name}.${propertyName}`;
      
      return withPerformanceMonitoring(
        {
          ...options,
          operationName,
          attributes: {
            ...options.attributes,
            'method.class': target.constructor.name,
            'method.name': propertyName
          }
        },
        async (span) => {
          if (span) {
            span.setAttributes({
              'method.args_count': args.length
            });
          }
          return method.apply(this, args);
        }
      );
    };

    return descriptor;
  };
}

/**
 * HTTP request performance monitoring
 */
export async function withHttpPerformanceMonitoring<T>(
  method: string,
  url: string,
  handler: (span?: Span) => Promise<T>,
  options: Partial<PerformanceOptions> = {}
): Promise<T> {
  return withPerformanceMonitoring(
    {
      operationName: `http.${method.toLowerCase()}`,
      category: 'api',
      attributes: {
        'http.method': method,
        'http.url': url,
        ...options.attributes
      },
      ...options
    },
    handler
  );
}

/**
 * Database operation performance monitoring
 */
export async function withDatabasePerformanceMonitoring<T>(
  operation: string,
  table: string,
  handler: (span?: Span) => Promise<T>,
  options: Partial<PerformanceOptions> = {}
): Promise<T> {
  return withPerformanceMonitoring(
    {
      operationName: `db.${operation}`,
      category: 'database',
      attributes: {
        'db.operation': operation,
        'db.table': table,
        'db.system': 'postgresql',
        ...options.attributes
      },
      ...options
    },
    handler
  );
}

/**
 * LLM operation performance monitoring
 */
export async function withLLMPerformanceMonitoring<T>(
  provider: string,
  model: string,
  operation: string,
  handler: (span?: Span) => Promise<T>,
  options: Partial<PerformanceOptions> = {}
): Promise<T> {
  return withPerformanceMonitoring(
    {
      operationName: `llm.${provider}.${operation}`,
      category: 'llm',
      attributes: {
        'llm.provider': provider,
        'llm.model': model,
        'llm.operation': operation,
        ...options.attributes
      },
      timeout: 120000, // 2 minutes default timeout for LLM operations
      ...options
    },
    handler
  );
}

/**
 * Cache operation performance monitoring
 */
export async function withCachePerformanceMonitoring<T>(
  operation: string,
  cacheType: string,
  handler: (span?: Span) => Promise<T>,
  options: Partial<PerformanceOptions> = {}
): Promise<T> {
  return withPerformanceMonitoring(
    {
      operationName: `cache.${operation}`,
      category: 'cache',
      attributes: {
        'cache.operation': operation,
        'cache.type': cacheType,
        'cache.system': 'redis',
        ...options.attributes
      },
      ...options
    },
    handler
  );
}

/**
 * Document processing performance monitoring
 */
export async function withDocumentPerformanceMonitoring<T>(
  fileType: string,
  operation: string,
  handler: (span?: Span) => Promise<T>,
  options: Partial<PerformanceOptions> = {}
): Promise<T> {
  return withPerformanceMonitoring(
    {
      operationName: `document.${operation}`,
      category: 'document',
      attributes: {
        'document.type': fileType,
        'document.operation': operation,
        ...options.attributes
      },
      timeout: 300000, // 5 minutes default timeout for document processing
      ...options
    },
    handler
  );
}

/**
 * Batch operation performance monitoring
 */
export async function withBatchPerformanceMonitoring<T>(
  batchType: string,
  batchSize: number,
  handler: (span?: Span) => Promise<T>,
  options: Partial<PerformanceOptions> = {}
): Promise<T> {
  return withPerformanceMonitoring(
    {
      operationName: `batch.${batchType}`,
      category: 'general',
      attributes: {
        'batch.type': batchType,
        'batch.size': batchSize,
        ...options.attributes
      },
      ...options
    },
    handler
  );
}

/**
 * Performance monitoring for async iterators/generators
 */
export async function* withStreamPerformanceMonitoring<T>(
  operationName: string,
  stream: AsyncIterable<T>,
  options: Partial<PerformanceOptions> = {}
): AsyncGenerator<T, void, unknown> {
  const startTime = Date.now();
  let itemCount = 0;

  try {
    for await (const item of stream) {
      itemCount++;
      
      // Track progress metrics
      if (itemCount % 100 === 0) {
        metrics.setGauge('stream_items_processed', itemCount, {
          operation: operationName,
          category: options.category || 'general'
        });
      }

      yield item;
    }

    // Track completion metrics
    const duration = Date.now() - startTime;
    metrics.recordHistogram('stream_duration_ms', duration, {
      operation: operationName,
      category: options.category || 'general'
    });

    metrics.recordHistogram('stream_items_total', itemCount, {
      operation: operationName,
      category: options.category || 'general'
    });

    logger.debug('Stream processing completed', {
      operationName,
      duration,
      itemCount
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Stream processing failed', {
      operationName,
      duration,
      itemCount,
      error
    });

    metrics.incrementCounter('stream_errors_total', {
      operation: operationName,
      category: options.category || 'general',
      error_type: error instanceof Error ? error.constructor.name : 'unknown'
    });

    throw error;
  }
}

/**
 * Resource usage monitoring
 */
export function trackResourceUsage(operationName: string): () => void {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();
  const startCpu = process.cpuUsage();

  return () => {
    const duration = Date.now() - startTime;
    const endMemory = process.memoryUsage();
    const endCpu = process.cpuUsage(startCpu);

    // Track resource usage metrics
    metrics.recordHistogram('resource_duration_ms', duration, {
      operation: operationName
    });

    metrics.recordHistogram('resource_memory_delta_bytes', 
      endMemory.heapUsed - startMemory.heapUsed, {
      operation: operationName
    });

    metrics.recordHistogram('resource_cpu_user_microseconds', endCpu.user, {
      operation: operationName
    });

    metrics.recordHistogram('resource_cpu_system_microseconds', endCpu.system, {
      operation: operationName
    });

    logger.debug('Resource usage tracked', {
      operationName,
      duration,
      memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
      cpuUser: endCpu.user,
      cpuSystem: endCpu.system
    });
  };
}
