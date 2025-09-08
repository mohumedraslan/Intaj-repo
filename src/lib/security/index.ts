import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { sessionManager } from './sessionManager';
import { auditLogger } from './auditLogger';
import { inputValidator, userSchema, messageSchema, fileSchema } from './inputValidator';
import { applySecurityHeaders, applyCors } from './middleware';

export async function securityMiddleware(request: NextRequest) {
  // Initialize response with security headers and CORS
  let response = applyCors(request);
  response = applySecurityHeaders(response);

  // Skip auth check for public routes
  if (isPublicRoute(request.nextUrl.pathname)) {
    return response;
  }

  try {
    // Validate session
    const sessionId = request.headers.get('X-Session-ID');
    const tokenId = request.headers.get('X-Token-ID');
    
    if (!sessionId || !tokenId) {
      throw new Error('Missing session credentials');
    }

    const session = await sessionManager.validateSession(sessionId, tokenId);
    
    if (!session) {
      throw new Error('Invalid session');
    }

    // Check 2FA requirement for sensitive routes
    if (requiresTwoFactor(request.nextUrl.pathname)) {
      const twoFactorToken = request.headers.get('X-2FA-Token');
      if (!twoFactorToken) {
        throw new Error('2FA required');
      }
      // 2FA validation would happen here
    }

    // Validate and sanitize input
    if (request.method !== 'GET') {
      const contentType = request.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const body = await request.json();
        validateRequestBody(request.nextUrl.pathname, body);
      }
    }

    // Log the request
    await auditLogger.logDataAccess(
      session.userId,
      'api',
      request.nextUrl.pathname,
      request.method,
      {
        userAgent: request.headers.get('user-agent'),
        path: request.nextUrl.pathname,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
      }
    );

    return response;
  } catch (err) {
    const error = err as Error;
    // Log security events
    await auditLogger.logSecurityEvent(
      'anonymous',
      'auth_failure',
      {
        error: error.message || 'Unknown error',
        path: request.nextUrl.pathname,
        headers: Object.fromEntries(request.headers.entries()),
      }
    );

    // Return appropriate error response
    return new NextResponse(
      JSON.stringify({
        error: {
          code: getErrorCode(error),
          message: getErrorMessage(error),
        }
      }),
      {
        status: getErrorStatus(error),
        headers: {
          'Content-Type': 'application/json',
          ...Object.fromEntries(response.headers.entries()),
        }
      }
    );
  }
}

function isPublicRoute(pathname: string): boolean {
  const publicRoutes = [
    '/api/auth/login',
    '/api/auth/signup',
    '/api/auth/reset-password',
    '/api/health',
    // Add other public routes
  ];

  return publicRoutes.some(route => pathname.startsWith(route));
}

function requiresTwoFactor(pathname: string): boolean {
  const sensitiveRoutes = [
    '/api/user/settings',
    '/api/billing',
    '/api/admin',
    // Add other sensitive routes
  ];

  return sensitiveRoutes.some(route => pathname.startsWith(route));
}

function validateRequestBody(pathname: string, body: unknown): void {
  // Add validation schemas for different routes
  const routeSchemas: Record<string, z.ZodSchema> = {
    '/api/user': userSchema,
    '/api/chat/message': messageSchema,
    '/api/files/upload': fileSchema,
    // Add other route schemas
  };

  const schema = routeSchemas[pathname];
  if (schema) {
    schema.parse(body);
    // After validation, sanitize the data
    if (typeof body === 'object' && body !== null) {
      Object.entries(body as Record<string, unknown>).forEach(([key, value]) => {
        if (typeof value === 'string') {
          (body as Record<string, unknown>)[key] = inputValidator.sanitizeHTML(value);
        }
      });
    }
  }
}

function getErrorCode(error: Error): string {
  switch(error.message) {
    case 'Missing session credentials':
      return 'auth/missing-credentials';
    case 'Invalid session':
      return 'auth/invalid-session';
    case '2FA required':
      return 'auth/2fa-required';
    default:
      return 'internal/unknown';
  }
}

function getErrorMessage(error: Error): string {
  switch(error.message) {
    case 'Missing session credentials':
      return 'Authentication credentials are missing';
    case 'Invalid session':
      return 'Invalid or expired session';
    case '2FA required':
      return 'Two-factor authentication is required';
    default:
      return 'An unknown error occurred';
  }
}

function getErrorStatus(error: Error): number {
  switch(error.message) {
    case 'Missing session credentials':
      return 401;
    case 'Invalid session':
      return 401;
    case '2FA required':
      return 403;
    default:
      return 500;
  }
}
