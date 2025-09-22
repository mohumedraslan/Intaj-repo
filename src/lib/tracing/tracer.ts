/**
 * Distributed Tracing with OpenTelemetry
 * Provides comprehensive tracing for request flows across services
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { trace, context, SpanStatusCode, SpanKind, Span } from '@opentelemetry/api';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { createLogger } from '../logging/Logger';

const logger = createLogger('TracingService');

export interface SpanAttributes {
  [key: string]: string | number | boolean | undefined;
}

export interface TraceContext {
  traceId?: string;
  spanId?: string;
  correlationId?: string;
  userId?: string;
  agentId?: string;
  operation?: string;
}

export class TracingService {
  private sdk: NodeSDK;
  private tracer: any;
  private isInitialized = false;

  constructor() {
    this.initializeSDK();
  }

  private initializeSDK(): void {
    try {
      // Configure resource attributes
      const resource = new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'intaj-ai-platform',
        [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION || '1.0.0',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
      });

      // Configure exporters
      const exporters = [];
      
      // Add Jaeger exporter if configured
      if (process.env.JAEGER_ENDPOINT) {
        exporters.push(new JaegerExporter({
          endpoint: process.env.JAEGER_ENDPOINT,
        }));
      }

      // Add console exporter for development
      if (process.env.NODE_ENV === 'development') {
        exporters.push(new ConsoleSpanExporter());
      }

      // Initialize SDK
      this.sdk = new NodeSDK({
        resource,
        traceExporter: exporters.length > 0 ? exporters[0] : new ConsoleSpanExporter(),
        instrumentations: [
          getNodeAutoInstrumentations({
            // Disable file system instrumentation to reduce noise
            '@opentelemetry/instrumentation-fs': { enabled: false },
            // Configure HTTP instrumentation
            '@opentelemetry/instrumentation-http': {
              enabled: true,
              ignoreIncomingRequestHook: (req) => {
                // Ignore health check and metrics endpoints
                return req.url?.includes('/health') || req.url?.includes('/metrics');
              },
            },
            // Configure database instrumentation
            '@opentelemetry/instrumentation-pg': { enabled: true },
            '@opentelemetry/instrumentation-redis': { enabled: true },
          }),
        ],
      });

      logger.info('Tracing SDK initialized', {
        serviceName: 'intaj-ai-platform',
        environment: process.env.NODE_ENV,
        jaegerEnabled: !!process.env.JAEGER_ENDPOINT
      });
    } catch (error) {
      logger.error('Failed to initialize tracing SDK', { error });
    }
  }

  /**
   * Start the tracing SDK
   */
  start(): void {
    try {
      if (!this.isInitialized) {
        this.sdk.start();
        this.tracer = trace.getTracer('intaj-ai-platform');
        this.isInitialized = true;
        
        logger.info('Tracing service started successfully');
      }
    } catch (error) {
      logger.error('Failed to start tracing service', { error });
    }
  }

  /**
   * Stop the tracing SDK
   */
  async stop(): Promise<void> {
    try {
      if (this.isInitialized) {
        await this.sdk.shutdown();
        this.isInitialized = false;
        
        logger.info('Tracing service stopped');
      }
    } catch (error) {
      logger.error('Failed to stop tracing service', { error });
    }
  }

  /**
   * Create and execute a span
   */
  async createSpan<T>(
    name: string,
    operation: (span: Span) => Promise<T>,
    attributes?: SpanAttributes,
    spanKind: SpanKind = SpanKind.INTERNAL
  ): Promise<T> {
    if (!this.isInitialized) {
      logger.warn('Tracing not initialized, executing operation without span');
      // Create a mock span for the operation
      const mockSpan = {
        setAttributes: () => {},
        setStatus: () => {},
        recordException: () => {},
        end: () => {},
        addEvent: () => {},
      } as unknown as Span;
      return operation(mockSpan);
    }

    return this.tracer.startActiveSpan(
      name,
      { kind: spanKind, attributes },
      async (span: Span) => {
        try {
          // Add custom attributes
          if (attributes) {
            span.setAttributes(attributes);
          }

          // Execute the operation
          const result = await operation(span);

          // Mark span as successful
          span.setStatus({ code: SpanStatusCode.OK });
          
          return result;
        } catch (error) {
          // Record the error
          span.recordException(error as Error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : String(error),
          });
          
          throw error;
        } finally {
          span.end();
        }
      }
    );
  }

  /**
   * Create a child span from current context
   */
  async createChildSpan<T>(
    name: string,
    operation: (span: Span) => Promise<T>,
    attributes?: SpanAttributes
  ): Promise<T> {
    return this.createSpan(name, operation, attributes, SpanKind.INTERNAL);
  }

  /**
   * Create a span for HTTP client requests
   */
  async createHttpClientSpan<T>(
    name: string,
    operation: (span: Span) => Promise<T>,
    attributes?: SpanAttributes
  ): Promise<T> {
    return this.createSpan(name, operation, attributes, SpanKind.CLIENT);
  }

  /**
   * Create a span for HTTP server requests
   */
  async createHttpServerSpan<T>(
    name: string,
    operation: (span: Span) => Promise<T>,
    attributes?: SpanAttributes
  ): Promise<T> {
    return this.createSpan(name, operation, attributes, SpanKind.SERVER);
  }

  /**
   * Get current trace context
   */
  getCurrentTraceContext(): TraceContext {
    try {
      const activeSpan = trace.getActiveSpan();
      if (activeSpan) {
        const spanContext = activeSpan.spanContext();
        return {
          traceId: spanContext.traceId,
          spanId: spanContext.spanId,
        };
      }
    } catch (error) {
      logger.debug('Failed to get current trace context', { error });
    }
    
    return {};
  }

  /**
   * Add event to current span
   */
  addEvent(name: string, attributes?: SpanAttributes): void {
    try {
      const activeSpan = trace.getActiveSpan();
      if (activeSpan) {
        activeSpan.addEvent(name, attributes);
      }
    } catch (error) {
      logger.debug('Failed to add event to span', { error, eventName: name });
    }
  }

  /**
   * Set attributes on current span
   */
  setSpanAttributes(attributes: SpanAttributes): void {
    try {
      const activeSpan = trace.getActiveSpan();
      if (activeSpan) {
        activeSpan.setAttributes(attributes);
      }
    } catch (error) {
      logger.debug('Failed to set span attributes', { error });
    }
  }

  /**
   * Record exception on current span
   */
  recordException(error: Error, attributes?: SpanAttributes): void {
    try {
      const activeSpan = trace.getActiveSpan();
      if (activeSpan) {
        activeSpan.recordException(error, attributes);
      }
    } catch (err) {
      logger.debug('Failed to record exception on span', { error: err });
    }
  }

  /**
   * Trace LLM operations
   */
  async traceLLMOperation<T>(
    provider: string,
    model: string,
    operation: string,
    handler: (span: Span) => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    return this.createSpan(
      `llm.${provider}.${operation}`,
      handler,
      {
        'llm.provider': provider,
        'llm.model': model,
        'llm.operation': operation,
        ...metadata,
      },
      SpanKind.CLIENT
    );
  }

  /**
   * Trace database operations
   */
  async traceDatabaseOperation<T>(
    operation: string,
    table: string,
    handler: (span: Span) => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    return this.createSpan(
      `db.${operation}`,
      handler,
      {
        'db.operation': operation,
        'db.table': table,
        'db.system': 'postgresql',
        ...metadata,
      },
      SpanKind.CLIENT
    );
  }

  /**
   * Trace cache operations
   */
  async traceCacheOperation<T>(
    operation: string,
    cacheType: string,
    handler: (span: Span) => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    return this.createSpan(
      `cache.${operation}`,
      handler,
      {
        'cache.operation': operation,
        'cache.type': cacheType,
        'cache.system': 'redis',
        ...metadata,
      },
      SpanKind.CLIENT
    );
  }

  /**
   * Trace message processing
   */
  async traceMessageProcessing<T>(
    platform: string,
    messageType: string,
    handler: (span: Span) => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    return this.createSpan(
      `message.process.${platform}`,
      handler,
      {
        'message.platform': platform,
        'message.type': messageType,
        ...metadata,
      },
      SpanKind.INTERNAL
    );
  }

  /**
   * Trace document processing
   */
  async traceDocumentProcessing<T>(
    fileType: string,
    operation: string,
    handler: (span: Span) => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    return this.createSpan(
      `document.${operation}`,
      handler,
      {
        'document.type': fileType,
        'document.operation': operation,
        ...metadata,
      },
      SpanKind.INTERNAL
    );
  }

  /**
   * Check if tracing is enabled and initialized
   */
  isEnabled(): boolean {
    return this.isInitialized;
  }
}

// Singleton instance
let tracingServiceInstance: TracingService | null = null;

/**
 * Get or create tracing service singleton
 */
export function getTracingService(): TracingService {
  if (!tracingServiceInstance) {
    tracingServiceInstance = new TracingService();
  }
  return tracingServiceInstance;
}

/**
 * Initialize tracing service
 */
export function initializeTracing(): void {
  const tracingService = getTracingService();
  tracingService.start();
}

/**
 * Shutdown tracing service
 */
export async function shutdownTracing(): Promise<void> {
  if (tracingServiceInstance) {
    await tracingServiceInstance.stop();
  }
}

// Export convenience functions
export const createSpan = (name: string, operation: (span: Span) => Promise<any>, attributes?: SpanAttributes) => {
  return getTracingService().createSpan(name, operation, attributes);
};

export const traceLLMOperation = (provider: string, model: string, operation: string, handler: (span: Span) => Promise<any>, metadata?: Record<string, any>) => {
  return getTracingService().traceLLMOperation(provider, model, operation, handler, metadata);
};

export const traceDatabaseOperation = (operation: string, table: string, handler: (span: Span) => Promise<any>, metadata?: Record<string, any>) => {
  return getTracingService().traceDatabaseOperation(operation, table, handler, metadata);
};

export const getCurrentTraceContext = () => {
  return getTracingService().getCurrentTraceContext();
};

export const addEvent = (name: string, attributes?: SpanAttributes) => {
  return getTracingService().addEvent(name, attributes);
};

export const setSpanAttributes = (attributes: SpanAttributes) => {
  return getTracingService().setSpanAttributes(attributes);
};

export const recordException = (error: Error, attributes?: SpanAttributes) => {
  return getTracingService().recordException(error, attributes);
};
