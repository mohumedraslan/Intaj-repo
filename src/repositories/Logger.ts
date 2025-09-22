/**
 * Structured logging system for the Intaj platform
 * Provides consistent logging across all services with correlation IDs
 */

export interface LogContext {
  correlationId?: string;
  userId?: string;
  agentId?: string;
  conversationId?: string;
  messageId?: string;
  platform?: string;
  [key: string]: any;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class Logger {
  private serviceName: string;
  private logLevel: LogLevel;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
  }

  /**
   * Log an info message
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * Log an error message
   */
  error(message: string, context?: LogContext & { error?: Error }): void {
    this.log('error', message, context);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  /**
   * Internal logging method
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      message,
      ...context,
      // Serialize error objects properly
      ...(context?.error && {
        error: {
          name: context.error.name,
          message: context.error.message,
          stack: context.error.stack,
        },
      }),
    };

    // In production, you might want to send this to a logging service
    // For now, we'll use console with structured output
    const logMethod = level === 'error' ? console.error : 
                     level === 'warn' ? console.warn : 
                     level === 'debug' ? console.debug : console.log;

    logMethod(JSON.stringify(logEntry, null, process.env.NODE_ENV === 'development' ? 2 : 0));
  }

  /**
   * Check if we should log at this level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    return levels[level] >= levels[this.logLevel];
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
