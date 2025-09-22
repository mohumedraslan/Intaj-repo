/**
 * Advanced Rate Limiting System
 * Provides multi-tier rate limiting with Redis backend and flexible configuration
 */

import { NextRequest } from 'next/server';
import { Redis } from 'ioredis';
import { createLogger } from '../logging/Logger';
import { getMetricsCollector } from '../metrics/MetricsCollector';
import { captureError } from '../monitoring/errorTracking';

const logger = createLogger('RateLimiter');
const metrics = getMetricsCollector();

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator: (req: NextRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  skipIf?: (req: NextRequest) => boolean;
  onLimitReached?: (req: NextRequest, info: RateLimitInfo) => void;
  store?: 'redis' | 'memory';
  prefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  current: number;
  remaining: number;
  resetTime: number;
  retryAfter: number;
}

export interface RateLimitInfo extends RateLimitResult {
  key: string;
  windowMs: number;
}

export interface TierConfig {
  name: string;
  windowMs: number;
  maxRequests: number;
  priority: number;
}

/**
 * Multi-tier rate limiter with Redis backend
 */
export class RateLimiter {
  private redis: Redis;
  private memoryStore = new Map<string, { count: number; resetTime: number }>();

  constructor(private config: RateLimitConfig) {
    if (config.store === 'redis' || !config.store) {
      this.redis = new Redis(process.env.REDIS_URL!);
    }
  }

  /**
   * Check rate limit for a request
   */
  async checkLimit(req: NextRequest): Promise<RateLimitResult> {
    const startTime = Date.now();

    try {
      // Skip if condition is met
      if (this.config.skipIf && this.config.skipIf(req)) {
        return this.createAllowedResult();
      }

      const key = this.generateKey(req);
      const window = Math.floor(Date.now() / this.config.windowMs);
      
      let result: RateLimitResult;

      if (this.config.store === 'memory') {
        result = await this.checkMemoryLimit(key, window);
      } else {
        result = await this.checkRedisLimit(key, window);
      }

      // Track metrics
      metrics.incrementCounter('rate_limit_check', {
        allowed: result.allowed.toString(),
        key: this.sanitizeKey(key)
      });

      if (!result.allowed) {
        metrics.incrementCounter('rate_limit_exceeded', {
          key: this.sanitizeKey(key)
        });

        // Call limit reached callback
        if (this.config.onLimitReached) {
          const info: RateLimitInfo = {
            ...result,
            key,
            windowMs: this.config.windowMs
          };
          this.config.onLimitReached(req, info);
        }

        logger.warn('Rate limit exceeded', {
          key: this.sanitizeKey(key),
          current: result.current,
          limit: result.limit,
          resetTime: new Date(result.resetTime).toISOString()
        });
      }

      metrics.recordHistogram('rate_limit_check_duration', Date.now() - startTime);

      return result;

    } catch (error) {
      logger.error('Rate limit check failed', { error });
      captureError(error as Error, {
        context: 'rate_limit_check'
      });

      // Fail open - allow request if rate limiting fails
      return this.createAllowedResult();
    }
  }

  /**
   * Reset rate limit for a key
   */
  async resetLimit(req: NextRequest): Promise<void> {
    try {
      const key = this.generateKey(req);
      
      if (this.config.store === 'memory') {
        this.memoryStore.delete(key);
      } else {
        const window = Math.floor(Date.now() / this.config.windowMs);
        const redisKey = this.getRedisKey(key, window);
        await this.redis.del(redisKey);
      }

      logger.info('Rate limit reset', {
        key: this.sanitizeKey(key)
      });

    } catch (error) {
      logger.error('Failed to reset rate limit', { error });
    }
  }

  /**
   * Get current rate limit status
   */
  async getStatus(req: NextRequest): Promise<RateLimitResult> {
    try {
      const key = this.generateKey(req);
      const window = Math.floor(Date.now() / this.config.windowMs);
      
      if (this.config.store === 'memory') {
        return this.getMemoryStatus(key, window);
      } else {
        return this.getRedisStatus(key, window);
      }

    } catch (error) {
      logger.error('Failed to get rate limit status', { error });
      return this.createAllowedResult();
    }
  }

  /**
   * Check rate limit using Redis
   */
  private async checkRedisLimit(key: string, window: number): Promise<RateLimitResult> {
    const redisKey = this.getRedisKey(key, window);
    
    const current = await this.redis.incr(redisKey);
    
    if (current === 1) {
      await this.redis.expire(redisKey, Math.ceil(this.config.windowMs / 1000));
    }

    const resetTime = (window + 1) * this.config.windowMs;
    const remaining = Math.max(0, this.config.maxRequests - current);
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);

    return {
      allowed: current <= this.config.maxRequests,
      limit: this.config.maxRequests,
      current,
      remaining,
      resetTime,
      retryAfter
    };
  }

  /**
   * Check rate limit using memory store
   */
  private async checkMemoryLimit(key: string, window: number): Promise<RateLimitResult> {
    const resetTime = (window + 1) * this.config.windowMs;
    const now = Date.now();

    const existing = this.memoryStore.get(key);
    
    if (!existing || existing.resetTime <= now) {
      // New window
      this.memoryStore.set(key, { count: 1, resetTime });
      
      return {
        allowed: true,
        limit: this.config.maxRequests,
        current: 1,
        remaining: this.config.maxRequests - 1,
        resetTime,
        retryAfter: Math.ceil((resetTime - now) / 1000)
      };
    }

    // Increment existing count
    existing.count++;
    const remaining = Math.max(0, this.config.maxRequests - existing.count);

    return {
      allowed: existing.count <= this.config.maxRequests,
      limit: this.config.maxRequests,
      current: existing.count,
      remaining,
      resetTime: existing.resetTime,
      retryAfter: Math.ceil((existing.resetTime - now) / 1000)
    };
  }

  /**
   * Get Redis status without incrementing
   */
  private async getRedisStatus(key: string, window: number): Promise<RateLimitResult> {
    const redisKey = this.getRedisKey(key, window);
    const current = await this.redis.get(redisKey);
    const count = current ? parseInt(current, 10) : 0;
    
    const resetTime = (window + 1) * this.config.windowMs;
    const remaining = Math.max(0, this.config.maxRequests - count);
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);

    return {
      allowed: count < this.config.maxRequests,
      limit: this.config.maxRequests,
      current: count,
      remaining,
      resetTime,
      retryAfter
    };
  }

  /**
   * Get memory status without incrementing
   */
  private getMemoryStatus(key: string, window: number): RateLimitResult {
    const resetTime = (window + 1) * this.config.windowMs;
    const now = Date.now();
    
    const existing = this.memoryStore.get(key);
    
    if (!existing || existing.resetTime <= now) {
      return {
        allowed: true,
        limit: this.config.maxRequests,
        current: 0,
        remaining: this.config.maxRequests,
        resetTime,
        retryAfter: Math.ceil((resetTime - now) / 1000)
      };
    }

    const remaining = Math.max(0, this.config.maxRequests - existing.count);

    return {
      allowed: existing.count < this.config.maxRequests,
      limit: this.config.maxRequests,
      current: existing.count,
      remaining,
      resetTime: existing.resetTime,
      retryAfter: Math.ceil((existing.resetTime - now) / 1000)
    };
  }

  /**
   * Generate rate limit key
   */
  private generateKey(req: NextRequest): string {
    return this.config.keyGenerator(req);
  }

  /**
   * Generate Redis key
   */
  private getRedisKey(key: string, window: number): string {
    const prefix = this.config.prefix || 'rate_limit';
    return `${prefix}:${key}:${window}`;
  }

  /**
   * Create allowed result for fallback cases
   */
  private createAllowedResult(): RateLimitResult {
    const resetTime = Date.now() + this.config.windowMs;
    
    return {
      allowed: true,
      limit: this.config.maxRequests,
      current: 0,
      remaining: this.config.maxRequests,
      resetTime,
      retryAfter: Math.ceil(this.config.windowMs / 1000)
    };
  }

  /**
   * Sanitize key for logging (remove sensitive information)
   */
  private sanitizeKey(key: string): string {
    // Remove IP addresses and other sensitive data for logging
    return key.replace(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, '[IP]');
  }

  /**
   * Clean up expired entries from memory store
   */
  private cleanupMemoryStore(): void {
    const now = Date.now();
    
    for (const [key, value] of this.memoryStore.entries()) {
      if (value.resetTime <= now) {
        this.memoryStore.delete(key);
      }
    }
  }
}

/**
 * Multi-tier rate limiter for different limits on the same resource
 */
export class MultiTierRateLimiter {
  private limiters: Map<string, RateLimiter> = new Map();

  constructor(private tiers: TierConfig[], private keyGenerator: (req: NextRequest) => string) {
    // Sort tiers by priority (higher priority checked first)
    this.tiers.sort((a, b) => b.priority - a.priority);

    // Create rate limiters for each tier
    this.tiers.forEach(tier => {
      const limiter = new RateLimiter({
        windowMs: tier.windowMs,
        maxRequests: tier.maxRequests,
        keyGenerator: this.keyGenerator,
        prefix: `tier_${tier.name}`
      });
      
      this.limiters.set(tier.name, limiter);
    });
  }

  /**
   * Check all tiers and return the most restrictive result
   */
  async checkLimits(req: NextRequest): Promise<RateLimitResult & { tier: string }> {
    const results: Array<RateLimitResult & { tier: string }> = [];

    for (const tier of this.tiers) {
      const limiter = this.limiters.get(tier.name)!;
      const result = await limiter.checkLimit(req);
      
      results.push({
        ...result,
        tier: tier.name
      });

      // If any tier is exceeded, return immediately
      if (!result.allowed) {
        return {
          ...result,
          tier: tier.name
        };
      }
    }

    // Return the most restrictive allowed result
    const mostRestrictive = results.reduce((prev, current) => 
      current.remaining < prev.remaining ? current : prev
    );

    return mostRestrictive;
  }

  /**
   * Get status for all tiers
   */
  async getAllStatuses(req: NextRequest): Promise<Array<RateLimitResult & { tier: string }>> {
    const statuses: Array<RateLimitResult & { tier: string }> = [];

    for (const tier of this.tiers) {
      const limiter = this.limiters.get(tier.name)!;
      const status = await limiter.getStatus(req);
      
      statuses.push({
        ...status,
        tier: tier.name
      });
    }

    return statuses;
  }
}

/**
 * Common key generators
 */
export const KeyGenerators = {
  /**
   * Rate limit by IP address
   */
  byIP: (req: NextRequest): string => {
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : req.ip || 'unknown';
    return `ip:${ip}`;
  },

  /**
   * Rate limit by user ID (requires authentication)
   */
  byUser: (req: NextRequest): string => {
    const user = (req as any).user;
    return user ? `user:${user.id}` : 'anonymous';
  },

  /**
   * Rate limit by API key
   */
  byAPIKey: (req: NextRequest): string => {
    const apiKey = req.headers.get('x-api-key');
    if (apiKey) {
      // Use hash of API key for privacy
      const crypto = require('crypto');
      const hash = crypto.createHash('sha256').update(apiKey).digest('hex').substring(0, 16);
      return `api_key:${hash}`;
    }
    return 'no_api_key';
  },

  /**
   * Rate limit by combination of IP and user
   */
  byIPAndUser: (req: NextRequest): string => {
    const ip = KeyGenerators.byIP(req);
    const user = KeyGenerators.byUser(req);
    return `${ip}:${user}`;
  },

  /**
   * Rate limit by endpoint
   */
  byEndpoint: (req: NextRequest): string => {
    const url = new URL(req.url);
    const endpoint = url.pathname.replace(/\/\d+/g, '/:id'); // Replace IDs with placeholder
    return `endpoint:${endpoint}`;
  },

  /**
   * Rate limit by IP and endpoint combination
   */
  byIPAndEndpoint: (req: NextRequest): string => {
    const ip = KeyGenerators.byIP(req);
    const endpoint = KeyGenerators.byEndpoint(req);
    return `${ip}:${endpoint}`;
  }
};

/**
 * Predefined rate limit configurations
 */
export const RateLimitConfigs = {
  /**
   * Strict rate limiting for authentication endpoints
   */
  authEndpoints: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    keyGenerator: KeyGenerators.byIP
  },

  /**
   * General API rate limiting
   */
  generalAPI: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    keyGenerator: KeyGenerators.byIPAndUser
  },

  /**
   * LLM endpoint rate limiting (more restrictive)
   */
  llmEndpoints: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
    keyGenerator: KeyGenerators.byUser
  },

  /**
   * File upload rate limiting
   */
  fileUpload: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    keyGenerator: KeyGenerators.byUser
  },

  /**
   * Webhook endpoints
   */
  webhooks: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 1000,
    keyGenerator: KeyGenerators.byIP
  }
};
