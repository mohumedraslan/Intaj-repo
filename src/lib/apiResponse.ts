/**
 * Standardized API response wrapper and utilities
 */

import { NextResponse } from 'next/server';
import { ApiError, isApiError } from './errors';

// Standard API response interface
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  metadata?: {
    correlationId: string;
    timestamp: string;
    version: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

// Pagination metadata interface
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// API version constant
export const API_VERSION = 'v1';

/**
 * Create a successful API response
 */
export function createSuccessResponse<T>(
  data: T,
  correlationId: string,
  pagination?: PaginationMeta,
  statusCode: number = 200
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    success: true,
    data,
    metadata: {
      correlationId,
      timestamp: new Date().toISOString(),
      version: API_VERSION,
      ...(pagination && { pagination })
    }
  };

  return NextResponse.json(response, { status: statusCode });
}

/**
 * Create an error API response
 */
export function createErrorResponse(
  error: ApiError | Error,
  correlationId: string,
  statusCode?: number
): NextResponse<ApiResponse> {
  let errorResponse: ApiResponse;

  if (isApiError(error)) {
    errorResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      },
      metadata: {
        correlationId: error.correlationId || correlationId,
        timestamp: error.timestamp,
        version: API_VERSION
      }
    };
    statusCode = statusCode || error.statusCode;
  } else {
    // Handle unexpected errors
    errorResponse = {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: process.env.NODE_ENV === 'production' 
          ? 'An unexpected error occurred' 
          : error.message,
        ...(process.env.NODE_ENV === 'development' && {
          details: { stack: error.stack }
        })
      },
      metadata: {
        correlationId,
        timestamp: new Date().toISOString(),
        version: API_VERSION
      }
    };
    statusCode = statusCode || 500;
  }

  return NextResponse.json(errorResponse, { status: statusCode });
}

/**
 * Create a paginated success response
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: PaginationMeta,
  correlationId: string,
  statusCode: number = 200
): NextResponse<ApiResponse<T[]>> {
  return createSuccessResponse(data, correlationId, pagination, statusCode);
}

/**
 * Create a created resource response (201)
 */
export function createCreatedResponse<T>(
  data: T,
  correlationId: string
): NextResponse<ApiResponse<T>> {
  return createSuccessResponse(data, correlationId, undefined, 201);
}

/**
 * Create a no content response (204)
 */
export function createNoContentResponse(
  correlationId: string
): NextResponse {
  return new NextResponse(null, { 
    status: 204,
    headers: {
      'X-Correlation-ID': correlationId,
      'X-API-Version': API_VERSION
    }
  });
}

/**
 * Create pagination metadata from query parameters and total count
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
}

/**
 * Response builder class for fluent API
 */
export class ResponseBuilder<T = any> {
  private _data?: T;
  private _error?: ApiError;
  private _correlationId: string;
  private _statusCode: number = 200;
  private _pagination?: PaginationMeta;

  constructor(correlationId: string) {
    this._correlationId = correlationId;
  }

  data(data: T): ResponseBuilder<T> {
    this._data = data;
    return this;
  }

  error(error: ApiError): ResponseBuilder<T> {
    this._error = error;
    return this;
  }

  status(code: number): ResponseBuilder<T> {
    this._statusCode = code;
    return this;
  }

  paginate(pagination: PaginationMeta): ResponseBuilder<T> {
    this._pagination = pagination;
    return this;
  }

  build(): NextResponse<ApiResponse<T>> {
    if (this._error) {
      return createErrorResponse(this._error, this._correlationId, this._statusCode);
    }

    if (this._data !== undefined) {
      return createSuccessResponse(
        this._data,
        this._correlationId,
        this._pagination,
        this._statusCode
      );
    }

    throw new Error('ResponseBuilder: Either data or error must be set');
  }

  created(): NextResponse<ApiResponse<T>> {
    if (this._data !== undefined) {
      return createCreatedResponse(this._data, this._correlationId);
    }
    throw new Error('ResponseBuilder: Data must be set for created response');
  }

  noContent(): NextResponse {
    return createNoContentResponse(this._correlationId);
  }
}

/**
 * Create a new response builder
 */
export function response(correlationId: string): ResponseBuilder {
  return new ResponseBuilder(correlationId);
}

/**
 * Utility function to extract correlation ID from headers
 */
export function getCorrelationId(request: Request): string {
  return request.headers.get('x-correlation-id') || 
         request.headers.get('X-Correlation-ID') ||
         generateCorrelationId();
}

/**
 * Generate a new correlation ID
 */
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Add standard headers to response
 */
export function addStandardHeaders(
  response: NextResponse,
  correlationId: string
): NextResponse {
  response.headers.set('X-Correlation-ID', correlationId);
  response.headers.set('X-API-Version', API_VERSION);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  return response;
}

/**
 * Type-safe response helpers
 */
export const ApiResponses = {
  success: <T>(data: T, correlationId: string, pagination?: PaginationMeta) =>
    createSuccessResponse(data, correlationId, pagination),
    
  created: <T>(data: T, correlationId: string) =>
    createCreatedResponse(data, correlationId),
    
  noContent: (correlationId: string) =>
    createNoContentResponse(correlationId),
    
  error: (error: ApiError | Error, correlationId: string) =>
    createErrorResponse(error, correlationId),
    
  paginated: <T>(data: T[], pagination: PaginationMeta, correlationId: string) =>
    createPaginatedResponse(data, pagination, correlationId)
};

// Export types
export type { ApiResponse, PaginationMeta };
