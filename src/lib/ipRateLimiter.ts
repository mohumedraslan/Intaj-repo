import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

interface RateLimitOptions {
  limit: number;
  window: number; // in seconds
}

export class IPRateLimiter {
  private redis: Redis;
  private limiters: Map<string, Ratelimit> = new Map();
  private defaultOptions: RateLimitOptions = {
    limit: 60, // 60 requests
    window: 60, // per 60 seconds (1 minute)
  };

  constructor() {
    // Initialize Redis client with Upstash credentials
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL || '',
      token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
    });
  }

  /**
   * Get or create a rate limiter for a specific endpoint
   */
  private getLimiter(endpoint: string, options?: Partial<RateLimitOptions>): Ratelimit {
    const key = `ratelimit:${endpoint}`;
    if (!this.limiters.has(key)) {
      const limiterOptions = { ...this.defaultOptions, ...options };
      this.limiters.set(
        key,
        new Ratelimit({
          redis: this.redis,
          limiter: Ratelimit.slidingWindow(limiterOptions.limit, `${limiterOptions.window} s`),
          analytics: true,
          prefix: key,
        })
      );
    }
    return this.limiters.get(key)!;
  }

  /**
   * Check if a request from an IP address is allowed
   * @param ip The IP address to check
   * @param endpoint The API endpoint being accessed
   * @returns Object containing success status and limit information
   */
  async checkLimit(ip: string, endpoint: string, options?: Partial<RateLimitOptions>) {
    const limiter = this.getLimiter(endpoint, options);
    const identifier = `${endpoint}:${ip}`;
    const result = await limiter.limit(identifier);

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
      retryAfter: Math.floor((result.reset - Date.now()) / 1000),
    };
  }

  /**
   * Check if a request from a user is allowed based on their subscription tier
   * @param userId The user's ID
   * @param endpoint The API endpoint being accessed
   * @param tierLimit The rate limit for the user's subscription tier
   * @returns Object containing success status and limit information
   */
  async checkUserLimit(userId: string, endpoint: string, tierLimit: number) {
    const limiter = this.getLimiter(endpoint, {
      limit: tierLimit,
      window: 60, // 1 minute window
    });
    
    const identifier = `${endpoint}:user:${userId}`;
    const result = await limiter.limit(identifier);

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
      retryAfter: Math.floor((result.reset - Date.now()) / 1000),
    };
  }
}

// Export a singleton instance
export const ipRateLimiter = new IPRateLimiter();