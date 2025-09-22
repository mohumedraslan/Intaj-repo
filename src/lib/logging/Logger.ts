/**
 * Production-grade structured logging system for the Intaj platform
 * Provides consistent logging across all services with correlation IDs and Pino integration
 */

import pino from 'pino';

export interface LogContext {
  correlationId?: string;
  userId?: string;
  agentId?: string;
  conversationId?: string;
  messageId?: string;
  platform?: string;
  operation?: string;
  duration?: number;
  statusCode?: number;
  userAgent?: string;
  ip?: string;
  [key: string]: any;
}

export interface PerformanceContext extends LogContext {
  startTime?: number;
  endTime?: number;
  duration?: number;
  memoryUsage?: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
}

export class Logger {
  private pino: pino.Logger;
  private service: string;

  constructor(service: string) {
    this.service = service;
    
    // Configure Pino with production-ready settings
    this.pino = pino({
      name: service,
      level: process.env.LOG_LEVEL || 'info',
      formatters: {
        level: (label) => ({ level: label }),
        bindings: (bindings) => ({
          pid: bindings.pid,
          hostname: bindings.hostname,
          service: this.service
        })
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      serializers: {
        error: pino.stdSerializers.err,
        req: pino.stdSerializers.req,
        res: pino.stdSerializers.res
      },
      // Redact sensitive information in production
      ...(process.env.NODE_ENV === 'production' && {
        redact: {
          paths: [
            'password',
            'token',
            'apiKey',
            'secret',
            'authorization',
            'cookie',
            'req.headers.authorization',
            'req.headers.cookie',
            'res.headers["set-cookie"]'
          ],
          censor: '[REDACTED]'
        }
      }),
      // Pretty print in development
      ...(process.env.NODE_ENV === 'development' && {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname'
          }
        }
      })
    });
  }

  /**
   * Log an info message
   */
  info(message: string, context?: LogContext): void {
    this.pino.info(this.sanitizeContext(context), message);
  }

  /**
   * Log an error message
   */
  error(message: string, context?: LogContext & { error?: Error }): void {
    const sanitizedContext = this.sanitizeContext(context);
    
    // Handle error serialization
    if (context?.error) {
      sanitizedContext.error = context.error;
    }
    
    this.pino.error(sanitizedContext, message);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: LogContext): void {
    this.pino.warn(this.sanitizeContext(context), message);
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: LogContext): void {
    this.pino.debug(this.sanitizeContext(context), message);
  }

  /**
   * Log a trace message (most verbose)
   */
  trace(message: string, context?: LogContext): void {
    this.pino.trace(this.sanitizeContext(context), message);
  }

  /**
   * Log a fatal error (highest severity)
   */
  fatal(message: string, context?: LogContext & { error?: Error }): void {
    const sanitizedContext = this.sanitizeContext(context);
    
    if (context?.error) {
      sanitizedContext.error = context.error;
    }
    
    this.pino.fatal(sanitizedContext, message);
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    const childLogger = new Logger(this.service);
    childLogger.pino = this.pino.child(this.sanitizeContext(context));
    return childLogger;
  }

  /**
   * Log performance metrics
   */
  performance(message: string, context: PerformanceContext): void {
    const perfContext = {
      ...this.sanitizeContext(context),
      performance: {
        duration: context.duration,
        memoryUsage: context.memoryUsage,
        cpuUsage: context.cpuUsage
      }
    };
    
    this.pino.info(perfContext, message);
  }

  /**
   * Log HTTP request/response
   */
  http(message: string, context: LogContext & {
    method?: string;
    url?: string;
    statusCode?: number;
    responseTime?: number;
    contentLength?: number;
  }): void {
    const httpContext = {
      ...this.sanitizeContext(context),
      http: {
        method: context.method,
        url: context.url,
        statusCode: context.statusCode,
        responseTime: context.responseTime,
        contentLength: context.contentLength
      }
    };
    
    const level = this.getHttpLogLevel(context.statusCode);
    this.pino[level](httpContext, message);
  }

  /**
   * Log business events
   */
  business(event: string, context: LogContext & {
    action?: string;
    resource?: string;
    outcome?: 'success' | 'failure' | 'partial';
    metadata?: Record<string, any>;
  }): void {
    const businessContext = {
      ...this.sanitizeContext(context),
      business: {
        event,
        action: context.action,
        resource: context.resource,
        outcome: context.outcome,
        metadata: context.metadata
      }
    };
    
    this.pino.info(businessContext, `Business event: ${event}`);
  }

  /**
   * Log security events
   */
  security(event: string, context: LogContext & {
    threat?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    blocked?: boolean;
  }): void {
    const securityContext = {
      ...this.sanitizeContext(context),
      security: {
        event,
        threat: context.threat,
        severity: context.severity || 'medium',
        blocked: context.blocked
      }
    };
    
    const level = context.severity === 'critical' ? 'fatal' : 
                 context.severity === 'high' ? 'error' : 
                 context.severity === 'medium' ? 'warn' : 'info';
    
    this.pino[level](securityContext, `Security event: ${event}`);
  }

  /**
   * Sanitize context to remove undefined values and sensitive data
   */
  private sanitizeContext(context?: LogContext): Record<string, any> {
    if (!context) return {};
    
    const sanitized: Record<string, any> = {};
    
    Object.entries(context).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        sanitized[key] = value;
      }
    });
    
    return sanitized;
  }

  /**
   * Determine appropriate log level for HTTP status codes
   */
  private getHttpLogLevel(statusCode?: number): 'info' | 'warn' | 'error' {
    if (!statusCode) return 'info';
    
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    return 'info';
  }
}

/**
 * Create a logger instance for a service
 */
export function createLogger(serviceName: string): Logger {
  return new Logger(serviceName);
}

/**
 * Generate a correlation ID for request tracking
 */
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
