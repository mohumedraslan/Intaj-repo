/**
 * Base service class providing common functionality for all services
 * Includes logging, error handling, and transaction management
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Logger, createLogger, LogContext } from '../../lib/logging/Logger';
import { withTransaction, TransactionOperation, TransactionResult } from '../../lib/database/transaction';

/**
 * Base error class for service errors
 */
export class ServiceError extends Error {
  constructor(
    message: string,
    public code: string = 'SERVICE_ERROR',
    public statusCode: number = 500,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

/**
 * Validation error class
 */
export class ValidationError extends ServiceError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, context);
    this.name = 'ValidationError';
  }
}

/**
 * Not found error class
 */
export class NotFoundError extends ServiceError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id ${id} not found` : `${resource} not found`;
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Unauthorized error class
 */
export class UnauthorizedError extends ServiceError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Forbidden error class
 */
export class ForbiddenError extends ServiceError {
  constructor(message: string = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

/**
 * Abstract base service class
 */
export abstract class BaseService {
  protected logger: Logger;
  protected serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
    this.logger = createLogger(serviceName);
  }

  /**
   * Execute an operation within a transaction
   */
  protected async withTransaction<T>(
    operation: TransactionOperation<T>,
    correlationId?: string
  ): Promise<T> {
    const result = await withTransaction(operation, correlationId);
    
    if (!result.success) {
      throw result.error || new ServiceError('Transaction failed');
    }
    
    return result.data!;
  }

  /**
   * Handle and log errors consistently
   */
  protected handleError(
    error: unknown, 
    context: LogContext & { operation?: string }
  ): never {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    
    this.logger.error(`${this.serviceName} operation failed`, {
      ...context,
      error: errorObj
    });

    // Re-throw service errors as-is
    if (error instanceof ServiceError) {
      throw error;
    }

    // Convert other errors to service errors
    throw new ServiceError(
      errorObj.message || 'An unexpected error occurred',
      'INTERNAL_ERROR',
      500,
      context
    );
  }

  /**
   * Validate required fields
   */
  protected validateRequired(
    data: Record<string, any>, 
    requiredFields: string[],
    correlationId?: string
  ): void {
    const missingFields = requiredFields.filter(field => 
      data[field] === undefined || data[field] === null || data[field] === ''
    );

    if (missingFields.length > 0) {
      this.logger.warn('Validation failed - missing required fields', {
        correlationId,
        missingFields,
        providedFields: Object.keys(data)
      });

      throw new ValidationError(
        `Missing required fields: ${missingFields.join(', ')}`,
        { missingFields }
      );
    }
  }

  /**
   * Validate user permissions
   */
  protected validateUserAccess(
    userId: string | undefined,
    resourceUserId: string,
    correlationId?: string
  ): void {
    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    if (userId !== resourceUserId) {
      this.logger.warn('Unauthorized access attempt', {
        correlationId,
        userId,
        resourceUserId
      });
      throw new ForbiddenError('Access denied to this resource');
    }
  }

  /**
   * Log service operation start
   */
  protected logOperationStart(
    operation: string,
    context: LogContext
  ): void {
    this.logger.info(`${this.serviceName} operation started: ${operation}`, context);
  }

  /**
   * Log service operation success
   */
  protected logOperationSuccess(
    operation: string,
    context: LogContext & { duration?: number }
  ): void {
    this.logger.info(`${this.serviceName} operation completed: ${operation}`, context);
  }

  /**
   * Sanitize data for logging (remove sensitive fields)
   */
  protected sanitizeForLogging(data: Record<string, any>): Record<string, any> {
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'credential'];
    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Generate a unique operation ID for tracking
   */
  protected generateOperationId(): string {
    return `${this.serviceName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
