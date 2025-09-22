/**
 * Security Middleware
 * Provides comprehensive security headers and CORS configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '../lib/logging/Logger';
import { getMetricsCollector } from '../lib/metrics/MetricsCollector';

const logger = createLogger('SecurityMiddleware');
const metrics = getMetricsCollector();

export interface SecurityConfig {
  contentSecurityPolicy?: string;
  allowedOrigins?: string[];
  allowedMethods?: string[];
  allowedHeaders?: string[];
  maxAge?: number;
  credentials?: boolean;
  hsts?: {
    maxAge: number;
    includeSubDomains: boolean;
    preload: boolean;
  };
  frameOptions?: 'DENY' | 'SAMEORIGIN' | string;
  contentTypeOptions?: boolean;
  referrerPolicy?: string;
  permissionsPolicy?: string;
}

/**
 * Add comprehensive security headers to response
 */
export function addSecurityHeaders(
  response: NextResponse,
  config?: SecurityConfig
): NextResponse {
  try {
    const defaultConfig: SecurityConfig = {
      contentSecurityPolicy: generateCSP(),
      allowedOrigins: getAllowedOrigins(),
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-API-Key',
        'X-Client-Version',
        'X-Request-ID',
        'Accept',
        'Origin',
        'User-Agent'
      ],
      maxAge: 86400, // 24 hours
      credentials: true,
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      },
      frameOptions: 'DENY',
      contentTypeOptions: true,
      referrerPolicy: 'strict-origin-when-cross-origin',
      permissionsPolicy: generatePermissionsPolicy()
    };

    const finalConfig = { ...defaultConfig, ...config };

    // Content Security Policy
    if (finalConfig.contentSecurityPolicy) {
      response.headers.set('Content-Security-Policy', finalConfig.contentSecurityPolicy);
    }

    // HTTP Strict Transport Security (HSTS)
    if (finalConfig.hsts && process.env.NODE_ENV === 'production') {
      const hstsValue = [
        `max-age=${finalConfig.hsts.maxAge}`,
        finalConfig.hsts.includeSubDomains ? 'includeSubDomains' : '',
        finalConfig.hsts.preload ? 'preload' : ''
      ].filter(Boolean).join('; ');
      
      response.headers.set('Strict-Transport-Security', hstsValue);
    }

    // X-Frame-Options
    if (finalConfig.frameOptions) {
      response.headers.set('X-Frame-Options', finalConfig.frameOptions);
    }

    // X-Content-Type-Options
    if (finalConfig.contentTypeOptions) {
      response.headers.set('X-Content-Type-Options', 'nosniff');
    }

    // X-XSS-Protection (legacy, but still useful for older browsers)
    response.headers.set('X-XSS-Protection', '1; mode=block');

    // Referrer Policy
    if (finalConfig.referrerPolicy) {
      response.headers.set('Referrer-Policy', finalConfig.referrerPolicy);
    }

    // Permissions Policy
    if (finalConfig.permissionsPolicy) {
      response.headers.set('Permissions-Policy', finalConfig.permissionsPolicy);
    }

    // Cross-Origin Embedder Policy
    response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');

    // Cross-Origin Opener Policy
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');

    // Cross-Origin Resource Policy
    response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');

    // Remove server information
    response.headers.delete('Server');
    response.headers.delete('X-Powered-By');

    // Add security-related custom headers
    response.headers.set('X-Security-Headers', 'applied');
    response.headers.set('X-Content-Security-Policy-Report-Only', 'false');

    metrics.incrementCounter('security_headers_applied');

    return response;

  } catch (error) {
    logger.error('Failed to add security headers', { error });
    metrics.incrementCounter('security_headers_error');
    return response;
  }
}

/**
 * CORS middleware with comprehensive configuration
 */
export function createCORSMiddleware(config?: SecurityConfig) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    try {
      const origin = request.headers.get('origin');
      const method = request.method;

      const defaultConfig: SecurityConfig = {
        allowedOrigins: getAllowedOrigins(),
        allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: [
          'Content-Type',
          'Authorization',
          'X-Requested-With',
          'X-API-Key',
          'X-Client-Version',
          'X-Request-ID',
          'Accept',
          'Origin',
          'User-Agent'
        ],
        maxAge: 86400,
        credentials: true
      };

      const finalConfig = { ...defaultConfig, ...config };

      // Handle preflight requests
      if (method === 'OPTIONS') {
        const response = new NextResponse(null, { status: 200 });

        // Check origin
        if (origin && isOriginAllowed(origin, finalConfig.allowedOrigins!)) {
          response.headers.set('Access-Control-Allow-Origin', origin);
        } else if (finalConfig.allowedOrigins!.includes('*')) {
          response.headers.set('Access-Control-Allow-Origin', '*');
        }

        // Set CORS headers
        response.headers.set('Access-Control-Allow-Methods', finalConfig.allowedMethods!.join(', '));
        response.headers.set('Access-Control-Allow-Headers', finalConfig.allowedHeaders!.join(', '));
        response.headers.set('Access-Control-Max-Age', finalConfig.maxAge!.toString());

        if (finalConfig.credentials) {
          response.headers.set('Access-Control-Allow-Credentials', 'true');
        }

        // Add security headers
        addSecurityHeaders(response, finalConfig);

        metrics.incrementCounter('cors_preflight_handled', {
          origin: origin || 'unknown',
          allowed: isOriginAllowed(origin || '', finalConfig.allowedOrigins!).toString()
        });

        return response;
      }

      // Handle actual requests
      const response = NextResponse.next();

      // Check origin for actual requests
      if (origin) {
        if (isOriginAllowed(origin, finalConfig.allowedOrigins!)) {
          response.headers.set('Access-Control-Allow-Origin', origin);
          
          if (finalConfig.credentials) {
            response.headers.set('Access-Control-Allow-Credentials', 'true');
          }

          metrics.incrementCounter('cors_request_allowed', { origin });
        } else {
          logger.warn('CORS request blocked', {
            origin,
            path: request.nextUrl.pathname,
            method: request.method
          });

          metrics.incrementCounter('cors_request_blocked', { origin });

          return NextResponse.json(
            {
              error: {
                code: 'CORS_NOT_ALLOWED',
                message: 'Origin not allowed by CORS policy'
              }
            },
            { status: 403 }
          );
        }
      }

      // Add security headers to all responses
      addSecurityHeaders(response, finalConfig);

      return null; // Allow request to proceed

    } catch (error) {
      logger.error('CORS middleware error', { error });
      metrics.incrementCounter('cors_middleware_error');
      return null; // Allow request to proceed on error
    }
  };
}

/**
 * Security middleware for API routes
 */
export function createAPISecurityMiddleware(config?: SecurityConfig) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    try {
      // Check for common attack patterns in URL
      const url = request.nextUrl.pathname + request.nextUrl.search;
      
      if (hasAttackPatterns(url)) {
        logger.warn('Potential attack detected in URL', {
          url,
          ip: request.headers.get('x-forwarded-for') || request.ip,
          userAgent: request.headers.get('user-agent')
        });

        metrics.incrementCounter('security_attack_blocked', {
          type: 'url_pattern',
          path: request.nextUrl.pathname
        });

        return NextResponse.json(
          {
            error: {
              code: 'SECURITY_VIOLATION',
              message: 'Request blocked by security policy'
            }
          },
          { status: 400 }
        );
      }

      // Check request headers for suspicious patterns
      const suspiciousHeaders = detectSuspiciousHeaders(request);
      if (suspiciousHeaders.length > 0) {
        logger.warn('Suspicious headers detected', {
          headers: suspiciousHeaders,
          ip: request.headers.get('x-forwarded-for') || request.ip
        });

        metrics.incrementCounter('security_suspicious_headers', {
          headerCount: suspiciousHeaders.length.toString()
        });
      }

      // Rate limiting based on suspicious activity
      const riskScore = calculateRequestRiskScore(request);
      if (riskScore > 80) {
        logger.warn('High-risk request detected', {
          riskScore,
          path: request.nextUrl.pathname,
          ip: request.headers.get('x-forwarded-for') || request.ip
        });

        metrics.incrementCounter('security_high_risk_request', {
          riskScore: riskScore.toString()
        });

        // Apply stricter rate limiting for high-risk requests
        // This would integrate with the rate limiting system
      }

      return null; // Allow request to proceed

    } catch (error) {
      logger.error('API security middleware error', { error });
      return null;
    }
  };
}

/**
 * Generate Content Security Policy
 */
function generateCSP(): string {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const csp = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'", // Required for Next.js in development
      "'unsafe-eval'", // Required for Next.js in development
      'https://vercel.live',
      ...(isDevelopment ? ["'unsafe-inline'", "'unsafe-eval'"] : [])
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for styled-components and CSS-in-JS
      'https://fonts.googleapis.com'
    ],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https:',
      'https://*.supabase.co',
      'https://*.vercel.app'
    ],
    'font-src': [
      "'self'",
      'https://fonts.gstatic.com'
    ],
    'connect-src': [
      "'self'",
      'https://*.supabase.co',
      'https://api.openrouter.ai',
      'https://api.openai.com',
      'https://api.anthropic.com',
      'wss://*.supabase.co',
      ...(isDevelopment ? ['ws://localhost:*', 'http://localhost:*'] : [])
    ],
    'frame-src': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': isDevelopment ? [] : ['']
  };

  return Object.entries(csp)
    .map(([directive, sources]) => 
      sources.length > 0 ? `${directive} ${sources.join(' ')}` : directive
    )
    .join('; ');
}

/**
 * Generate Permissions Policy
 */
function generatePermissionsPolicy(): string {
  const policies = {
    'camera': '()',
    'microphone': '()',
    'geolocation': '()',
    'payment': '()',
    'usb': '()',
    'magnetometer': '()',
    'gyroscope': '()',
    'accelerometer': '()',
    'ambient-light-sensor': '()',
    'autoplay': '(self)',
    'encrypted-media': '(self)',
    'fullscreen': '(self)',
    'picture-in-picture': '()'
  };

  return Object.entries(policies)
    .map(([feature, allowlist]) => `${feature}=${allowlist}`)
    .join(', ');
}

/**
 * Get allowed origins from environment
 */
function getAllowedOrigins(): string[] {
  const origins = process.env.ALLOWED_ORIGINS;
  
  if (origins) {
    return origins.split(',').map(origin => origin.trim());
  }

  // Default origins based on environment
  const defaultOrigins = [
    process.env.NEXTAUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    'https://intaj.ai',
    'https://app.intaj.ai'
  ].filter(Boolean) as string[];

  // Add localhost for development
  if (process.env.NODE_ENV === 'development') {
    defaultOrigins.push(
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000'
    );
  }

  return defaultOrigins;
}

/**
 * Check if origin is allowed
 */
function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  if (allowedOrigins.includes('*')) {
    return true;
  }

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // Check for wildcard subdomains
  return allowedOrigins.some(allowed => {
    if (allowed.startsWith('*.')) {
      const domain = allowed.substring(2);
      return origin.endsWith(`.${domain}`) || origin === domain;
    }
    return false;
  });
}

/**
 * Detect attack patterns in URL
 */
function hasAttackPatterns(url: string): boolean {
  const attackPatterns = [
    // SQL Injection
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
    /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
    /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
    
    // XSS
    /((\%3C)|<)((\%2F)|\/)*[a-z0-9\%]+((\%3E)|>)/i,
    /((\%3C)|<)((\%69)|i|(\%49))((\%6D)|m|(\%4D))((\%67)|g|(\%47))/i,
    /((\%3C)|<)[^\n]+((\%3E)|>)/i,
    
    // Path Traversal
    /\.\.[\/\\]/i,
    /((\%2E)|\.){2,}((\%2F)|\/|(\\))/i,
    
    // Command Injection
    /(\||;|&|\$\(|\`)/i,
    /(wget|curl|nc|netcat)/i,
    
    // LDAP Injection
    /(\(|\)|\*|\||&)/i
  ];

  return attackPatterns.some(pattern => pattern.test(url));
}

/**
 * Detect suspicious headers
 */
function detectSuspiciousHeaders(request: NextRequest): string[] {
  const suspicious: string[] = [];
  
  const headers = request.headers;
  
  // Check for suspicious User-Agent patterns
  const userAgent = headers.get('user-agent') || '';
  const suspiciousUA = [
    /sqlmap/i,
    /nikto/i,
    /nessus/i,
    /burp/i,
    /nmap/i,
    /masscan/i,
    /zap/i
  ];
  
  if (suspiciousUA.some(pattern => pattern.test(userAgent))) {
    suspicious.push('user-agent');
  }

  // Check for suspicious headers
  const dangerousHeaders = [
    'x-forwarded-host',
    'x-original-url',
    'x-rewrite-url'
  ];

  for (const header of dangerousHeaders) {
    if (headers.has(header)) {
      suspicious.push(header);
    }
  }

  // Check for header injection attempts
  headers.forEach((value, key) => {
    if (value.includes('\n') || value.includes('\r')) {
      suspicious.push(`${key}-injection`);
    }
  });

  return suspicious;
}

/**
 * Calculate request risk score
 */
function calculateRequestRiskScore(request: NextRequest): number {
  let score = 0;

  // Check URL for suspicious patterns
  const url = request.nextUrl.pathname + request.nextUrl.search;
  if (hasAttackPatterns(url)) {
    score += 40;
  }

  // Check headers
  const suspiciousHeaders = detectSuspiciousHeaders(request);
  score += suspiciousHeaders.length * 15;

  // Check method
  if (!['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'].includes(request.method)) {
    score += 20;
  }

  // Check for missing common headers
  if (!request.headers.get('user-agent')) {
    score += 10;
  }

  if (!request.headers.get('accept')) {
    score += 5;
  }

  return Math.min(100, score);
}

/**
 * Middleware combinations for different security levels
 */
export const securityMiddleware = {
  /**
   * Basic security headers
   */
  basic: (request: NextRequest) => {
    const response = NextResponse.next();
    return addSecurityHeaders(response);
  },

  /**
   * API security with CORS
   */
  api: createCORSMiddleware(),

  /**
   * Strict security for sensitive endpoints
   */
  strict: async (request: NextRequest) => {
    // Apply API security first
    const corsResult = await createAPISecurityMiddleware()(request);
    if (corsResult) return corsResult;

    // Apply CORS
    const apiResult = await createCORSMiddleware()(request);
    if (apiResult) return apiResult;

    return null;
  },

  /**
   * Public endpoints with basic protection
   */
  public: createCORSMiddleware({
    allowedOrigins: ['*'],
    credentials: false
  })
};
