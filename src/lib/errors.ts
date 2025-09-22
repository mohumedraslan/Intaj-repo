/**
 * Standardized error system for API endpoints
 */

import { ZodError } from 'zod';

// Base API error class
export class ApiError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, any>;
  public readonly correlationId?: string;
  public readonly timestamp: string;

  constructor(
    code: string,
    message: string,
    statusCode: number = 400,
    details?: Record<string, any>,
    correlationId?: string
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.correlationId = correlationId;
    this.timestamp = new Date().toISOString();

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      correlationId: this.correlationId,
      timestamp: this.timestamp,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined
    };
  }
}

// Validation error for Zod schema validation failures
export class ValidationError extends ApiError {
  constructor(zodError: ZodError, correlationId?: string) {
    const fieldErrors = zodError.flatten().fieldErrors;
    const formErrors = zodError.flatten().formErrors;
    
    super(
      'VALIDATION_ERROR',
      'Request validation failed',
      422,
      {
        fieldErrors,
        formErrors,
        issues: zodError.issues
      },
      correlationId
    );
    this.name = 'ValidationError';
  }
}

// Authentication errors
export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication required', correlationId?: string) {
    super('AUTHENTICATION_ERROR', message, 401, undefined, correlationId);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends ApiError {
  constructor(message: string = 'Insufficient permissions', correlationId?: string) {
    super('AUTHORIZATION_ERROR', message, 403, undefined, correlationId);
    this.name = 'AuthorizationError';
  }
}

// Resource errors
export class NotFoundError extends ApiError {
  constructor(resource: string = 'Resource', correlationId?: string) {
    super('NOT_FOUND', `${resource} not found`, 404, undefined, correlationId);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends ApiError {
  constructor(message: string = 'Resource conflict', correlationId?: string) {
    super('CONFLICT', message, 409, undefined, correlationId);
    this.name = 'ConflictError';
  }
}

// Rate limiting error
export class RateLimitError extends ApiError {
  constructor(
    limit: number,
    windowMs: number,
    retryAfter: number,
    correlationId?: string
  ) {
    super(
      'RATE_LIMIT_EXCEEDED',
      `Rate limit exceeded. Maximum ${limit} requests per ${windowMs / 1000} seconds`,
      429,
      {
        limit,
        windowMs,
        retryAfter
      },
      correlationId
    );
    this.name = 'RateLimitError';
  }
}

// Business logic errors
export class BusinessLogicError extends ApiError {
  constructor(message: string, details?: Record<string, any>, correlationId?: string) {
    super('BUSINESS_LOGIC_ERROR', message, 400, details, correlationId);
    this.name = 'BusinessLogicError';
  }
}

// External service errors
export class ExternalServiceError extends ApiError {
  constructor(
    service: string,
    message: string = 'External service error',
    correlationId?: string
  ) {
    super(
      'EXTERNAL_SERVICE_ERROR',
      `${service}: ${message}`,
      502,
      { service },
      correlationId
    );
    this.name = 'ExternalServiceError';
  }
}

// Database errors
export class DatabaseError extends ApiError {
  constructor(message: string = 'Database operation failed', correlationId?: string) {
    super('DATABASE_ERROR', message, 500, undefined, correlationId);
    this.name = 'DatabaseError';
  }
}

// Internal server errors
export class InternalServerError extends ApiError {
  constructor(message: string = 'Internal server error', correlationId?: string) {
    super('INTERNAL_SERVER_ERROR', message, 500, undefined, correlationId);
    this.name = 'InternalServerError';
  }
}

// Timeout errors
export class TimeoutError extends ApiError {
  constructor(operation: string = 'Operation', timeout: number, correlationId?: string) {
    super(
      'TIMEOUT_ERROR',
      `${operation} timed out after ${timeout}ms`,
      408,
      { operation, timeout },
      correlationId
    );
    this.name = 'TimeoutError';
  }
}

// Service unavailable
export class ServiceUnavailableError extends ApiError {
  constructor(message: string = 'Service temporarily unavailable', correlationId?: string) {
    super('SERVICE_UNAVAILABLE', message, 503, undefined, correlationId);
    this.name = 'ServiceUnavailableError';
  }
}

// Quota/limit errors
export class QuotaExceededError extends ApiError {
  constructor(
    quotaType: string,
    limit: number,
    current: number,
    correlationId?: string
  ) {
    super(
      'QUOTA_EXCEEDED',
      `${quotaType} quota exceeded. Limit: ${limit}, Current: ${current}`,
      402,
      { quotaType, limit, current },
      correlationId
    );
    this.name = 'QuotaExceededError';
  }
}

// Error factory for common scenarios
export class ErrorFactory {
  static validation(zodError: ZodError, correlationId?: string): ValidationError {
    return new ValidationError(zodError, correlationId);
  }

  static notFound(resource: string, correlationId?: string): NotFoundError {
    return new NotFoundError(resource, correlationId);
  }

  static unauthorized(message?: string, correlationId?: string): AuthenticationError {
    return new AuthenticationError(message, correlationId);
  }

  static forbidden(message?: string, correlationId?: string): AuthorizationError {
    return new AuthorizationError(message, correlationId);
  }

  static conflict(message: string, correlationId?: string): ConflictError {
    return new ConflictError(message, correlationId);
  }

  static rateLimit(
    limit: number,
    windowMs: number,
    retryAfter: number,
    correlationId?: string
  ): RateLimitError {
    return new RateLimitError(limit, windowMs, retryAfter, correlationId);
  }

  static businessLogic(
    message: string,
    details?: Record<string, any>,
    correlationId?: string
  ): BusinessLogicError {
    return new BusinessLogicError(message, details, correlationId);
  }

  static externalService(
    service: string,
    message?: string,
    correlationId?: string
  ): ExternalServiceError {
    return new ExternalServiceError(service, message, correlationId);
  }

  static database(message?: string, correlationId?: string): DatabaseError {
    return new DatabaseError(message, correlationId);
  }

  static internal(message?: string, correlationId?: string): InternalServerError {
    return new InternalServerError(message, correlationId);
  }

  static timeout(operation: string, timeout: number, correlationId?: string): TimeoutError {
    return new TimeoutError(operation, timeout, correlationId);
  }

  static serviceUnavailable(message?: string, correlationId?: string): ServiceUnavailableError {
    return new ServiceUnavailableError(message, correlationId);
  }

  static quotaExceeded(
    quotaType: string,
    limit: number,
    current: number,
    correlationId?: string
  ): QuotaExceededError {
    return new QuotaExceededError(quotaType, limit, current, correlationId);
  }
}

// Type guards for error handling
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

export function isAuthorizationError(error: unknown): error is AuthorizationError {
  return error instanceof AuthorizationError;
}

export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}

export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError;
}

// Error code constants
export const ERROR_CODES = {
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  
  // Authentication & Authorization
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  
  // Resources
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  DUPLICATE_RESOURCE: 'DUPLICATE_RESOURCE',
  
  // Rate Limiting & Quotas
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  
  // Business Logic
  BUSINESS_LOGIC_ERROR: 'BUSINESS_LOGIC_ERROR',
  INVALID_OPERATION: 'INVALID_OPERATION',
  PRECONDITION_FAILED: 'PRECONDITION_FAILED',
  
  // External Services
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  WEBHOOK_VERIFICATION_FAILED: 'WEBHOOK_VERIFICATION_FAILED',
  INTEGRATION_ERROR: 'INTEGRATION_ERROR',
  
  // System
  DATABASE_ERROR: 'DATABASE_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE'
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];
