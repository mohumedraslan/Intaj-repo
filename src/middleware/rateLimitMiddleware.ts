/**
 * Rate Limiting Middleware
 * Provides middleware functions for applying rate limits to API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { RateLimiter, RateLimitConfig, MultiTierRateLimiter, TierConfig, KeyGenerators, RateLimitConfigs } from '../lib/rateLimit/RateLimiter';
import { createLogger } from '../lib/logging/Logger';
import { getMetricsCollector } from '../lib/metrics/MetricsCollector';

const logger = createLogger('RateLimitMiddleware');
const metrics = getMetricsCollector();

/**
 * Create rate limit middleware with custom configuration
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  const limiter = new RateLimiter(config);
  
  return async (req: NextRequest): Promise<NextResponse | null> => {
    try {
      const result = await limiter.checkLimit(req);
      
      if (!result.allowed) {
        logger.warn('Rate limit exceeded', {
          path: req.nextUrl.pathname,
          limit: result.limit,
          current: result.current,
          resetTime: new Date(result.resetTime).toISOString()
        });

        return NextResponse.json(
          {
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many requests',
              details: {
                limit: result.limit,
                current: result.current,
                remaining: result.remaining,
                resetTime: new Date(result.resetTime).toISOString(),
                retryAfter: result.retryAfter
              }
            }
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': result.limit.toString(),
              'X-RateLimit-Remaining': result.remaining.toString(),
              'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
              'X-RateLimit-Reset-Timestamp': result.resetTime.toString(),
              'Retry-After': result.retryAfter.toString()
            }
          }
        );
      }

      // Add rate limit headers to successful responses
      const response = NextResponse.next();
      response.headers.set('X-RateLimit-Limit', result.limit.toString());
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
      response.headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
      response.headers.set('X-RateLimit-Reset-Timestamp', result.resetTime.toString());

      return null; // Allow request to proceed

    } catch (error) {
      logger.error('Rate limit middleware error', { error });
      // Fail open - allow request if rate limiting fails
      return null;
    }
  };
}

/**
 * Create multi-tier rate limit middleware
 */
export function createMultiTierRateLimitMiddleware(
  tiers: TierConfig[],
  keyGenerator: (req: NextRequest) => string
) {
  const limiter = new MultiTierRateLimiter(tiers, keyGenerator);
  
  return async (req: NextRequest): Promise<NextResponse | null> => {
    try {
      const result = await limiter.checkLimits(req);
      
      if (!result.allowed) {
        logger.warn('Multi-tier rate limit exceeded', {
          path: req.nextUrl.pathname,
          tier: result.tier,
          limit: result.limit,
          current: result.current
        });

        return NextResponse.json(
          {
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: `Rate limit exceeded for ${result.tier} tier`,
              details: {
                tier: result.tier,
                limit: result.limit,
                current: result.current,
                remaining: result.remaining,
                resetTime: new Date(result.resetTime).toISOString(),
                retryAfter: result.retryAfter
              }
            }
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': result.limit.toString(),
              'X-RateLimit-Remaining': result.remaining.toString(),
              'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
              'X-RateLimit-Tier': result.tier,
              'Retry-After': result.retryAfter.toString()
            }
          }
        );
      }

      return null; // Allow request to proceed

    } catch (error) {
      logger.error('Multi-tier rate limit middleware error', { error });
      return null;
    }
  };
}

/**
 * Adaptive rate limiting based on system load
 */
export function createAdaptiveRateLimitMiddleware(baseConfig: RateLimitConfig) {
  const baseLimiter = new RateLimiter(baseConfig);
  
  return async (req: NextRequest): Promise<NextResponse | null> => {
    try {
      // Get system load metrics
      const systemLoad = await getSystemLoad();
      
      // Adjust rate limits based on system load
      const adjustedConfig = adjustConfigForLoad(baseConfig, systemLoad);
      const limiter = new RateLimiter(adjustedConfig);
      
      const result = await limiter.checkLimit(req);
      
      if (!result.allowed) {
        return NextResponse.json(
          {
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Rate limit exceeded (adaptive)',
              details: {
                limit: result.limit,
                current: result.current,
                remaining: result.remaining,
                systemLoad: systemLoad.toFixed(2),
                retryAfter: result.retryAfter
              }
            }
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': result.limit.toString(),
              'X-RateLimit-Remaining': result.remaining.toString(),
              'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
              'X-System-Load': systemLoad.toFixed(2),
              'Retry-After': result.retryAfter.toString()
            }
          }
        );
      }

      return null;

    } catch (error) {
      logger.error('Adaptive rate limit middleware error', { error });
      return null;
    }
  };
}

/**
 * Get current system load
 */
async function getSystemLoad(): Promise<number> {
  try {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // Simple load calculation based on memory usage
    const memLoad = memUsage.heapUsed / memUsage.heapTotal;
    
    // Return normalized load (0-1)
    return Math.min(memLoad, 1);
    
  } catch (error) {
    logger.debug('Failed to get system load', { error });
    return 0.5; // Default moderate load
  }
}

/**
 * Adjust rate limit configuration based on system load
 */
function adjustConfigForLoad(baseConfig: RateLimitConfig, load: number): RateLimitConfig {
  // Reduce limits when system is under high load
  const loadFactor = Math.max(0.1, 1 - load);
  const adjustedMaxRequests = Math.floor(baseConfig.maxRequests * loadFactor);
  
  return {
    ...baseConfig,
    maxRequests: Math.max(1, adjustedMaxRequests)
  };
}

/**
 * Predefined middleware configurations
 */
export const rateLimitMiddleware = {
  /**
   * Authentication endpoints (very strict)
   */
  auth: createRateLimitMiddleware({
    ...RateLimitConfigs.authEndpoints,
    onLimitReached: (req, info) => {
      logger.warn('Authentication rate limit exceeded', {
        ip: req.headers.get('x-forwarded-for') || req.ip,
        path: req.nextUrl.pathname,
        userAgent: req.headers.get('user-agent')
      });
      
      metrics.incrementCounter('rate_limit_auth_exceeded', {
        path: req.nextUrl.pathname
      });
    }
  }),

  /**
   * General API endpoints
   */
  api: createRateLimitMiddleware({
    ...RateLimitConfigs.generalAPI,
    onLimitReached: (req, info) => {
      metrics.incrementCounter('rate_limit_api_exceeded', {
        path: req.nextUrl.pathname
      });
    }
  }),

  /**
   * LLM endpoints (resource intensive)
   */
  llm: createRateLimitMiddleware({
    ...RateLimitConfigs.llmEndpoints,
    onLimitReached: (req, info) => {
      logger.warn('LLM rate limit exceeded', {
        user: (req as any).user?.id,
        path: req.nextUrl.pathname
      });
      
      metrics.incrementCounter('rate_limit_llm_exceeded', {
        userId: (req as any).user?.id || 'anonymous'
      });
    }
  }),

  /**
   * File upload endpoints
   */
  upload: createRateLimitMiddleware({
    ...RateLimitConfigs.fileUpload,
    onLimitReached: (req, info) => {
      metrics.incrementCounter('rate_limit_upload_exceeded', {
        userId: (req as any).user?.id || 'anonymous'
      });
    }
  }),

  /**
   * Webhook endpoints
   */
  webhook: createRateLimitMiddleware({
    ...RateLimitConfigs.webhooks,
    skipIf: (req) => {
      // Skip rate limiting for trusted webhook sources
      const trustedIPs = process.env.TRUSTED_WEBHOOK_IPS?.split(',') || [];
      const clientIP = req.headers.get('x-forwarded-for') || req.ip;
      return trustedIPs.includes(clientIP || '');
    }
  }),

  /**
   * Multi-tier rate limiting for premium users
   */
  tiered: createMultiTierRateLimitMiddleware(
    [
      {
        name: 'burst',
        windowMs: 1000, // 1 second
        maxRequests: 10,
        priority: 1
      },
      {
        name: 'sustained',
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 100,
        priority: 2
      },
      {
        name: 'hourly',
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 1000,
        priority: 3
      }
    ],
    KeyGenerators.byUser
  ),

  /**
   * Adaptive rate limiting based on system load
   */
  adaptive: createAdaptiveRateLimitMiddleware(RateLimitConfigs.generalAPI),

  /**
   * Custom rate limiting by subscription tier
   */
  bySubscription: (req: NextRequest): Promise<NextResponse | null> => {
    const user = (req as any).user;
    
    if (!user) {
      // Use IP-based limiting for unauthenticated users
      return rateLimitMiddleware.api(req);
    }

    // Get user's subscription tier
    const subscriptionTier = user.profile?.subscriptionTier || 'free';
    
    const tierLimits = {
      free: { windowMs: 60 * 1000, maxRequests: 50 },
      pro: { windowMs: 60 * 1000, maxRequests: 200 },
      enterprise: { windowMs: 60 * 1000, maxRequests: 1000 }
    };

    const config = tierLimits[subscriptionTier as keyof typeof tierLimits] || tierLimits.free;
    
    const limiter = new RateLimiter({
      ...config,
      keyGenerator: KeyGenerators.byUser,
      onLimitReached: (req, info) => {
        metrics.incrementCounter('rate_limit_subscription_exceeded', {
          tier: subscriptionTier,
          userId: user.id
        });
      }
    });

    return limiter.checkLimit(req).then(result => {
      if (!result.allowed) {
        return NextResponse.json(
          {
            error: {
              code: 'SUBSCRIPTION_RATE_LIMIT_EXCEEDED',
              message: `Rate limit exceeded for ${subscriptionTier} tier`,
              details: {
                tier: subscriptionTier,
                limit: result.limit,
                current: result.current,
                upgradeUrl: '/billing/upgrade'
              }
            }
          },
          { status: 429 }
        );
      }
      return null;
    });
  }
};

/**
 * Combine rate limiting with other middleware
 */
export function combineWithRateLimit(
  rateLimitMiddleware: (req: NextRequest) => Promise<NextResponse | null>,
  ...otherMiddleware: Array<(req: NextRequest) => Promise<NextResponse | null>>
) {
  return async (req: NextRequest): Promise<NextResponse | null> => {
    // Apply rate limiting first
    const rateLimitResult = await rateLimitMiddleware(req);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Apply other middleware
    for (const middleware of otherMiddleware) {
      const result = await middleware(req);
      if (result) {
        return result;
      }
    }

    return null;
  };
}

/**
 * Rate limit bypass for emergency situations
 */
export function createEmergencyBypass(
  normalMiddleware: (req: NextRequest) => Promise<NextResponse | null>,
  bypassCondition: (req: NextRequest) => boolean
) {
  return async (req: NextRequest): Promise<NextResponse | null> => {
    if (bypassCondition(req)) {
      logger.info('Rate limit bypassed for emergency', {
        path: req.nextUrl.pathname,
        ip: req.headers.get('x-forwarded-for') || req.ip
      });
      
      metrics.incrementCounter('rate_limit_emergency_bypass');
      return null; // Allow request to proceed
    }

    return normalMiddleware(req);
  };
}
