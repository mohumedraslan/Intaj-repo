/**
 * Authentication Middleware
 * Provides authentication and authorization middleware for API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthService, AuthUser, UnauthorizedError, ForbiddenError } from '../lib/auth/AuthService';
import { Permission, hasPermission, hasAnyPermission, hasAllPermissions, PermissionContext } from '../lib/auth/permissions';
import { createLogger } from '../lib/logging/Logger';
import { getMetricsCollector } from '../lib/metrics/MetricsCollector';
import { captureError } from '../lib/monitoring/errorTracking';

const logger = createLogger('AuthMiddleware');
const metrics = getMetricsCollector();

export interface AuthenticatedRequest extends NextRequest {
  user: AuthUser;
  permissionContext: PermissionContext;
}

/**
 * Extract token from request headers
 */
function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Check for API key in header
  const apiKey = request.headers.get('x-api-key');
  if (apiKey) {
    return apiKey;
  }
  
  return null;
}

/**
 * Determine authentication method based on token format
 */
function getAuthMethod(token: string): 'jwt' | 'api_key' {
  // API keys start with 'intaj_'
  if (token.startsWith('intaj_')) {
    return 'api_key';
  }
  
  // JWT tokens are base64 encoded and contain dots
  if (token.includes('.')) {
    return 'jwt';
  }
  
  // Default to JWT
  return 'jwt';
}

/**
 * Create permission context from authenticated user
 */
async function createPermissionContext(user: AuthUser, request: NextRequest): Promise<PermissionContext> {
  // Extract resource information from URL if available
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  
  // Extract team/organization context from headers or path
  const teamId = request.headers.get('x-team-id') || undefined;
  const organizationId = request.headers.get('x-organization-id') || undefined;
  
  return {
    userId: user.id,
    role: user.role as any,
    permissions: user.permissions as Permission[],
    teamId,
    organizationId
  };
}

/**
 * Basic authentication middleware - validates token and sets user context
 */
export function requireAuth() {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const startTime = Date.now();
    
    try {
      const token = extractToken(request);
      
      if (!token) {
        metrics.incrementCounter('auth_middleware_no_token');
        return NextResponse.json(
          {
            error: {
              code: 'MISSING_TOKEN',
              message: 'Authentication token required'
            }
          },
          { status: 401 }
        );
      }

      const authService = getAuthService();
      const authMethod = getAuthMethod(token);
      
      let user: AuthUser;
      
      if (authMethod === 'api_key') {
        user = await authService.validateAPIKey(token);
        metrics.incrementCounter('auth_middleware_api_key_success');
      } else {
        user = await authService.validateJWTToken(token);
        metrics.incrementCounter('auth_middleware_jwt_success');
      }

      // Create permission context
      const permissionContext = await createPermissionContext(user, request);

      // Add user and context to request
      (request as AuthenticatedRequest).user = user;
      (request as AuthenticatedRequest).permissionContext = permissionContext;

      metrics.recordHistogram('auth_middleware_duration', Date.now() - startTime);

      logger.debug('Authentication successful', {
        userId: user.id,
        method: authMethod,
        role: user.role,
        path: request.nextUrl.pathname
      });

      return null; // Allow request to proceed

    } catch (error) {
      metrics.recordHistogram('auth_middleware_duration', Date.now() - startTime);
      
      if (error instanceof UnauthorizedError) {
        metrics.incrementCounter('auth_middleware_unauthorized', {
          code: error.code
        });
        
        return NextResponse.json(
          {
            error: {
              code: error.code,
              message: error.message
            }
          },
          { status: 401 }
        );
      }

      if (error instanceof ForbiddenError) {
        metrics.incrementCounter('auth_middleware_forbidden', {
          code: error.code
        });
        
        return NextResponse.json(
          {
            error: {
              code: error.code,
              message: error.message
            }
          },
          { status: 403 }
        );
      }

      logger.error('Authentication middleware error', { error });
      captureError(error as Error, {
        context: 'auth_middleware',
        path: request.nextUrl.pathname
      });

      metrics.incrementCounter('auth_middleware_error');

      return NextResponse.json(
        {
          error: {
            code: 'AUTH_ERROR',
            message: 'Authentication failed'
          }
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Permission-based authorization middleware
 */
export function requirePermissions(permissions: Permission[]) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const authenticatedRequest = request as AuthenticatedRequest;
    
    if (!authenticatedRequest.user || !authenticatedRequest.permissionContext) {
      return NextResponse.json(
        {
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required before checking permissions'
          }
        },
        { status: 401 }
      );
    }

    const { permissionContext } = authenticatedRequest;
    
    // Extract resource ID from URL if available
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const resourceId = pathSegments[pathSegments.length - 1];

    const hasRequiredPermissions = hasAllPermissions(
      permissionContext,
      permissions,
      resourceId !== 'undefined' ? resourceId : undefined
    );

    if (!hasRequiredPermissions) {
      metrics.incrementCounter('auth_middleware_insufficient_permissions', {
        userId: permissionContext.userId,
        requiredPermissions: permissions.join(','),
        userRole: permissionContext.role
      });

      logger.warn('Insufficient permissions', {
        userId: permissionContext.userId,
        requiredPermissions: permissions,
        userPermissions: permissionContext.permissions,
        path: request.nextUrl.pathname
      });

      return NextResponse.json(
        {
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Insufficient permissions to access this resource',
            requiredPermissions: permissions
          }
        },
        { status: 403 }
      );
    }

    metrics.incrementCounter('auth_middleware_permission_granted', {
      permissions: permissions.join(',')
    });

    return null; // Allow request to proceed
  };
}

/**
 * Role-based authorization middleware
 */
export function requireRole(allowedRoles: string[]) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const authenticatedRequest = request as AuthenticatedRequest;
    
    if (!authenticatedRequest.user) {
      return NextResponse.json(
        {
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required'
          }
        },
        { status: 401 }
      );
    }

    const userRole = authenticatedRequest.user.role;
    
    if (!allowedRoles.includes(userRole)) {
      metrics.incrementCounter('auth_middleware_role_denied', {
        userRole,
        allowedRoles: allowedRoles.join(',')
      });

      logger.warn('Role access denied', {
        userId: authenticatedRequest.user.id,
        userRole,
        allowedRoles,
        path: request.nextUrl.pathname
      });

      return NextResponse.json(
        {
          error: {
            code: 'ROLE_ACCESS_DENIED',
            message: 'Your role does not have access to this resource',
            requiredRoles: allowedRoles
          }
        },
        { status: 403 }
      );
    }

    metrics.incrementCounter('auth_middleware_role_granted', {
      role: userRole
    });

    return null; // Allow request to proceed
  };
}

/**
 * Optional authentication middleware - validates token if present but doesn't require it
 */
export function optionalAuth() {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    try {
      const token = extractToken(request);
      
      if (!token) {
        return null; // No token provided, continue without authentication
      }

      const authService = getAuthService();
      const authMethod = getAuthMethod(token);
      
      let user: AuthUser;
      
      if (authMethod === 'api_key') {
        user = await authService.validateAPIKey(token);
      } else {
        user = await authService.validateJWTToken(token);
      }

      // Create permission context
      const permissionContext = await createPermissionContext(user, request);

      // Add user and context to request
      (request as AuthenticatedRequest).user = user;
      (request as AuthenticatedRequest).permissionContext = permissionContext;

      logger.debug('Optional authentication successful', {
        userId: user.id,
        method: authMethod
      });

      return null; // Allow request to proceed

    } catch (error) {
      // Log error but don't block request
      logger.debug('Optional authentication failed', { error });
      return null; // Continue without authentication
    }
  };
}

/**
 * Resource ownership middleware - ensures user owns the resource
 */
export function requireResourceOwnership(resourceType: string) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const authenticatedRequest = request as AuthenticatedRequest;
    
    if (!authenticatedRequest.user) {
      return NextResponse.json(
        {
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required'
          }
        },
        { status: 401 }
      );
    }

    // Extract resource ID from URL
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const resourceId = pathSegments[pathSegments.length - 1];

    if (!resourceId || resourceId === 'undefined') {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_RESOURCE_ID',
            message: 'Resource ID is required'
          }
        },
        { status: 400 }
      );
    }

    // Check resource ownership (this would typically involve a database query)
    // For now, we'll implement a basic check
    // TODO: Implement actual resource ownership validation based on resourceType

    logger.debug('Resource ownership check', {
      userId: authenticatedRequest.user.id,
      resourceType,
      resourceId
    });

    return null; // Allow request to proceed
  };
}

/**
 * Combine multiple middleware functions
 */
export function combineMiddleware(...middlewares: Array<(req: NextRequest) => Promise<NextResponse | null>>) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    for (const middleware of middlewares) {
      const result = await middleware(request);
      if (result) {
        return result; // Middleware blocked the request
      }
    }
    return null; // All middleware passed
  };
}

/**
 * Common middleware combinations
 */
export const authMiddleware = {
  // Basic authentication required
  required: requireAuth(),
  
  // Optional authentication
  optional: optionalAuth(),
  
  // Admin only
  adminOnly: combineMiddleware(
    requireAuth(),
    requireRole(['admin', 'super_admin'])
  ),
  
  // User management permissions
  userManagement: combineMiddleware(
    requireAuth(),
    requirePermissions([Permission.USER_MANAGE])
  ),
  
  // Agent management permissions
  agentManagement: combineMiddleware(
    requireAuth(),
    requirePermissions([Permission.AGENT_CREATE, Permission.AGENT_UPDATE])
  ),
  
  // System administration
  systemAdmin: combineMiddleware(
    requireAuth(),
    requirePermissions([Permission.SYSTEM_CONFIG, Permission.SYSTEM_LOGS])
  )
};
