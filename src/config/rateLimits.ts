/**
 * Rate limit configuration for different subscription tiers
 */
export const SUBSCRIPTION_RATE_LIMITS = {
  // Default limits for unauthenticated requests (IP-based)
  default: {
    apiRateLimit: 60, // 60 requests per minute
  },
  
  // Subscription tier limits (user-based)
  free: {
    apiRateLimit: 60, // 60 requests per minute
  },
  pro: {
    apiRateLimit: 300, // 300 requests per minute
  },
  business: {
    apiRateLimit: 1000, // 1000 requests per minute
  },
};

/**
 * Get rate limit for a subscription tier
 * @param tier Subscription tier name
 * @returns Rate limit configuration for the tier
 */
export function getRateLimitForTier(tier: string | undefined): number {
  if (!tier || !(tier in SUBSCRIPTION_RATE_LIMITS)) {
    return SUBSCRIPTION_RATE_LIMITS.default.apiRateLimit;
  }
  
  return SUBSCRIPTION_RATE_LIMITS[tier as keyof typeof SUBSCRIPTION_RATE_LIMITS].apiRateLimit;
}