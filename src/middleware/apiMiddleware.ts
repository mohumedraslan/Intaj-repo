/**
 * Comprehensive API middleware stack
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';
import { 
  AuthenticatedUser, 
  ServiceAccount, 
  getAuthService, 
  extractAuthToken, 
  getAuthType, 
  getClientIP,
  Permission 
} from './auth';
import { getRateLimiter, RateLimitConfig } from '@/lib/rateLimiterV2';
import { 
  createErrorResponse, 
  generateCorrelationId, 
  addStandardHeaders,
  ApiResponse 
} from '@/lib/apiResponse';
import { 
  ApiError, 
  ValidationError, 
  ErrorFactory, 
  isApiError 
} from '@/lib/errors';

// API handler context interface
export interface ApiContext {
  req: NextRequest;
  user?: AuthenticatedUser;
  service?: ServiceAccount;
  data: any;
  correlationId: string;
  startTime: number;
  clientIP: string;
}

// API handler function type
export type ApiHandler<T = any> = (context: ApiContext) => Promise<NextResponse<ApiResponse<T>>>;

// Middleware configuration interface
export interface MiddlewareConfig {
  auth?: {
    required?: boolean;
    allowApiKey?: boolean;
    allowService?: boolean;
    requiredRole?: string;
    requiredPermissions?: Permission[];
    requiredSubscription?: string;
  };
  validation?: {
    body?: ZodSchema;
    query?: ZodSchema;
    params?: ZodSchema;
  };
  rateLimit?: RateLimitConfig | boolean;
  cors?: {
    origins?: string[];
    methods?: string[];
    headers?: string[];
    credentials?: boolean;
  };
  logging?: {
    enabled?: boolean;
    logBody?: boolean;
    logResponse?: boolean;
  };
  timeout?: number;
}

/**
 * Main API middleware wrapper
 */
export function withApiMiddleware<T = any>(
  handler: ApiHandler<T>,
  config: MiddlewareConfig = {}
) {
  return async (req: NextRequest): Promise<NextResponse<ApiResponse<T>>> => {
    const startTime = Date.now();
    const correlationId = generateCorrelationId();
    const clientIP = getClientIP(req);

    let context: ApiContext = {
      req,
      data: {},
      correlationId,
      startTime,
      clientIP
    };

    try {
      // 1. CORS handling
      const corsResponse = await handleCORS(req, config.cors);
      if (corsResponse) {
        return corsResponse;
      }

      // 2. Request timeout
      if (config.timeout) {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(ErrorFactory.timeout('Request', config.timeout!, correlationId));
          }, config.timeout);
        });

        return await Promise.race([
          processRequest(handler, context, config),
          timeoutPromise
        ]);
      }

      return await processRequest(handler, context, config);

    } catch (error) {
      return handleError(error, correlationId, context);
    }
  };
}

/**
 * Process the main request pipeline
 */
async function processRequest<T>(
  handler: ApiHandler<T>,
  context: ApiContext,
  config: MiddlewareConfig
): Promise<NextResponse<ApiResponse<T>>> {
  
  // 1. Authentication
  if (config.auth?.required !== false) {
    await authenticateRequest(context, config.auth);
  }

  // 2. Rate limiting
  if (config.rateLimit) {
    await applyRateLimit(context, config.rateLimit);
  }

  // 3. Request validation
  if (config.validation) {
    await validateRequest(context, config.validation);
  }

  // 4. Logging (request)
  if (config.logging?.enabled !== false) {
    logRequest(context, config.logging);
  }

  // 5. Execute handler
  const response = await handler(context);

  // 6. Add standard headers
  addStandardHeaders(response, context.correlationId);

  // 7. Logging (response)
  if (config.logging?.enabled !== false) {
    logResponse(context, response, config.logging);
  }

  return response;
}

/**
 * Handle CORS preflight and headers
 */
async function handleCORS(
  req: NextRequest,
  corsConfig?: MiddlewareConfig['cors']
): Promise<NextResponse | null> {
  
  if (!corsConfig) {
    return null;
  }

  const origin = req.headers.get('origin');
  const method = req.method;

  // Handle preflight OPTIONS request
  if (method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 });
    
    // Set CORS headers
    if (corsConfig.origins?.includes(origin || '') || corsConfig.origins?.includes('*')) {
      response.headers.set('Access-Control-Allow-Origin', origin || '*');
    }
    
    if (corsConfig.methods) {
      response.headers.set('Access-Control-Allow-Methods', corsConfig.methods.join(', '));
    }
    
    if (corsConfig.headers) {
      response.headers.set('Access-Control-Allow-Headers', corsConfig.headers.join(', '));
    }
    
    if (corsConfig.credentials) {
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    
    response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
    
    return response;
  }

  return null;
}

/**
 * Authenticate the request
 */
async function authenticateRequest(
  context: ApiContext,
  authConfig?: MiddlewareConfig['auth']
): Promise<void> {
  
  if (!authConfig?.required) {
    return;
  }

  const token = extractAuthToken(context.req);
  
  if (!token) {
    throw ErrorFactory.unauthorized('Authentication token required', context.correlationId);
  }

  const authService = getAuthService();
  const authType = getAuthType(token);

  try {
    switch (authType) {
      case 'jwt':
        context.user = await authService.authenticateJWT(token, context.correlationId);
        break;
        
      case 'api_key':
        if (!authConfig.allowApiKey) {
          throw ErrorFactory.unauthorized('API key authentication not allowed', context.correlationId);
        }
        context.user = await authService.authenticateApiKey(token, context.correlationId);
        break;
        
      case 'service':
        if (!authConfig.allowService) {
          throw ErrorFactory.unauthorized('Service authentication not allowed', context.correlationId);
        }
        context.service = await authService.authenticateService(token, context.correlationId);
        break;
        
      default:
        throw ErrorFactory.unauthorized('Invalid authentication method', context.correlationId);
    }

    // Check role requirements
    if (authConfig.requiredRole && context.user) {
      authService.checkRole(context.user, authConfig.requiredRole, context.correlationId);
    }

    // Check permission requirements
    if (authConfig.requiredPermissions && context.user) {
      for (const permission of authConfig.requiredPermissions) {
        await authService.checkPermission(context.user, permission, context.correlationId);
      }
    }

    // Check subscription requirements
    if (authConfig.requiredSubscription && context.user) {
      authService.checkSubscriptionAccess(
        context.user, 
        authConfig.requiredSubscription, 
        context.correlationId
      );
    }

  } catch (error) {
    if (isApiError(error)) {
      throw error;
    }
    throw ErrorFactory.unauthorized('Authentication failed', context.correlationId);
  }
}

/**
 * Apply rate limiting
 */
async function applyRateLimit(
  context: ApiContext,
  rateLimitConfig: RateLimitConfig | boolean
): Promise<void> {
  
  const rateLimiter = getRateLimiter();
  
  // Determine rate limit identifier
  let identifier: string;
  
  if (context.user) {
    identifier = context.user.id;
  } else if (context.service) {
    identifier = `service:${context.service.id}`;
  } else {
    identifier = `ip:${context.clientIP}`;
  }

  // Apply rate limiting
  if (typeof rateLimitConfig === 'boolean' && rateLimitConfig) {
    // Use default rate limit config
    await rateLimiter.enforceRateLimit(identifier, undefined, context.correlationId);
  } else if (typeof rateLimitConfig === 'object') {
    // Use custom rate limit config
    await rateLimiter.enforceRateLimit(identifier, rateLimitConfig, context.correlationId);
  }
}

/**
 * Validate request data
 */
async function validateRequest(
  context: ApiContext,
  validationConfig: MiddlewareConfig['validation']
): Promise<void> {
  
  const validatedData: any = {};

  try {
    // Validate request body
    if (validationConfig?.body) {
      const body = await context.req.json().catch(() => ({}));
      validatedData.body = validationConfig.body.parse(body);
    }

    // Validate query parameters
    if (validationConfig?.query) {
      const url = new URL(context.req.url);
      const queryParams = Object.fromEntries(url.searchParams.entries());
      validatedData.query = validationConfig.query.parse(queryParams);
    }

    // Validate URL parameters (would need to be extracted from route)
    if (validationConfig?.params) {
      // This would typically be handled by the Next.js router
      // For now, we'll skip this or implement custom parameter extraction
    }

    context.data = validatedData;

  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError(error, context.correlationId);
    }
    throw ErrorFactory.validation(error as ZodError, context.correlationId);
  }
}

/**
 * Log incoming request
 */
function logRequest(
  context: ApiContext,
  loggingConfig?: MiddlewareConfig['logging']
): void {
  
  const logData = {
    correlationId: context.correlationId,
    method: context.req.method,
    url: context.req.url,
    userAgent: context.req.headers.get('user-agent'),
    clientIP: context.clientIP,
    userId: context.user?.id,
    serviceId: context.service?.id,
    timestamp: new Date().toISOString()
  };

  if (loggingConfig?.logBody && context.data.body) {
    (logData as any).body = context.data.body;
  }

  console.log('API Request:', JSON.stringify(logData));
}

/**
 * Log response
 */
function logResponse(
  context: ApiContext,
  response: NextResponse,
  loggingConfig?: MiddlewareConfig['logging']
): void {
  
  const duration = Date.now() - context.startTime;
  
  const logData = {
    correlationId: context.correlationId,
    status: response.status,
    duration: `${duration}ms`,
    userId: context.user?.id,
    serviceId: context.service?.id,
    timestamp: new Date().toISOString()
  };

  console.log('API Response:', JSON.stringify(logData));
}

/**
 * Handle errors and create error response
 */
function handleError(
  error: unknown,
  correlationId: string,
  context: Partial<ApiContext>
): NextResponse<ApiResponse> {
  
  // Log error
  console.error('API Error:', {
    correlationId,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    userId: context.user?.id,
    serviceId: context.service?.id,
    url: context.req?.url,
    method: context.req?.method
  });

  // Create error response
  if (isApiError(error)) {
    return createErrorResponse(error, correlationId);
  } else if (error instanceof Error) {
    return createErrorResponse(
      ErrorFactory.internal(error.message, correlationId),
      correlationId
    );
  } else {
    return createErrorResponse(
      ErrorFactory.internal('An unexpected error occurred', correlationId),
      correlationId
    );
  }
}

/**
 * Convenience middleware builders
 */
export const ApiMiddleware = {
  // Public endpoint (no auth required)
  public: (handler: ApiHandler, config: Omit<MiddlewareConfig, 'auth'> = {}) =>
    withApiMiddleware(handler, { ...config, auth: { required: false } }),

  // Authenticated endpoint (JWT required)
  authenticated: (handler: ApiHandler, config: Omit<MiddlewareConfig, 'auth'> = {}) =>
    withApiMiddleware(handler, { ...config, auth: { required: true } }),

  // Admin only endpoint
  admin: (handler: ApiHandler, config: Omit<MiddlewareConfig, 'auth'> = {}) =>
    withApiMiddleware(handler, { 
      ...config, 
      auth: { required: true, requiredRole: 'admin' } 
    }),

  // API key endpoint
  apiKey: (handler: ApiHandler, config: Omit<MiddlewareConfig, 'auth'> = {}) =>
    withApiMiddleware(handler, { 
      ...config, 
      auth: { required: true, allowApiKey: true } 
    }),

  // Service endpoint (for internal services)
  service: (handler: ApiHandler, config: Omit<MiddlewareConfig, 'auth'> = {}) =>
    withApiMiddleware(handler, { 
      ...config, 
      auth: { required: true, allowService: true } 
    }),

  // Webhook endpoint (rate limited, no auth)
  webhook: (handler: ApiHandler, config: Omit<MiddlewareConfig, 'auth' | 'rateLimit'> = {}) =>
    withApiMiddleware(handler, { 
      ...config, 
      auth: { required: false },
      rateLimit: {
        windowMs: 60 * 1000,
        maxRequests: 1000,
        keyGenerator: (id: string) => `webhook:${id}`
      }
    })
};

// Export types
export type { ApiContext, ApiHandler, MiddlewareConfig };
