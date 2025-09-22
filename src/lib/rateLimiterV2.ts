/**
 * Advanced rate limiting system with Redis-based sliding window
 */

import { Redis } from 'ioredis';
import { RateLimitError } from './errors';

// Rate limit configuration interface
export interface RateLimitConfig {
  windowMs: number;           // Time window in milliseconds
  maxRequests: number;        // Maximum requests per window
  keyGenerator: (identifier: string) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
}

// Rate limit result interface
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalHits: number;
}

// Predefined rate limit configurations
export const RATE_LIMIT_CONFIGS = {
  // API endpoints
  API_DEFAULT: {
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 60,          // 60 requests per minute
    keyGenerator: (userId: string) => `api:${userId}`
  },
  
  API_STRICT: {
    windowMs: 60 * 1000,      // 1 minute  
    maxRequests: 30,          // 30 requests per minute
    keyGenerator: (userId: string) => `api:strict:${userId}`
  },
  
  // Authentication endpoints
  AUTH_LOGIN: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,           // 5 login attempts per 15 minutes
    keyGenerator: (ip: string) => `auth:login:${ip}`
  },
  
  AUTH_REGISTER: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,           // 3 registrations per hour per IP
    keyGenerator: (ip: string) => `auth:register:${ip}`
  },
  
  // Password reset
  PASSWORD_RESET: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,           // 3 password reset requests per hour
    keyGenerator: (email: string) => `auth:reset:${email}`
  },
  
  // Webhook endpoints
  WEBHOOK: {
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 1000,        // 1000 webhooks per minute
    keyGenerator: (platform: string) => `webhook:${platform}`
  },
  
  // Message processing
  MESSAGE_SEND: {
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 100,         // 100 messages per minute per user
    keyGenerator: (userId: string) => `message:send:${userId}`
  },
  
  // File uploads
  FILE_UPLOAD: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50,          // 50 file uploads per hour
    keyGenerator: (userId: string) => `upload:${userId}`
  },
  
  // Agent operations
  AGENT_CREATE: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,          // 10 agent creations per hour
    keyGenerator: (userId: string) => `agent:create:${userId}`
  },
  
  // Integration setup
  INTEGRATION_SETUP: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20,          // 20 integration setups per hour
    keyGenerator: (userId: string) => `integration:setup:${userId}`
  }
};

/**
 * Redis-based sliding window rate limiter
 */
export class RateLimiter {
  private redis: Redis;
  private defaultConfig: RateLimitConfig;

  constructor(redisUrl?: string, defaultConfig?: Partial<RateLimitConfig>) {
    // Initialize Redis connection
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379', {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    // Set default configuration
    this.defaultConfig = {
      windowMs: 60 * 1000,      // 1 minute default
      maxRequests: 100,         // 100 requests default
      keyGenerator: (id: string) => `rate_limit:${id}`,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...defaultConfig
    };
  }

  /**
   * Check rate limit using sliding window algorithm
   */
  async checkRateLimit(
    identifier: string,
    config?: Partial<RateLimitConfig>
  ): Promise<RateLimitResult> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const key = finalConfig.keyGenerator(identifier);
    const now = Date.now();
    const windowStart = now - finalConfig.windowMs;

    try {
      // Use Redis pipeline for atomic operations
      const pipeline = this.redis.pipeline();
      
      // Remove expired entries
      pipeline.zremrangebyscore(key, 0, windowStart);
      
      // Count current requests in window
      pipeline.zcard(key);
      
      // Add current request
      pipeline.zadd(key, now, `${now}-${Math.random()}`);
      
      // Set expiration
      pipeline.expire(key, Math.ceil(finalConfig.windowMs / 1000));
      
      const results = await pipeline.exec();
      
      if (!results) {
        throw new Error('Redis pipeline execution failed');
      }

      const currentCount = (results[1][1] as number) + 1; // +1 for current request
      const remaining = Math.max(0, finalConfig.maxRequests - currentCount);
      const resetTime = now + finalConfig.windowMs;

      const result: RateLimitResult = {
        allowed: currentCount <= finalConfig.maxRequests,
        remaining,
        resetTime,
        totalHits: currentCount
      };

      // If rate limit exceeded, remove the request we just added
      if (!result.allowed) {
        await this.redis.zrem(key, `${now}-${Math.random()}`);
      }

      return result;

    } catch (error) {
      console.error('Rate limiter error:', error);
      
      // Fail open - allow request if Redis is down
      return {
        allowed: true,
        remaining: finalConfig.maxRequests,
        resetTime: now + finalConfig.windowMs,
        totalHits: 0
      };
    }
  }

  /**
   * Check rate limit and throw error if exceeded
   */
  async enforceRateLimit(
    identifier: string,
    config?: Partial<RateLimitConfig>,
    correlationId?: string
  ): Promise<void> {
    const result = await this.checkRateLimit(identifier, config);
    
    if (!result.allowed) {
      const finalConfig = { ...this.defaultConfig, ...config };
      const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
      
      throw new RateLimitError(
        finalConfig.maxRequests,
        finalConfig.windowMs,
        retryAfter,
        correlationId
      );
    }
  }

  /**
   * Get current rate limit status without incrementing
   */
  async getRateLimitStatus(
    identifier: string,
    config?: Partial<RateLimitConfig>
  ): Promise<RateLimitResult> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const key = finalConfig.keyGenerator(identifier);
    const now = Date.now();
    const windowStart = now - finalConfig.windowMs;

    try {
      // Clean up expired entries and get count
      await this.redis.zremrangebyscore(key, 0, windowStart);
      const currentCount = await this.redis.zcard(key);
      
      const remaining = Math.max(0, finalConfig.maxRequests - currentCount);
      const resetTime = now + finalConfig.windowMs;

      return {
        allowed: currentCount < finalConfig.maxRequests,
        remaining,
        resetTime,
        totalHits: currentCount
      };

    } catch (error) {
      console.error('Rate limiter status check error:', error);
      
      return {
        allowed: true,
        remaining: finalConfig.maxRequests,
        resetTime: now + finalConfig.windowMs,
        totalHits: 0
      };
    }
  }

  /**
   * Reset rate limit for a specific identifier
   */
  async resetRateLimit(
    identifier: string,
    config?: Partial<RateLimitConfig>
  ): Promise<void> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const key = finalConfig.keyGenerator(identifier);
    
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('Rate limiter reset error:', error);
    }
  }

  /**
   * Get rate limit headers for HTTP responses
   */
  getRateLimitHeaders(result: RateLimitResult, config: RateLimitConfig): Record<string, string> {
    return {
      'X-RateLimit-Limit': config.maxRequests.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
      'X-RateLimit-Window': Math.ceil(config.windowMs / 1000).toString()
    };
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}

// Singleton instance
let rateLimiterInstance: RateLimiter | null = null;

/**
 * Get or create rate limiter singleton
 */
export function getRateLimiter(): RateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiter();
  }
  return rateLimiterInstance;
}

/**
 * Convenience functions for common rate limiting scenarios
 */
export const RateLimiters = {
  // API rate limiting
  api: (userId: string, correlationId?: string) =>
    getRateLimiter().enforceRateLimit(userId, RATE_LIMIT_CONFIGS.API_DEFAULT, correlationId),

  apiStrict: (userId: string, correlationId?: string) =>
    getRateLimiter().enforceRateLimit(userId, RATE_LIMIT_CONFIGS.API_STRICT, correlationId),

  // Authentication rate limiting
  login: (ip: string, correlationId?: string) =>
    getRateLimiter().enforceRateLimit(ip, RATE_LIMIT_CONFIGS.AUTH_LOGIN, correlationId),

  register: (ip: string, correlationId?: string) =>
    getRateLimiter().enforceRateLimit(ip, RATE_LIMIT_CONFIGS.AUTH_REGISTER, correlationId),

  passwordReset: (email: string, correlationId?: string) =>
    getRateLimiter().enforceRateLimit(email, RATE_LIMIT_CONFIGS.PASSWORD_RESET, correlationId),

  // Webhook rate limiting
  webhook: (platform: string, correlationId?: string) =>
    getRateLimiter().enforceRateLimit(platform, RATE_LIMIT_CONFIGS.WEBHOOK, correlationId),

  // Message rate limiting
  messageSend: (userId: string, correlationId?: string) =>
    getRateLimiter().enforceRateLimit(userId, RATE_LIMIT_CONFIGS.MESSAGE_SEND, correlationId),

  // File upload rate limiting
  fileUpload: (userId: string, correlationId?: string) =>
    getRateLimiter().enforceRateLimit(userId, RATE_LIMIT_CONFIGS.FILE_UPLOAD, correlationId),

  // Agent operations rate limiting
  agentCreate: (userId: string, correlationId?: string) =>
    getRateLimiter().enforceRateLimit(userId, RATE_LIMIT_CONFIGS.AGENT_CREATE, correlationId),

  // Integration setup rate limiting
  integrationSetup: (userId: string, correlationId?: string) =>
    getRateLimiter().enforceRateLimit(userId, RATE_LIMIT_CONFIGS.INTEGRATION_SETUP, correlationId)
};

// Export types
export type { RateLimitConfig, RateLimitResult };
