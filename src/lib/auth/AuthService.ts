/**
 * Enhanced Authentication Service
 * Provides comprehensive authentication with JWT validation, API key management, and token refresh
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '../logging/Logger';
import { getMetricsCollector } from '../metrics/MetricsCollector';
import { captureError } from '../monitoring/errorTracking';
import { Redis } from 'ioredis';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const logger = createLogger('AuthService');
const metrics = getMetricsCollector();

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  profile?: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
    status: 'active' | 'suspended' | 'pending';
    lastLoginAt?: Date;
    createdAt: Date;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface APIKeyInfo {
  id: string;
  name: string;
  keyHash: string;
  permissions: string[];
  lastUsedAt?: Date;
  expiresAt?: Date;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
}

export class UnauthorizedError extends Error {
  constructor(message: string, public code: string = 'UNAUTHORIZED') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string, public code: string = 'FORBIDDEN') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class AuthService {
  private supabase: SupabaseClient;
  private redis: Redis;
  private jwtSecret: string;
  private tokenBlacklist = new Set<string>();

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    this.redis = new Redis(process.env.REDIS_URL!);
    this.jwtSecret = process.env.NEXTAUTH_SECRET!;
    
    // Load blacklisted tokens from Redis on startup
    this.loadTokenBlacklist();
  }

  /**
   * Validate JWT token and return authenticated user
   */
  async validateJWTToken(token: string): Promise<AuthUser> {
    const startTime = Date.now();
    
    try {
      // Check if token is blacklisted
      if (this.tokenBlacklist.has(token)) {
        throw new UnauthorizedError('Token has been revoked', 'TOKEN_REVOKED');
      }

      // Check Redis blacklist for distributed systems
      const isBlacklisted = await this.redis.get(`blacklist:${token}`);
      if (isBlacklisted) {
        this.tokenBlacklist.add(token);
        throw new UnauthorizedError('Token has been revoked', 'TOKEN_REVOKED');
      }

      // Validate token with Supabase
      const { data: { user }, error } = await this.supabase.auth.getUser(token);
      
      if (error || !user) {
        metrics.incrementCounter('auth_token_validation_failed', {
          reason: error?.message || 'user_not_found'
        });
        throw new UnauthorizedError('Invalid token', 'INVALID_TOKEN');
      }

      // Get user profile and check status
      const { data: profile, error: profileError } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        metrics.incrementCounter('auth_profile_not_found');
        throw new UnauthorizedError('User profile not found', 'PROFILE_NOT_FOUND');
      }

      if (profile.status !== 'active') {
        metrics.incrementCounter('auth_account_suspended', {
          status: profile.status
        });
        throw new ForbiddenError('Account suspended', 'ACCOUNT_SUSPENDED');
      }

      // Get user permissions
      const permissions = await this.getUserPermissions(user.id);

      // Update last login time
      await this.updateLastLogin(user.id);

      metrics.incrementCounter('auth_token_validation_success');
      metrics.recordHistogram('auth_token_validation_duration', Date.now() - startTime);

      const authUser: AuthUser = {
        id: user.id,
        email: user.email!,
        role: profile.role || 'user',
        permissions,
        profile: {
          firstName: profile.first_name,
          lastName: profile.last_name,
          avatar: profile.avatar_url,
          status: profile.status,
          lastLoginAt: profile.last_login_at ? new Date(profile.last_login_at) : undefined,
          createdAt: new Date(profile.created_at)
        }
      };

      logger.info('JWT token validated successfully', {
        userId: user.id,
        email: user.email,
        role: profile.role
      });

      return authUser;

    } catch (error) {
      metrics.recordHistogram('auth_token_validation_duration', Date.now() - startTime);
      
      if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
        throw error;
      }

      logger.error('Token validation failed', { error });
      captureError(error as Error, {
        context: 'token_validation',
        token: token.substring(0, 20) + '...' // Log partial token for debugging
      });

      throw new UnauthorizedError('Token validation failed', 'VALIDATION_ERROR');
    }
  }

  /**
   * Validate API key and return authenticated user
   */
  async validateAPIKey(apiKey: string): Promise<AuthUser> {
    const startTime = Date.now();
    
    try {
      // Hash the provided API key
      const keyHash = this.hashAPIKey(apiKey);

      // Look up API key in database
      const { data: apiKeyData, error } = await this.supabase
        .from('api_keys')
        .select(`
          *,
          profiles!inner(*)
        `)
        .eq('key_hash', keyHash)
        .eq('is_active', true)
        .single();

      if (error || !apiKeyData) {
        metrics.incrementCounter('auth_api_key_validation_failed', {
          reason: 'key_not_found'
        });
        throw new UnauthorizedError('Invalid API key', 'INVALID_API_KEY');
      }

      // Check if API key has expired
      if (apiKeyData.expires_at && new Date(apiKeyData.expires_at) < new Date()) {
        metrics.incrementCounter('auth_api_key_validation_failed', {
          reason: 'key_expired'
        });
        throw new UnauthorizedError('API key has expired', 'API_KEY_EXPIRED');
      }

      // Check rate limiting for this API key
      const rateLimitResult = await this.checkAPIKeyRateLimit(apiKeyData.id, apiKeyData.rate_limit);
      if (!rateLimitResult.allowed) {
        metrics.incrementCounter('auth_api_key_rate_limited');
        throw new ForbiddenError('API key rate limit exceeded', 'RATE_LIMIT_EXCEEDED');
      }

      // Update last used timestamp
      await this.supabase
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', apiKeyData.id);

      metrics.incrementCounter('auth_api_key_validation_success');
      metrics.recordHistogram('auth_api_key_validation_duration', Date.now() - startTime);

      const authUser: AuthUser = {
        id: apiKeyData.profiles.id,
        email: apiKeyData.profiles.email,
        role: apiKeyData.profiles.role || 'user',
        permissions: apiKeyData.permissions || [],
        profile: {
          firstName: apiKeyData.profiles.first_name,
          lastName: apiKeyData.profiles.last_name,
          avatar: apiKeyData.profiles.avatar_url,
          status: apiKeyData.profiles.status,
          lastLoginAt: apiKeyData.profiles.last_login_at ? new Date(apiKeyData.profiles.last_login_at) : undefined,
          createdAt: new Date(apiKeyData.profiles.created_at)
        }
      };

      logger.info('API key validated successfully', {
        userId: authUser.id,
        apiKeyId: apiKeyData.id,
        apiKeyName: apiKeyData.name
      });

      return authUser;

    } catch (error) {
      metrics.recordHistogram('auth_api_key_validation_duration', Date.now() - startTime);
      
      if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
        throw error;
      }

      logger.error('API key validation failed', { error });
      captureError(error as Error, {
        context: 'api_key_validation'
      });

      throw new UnauthorizedError('API key validation failed', 'VALIDATION_ERROR');
    }
  }

  /**
   * Refresh JWT token
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const startTime = Date.now();
    
    try {
      const { data, error } = await this.supabase.auth.refreshSession({
        refresh_token: refreshToken
      });

      if (error || !data.session) {
        metrics.incrementCounter('auth_token_refresh_failed');
        throw new UnauthorizedError('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
      }

      // Blacklist the old access token
      if (data.session.access_token) {
        await this.blacklistToken(data.session.access_token);
      }

      metrics.incrementCounter('auth_token_refresh_success');
      metrics.recordHistogram('auth_token_refresh_duration', Date.now() - startTime);

      logger.info('Token refreshed successfully', {
        userId: data.user?.id
      });

      return {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresIn: data.session.expires_in || 3600,
        tokenType: 'Bearer'
      };

    } catch (error) {
      metrics.recordHistogram('auth_token_refresh_duration', Date.now() - startTime);
      
      if (error instanceof UnauthorizedError) {
        throw error;
      }

      logger.error('Token refresh failed', { error });
      captureError(error as Error, {
        context: 'token_refresh'
      });

      throw new UnauthorizedError('Token refresh failed', 'REFRESH_ERROR');
    }
  }

  /**
   * Create new API key for user
   */
  async createAPIKey(
    userId: string,
    name: string,
    permissions: string[],
    expiresAt?: Date,
    rateLimit?: { requestsPerMinute: number; requestsPerHour: number }
  ): Promise<{ apiKey: string; keyInfo: APIKeyInfo }> {
    try {
      // Generate secure API key
      const apiKey = this.generateAPIKey();
      const keyHash = this.hashAPIKey(apiKey);

      const keyData = {
        user_id: userId,
        name,
        key_hash: keyHash,
        permissions,
        expires_at: expiresAt?.toISOString(),
        rate_limit: rateLimit || { requestsPerMinute: 60, requestsPerHour: 1000 },
        is_active: true,
        created_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('api_keys')
        .insert(keyData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create API key: ${error.message}`);
      }

      metrics.incrementCounter('auth_api_key_created');

      logger.info('API key created', {
        userId,
        apiKeyId: data.id,
        name,
        permissions
      });

      return {
        apiKey,
        keyInfo: {
          id: data.id,
          name: data.name,
          keyHash: data.key_hash,
          permissions: data.permissions,
          expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
          rateLimit: data.rate_limit
        }
      };

    } catch (error) {
      logger.error('Failed to create API key', { error, userId, name });
      captureError(error as Error, {
        context: 'api_key_creation',
        userId,
        name
      });
      throw error;
    }
  }

  /**
   * Revoke API key
   */
  async revokeAPIKey(apiKeyId: string, userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('api_keys')
        .update({ is_active: false, revoked_at: new Date().toISOString() })
        .eq('id', apiKeyId)
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to revoke API key: ${error.message}`);
      }

      metrics.incrementCounter('auth_api_key_revoked');

      logger.info('API key revoked', {
        userId,
        apiKeyId
      });

    } catch (error) {
      logger.error('Failed to revoke API key', { error, userId, apiKeyId });
      captureError(error as Error, {
        context: 'api_key_revocation',
        userId,
        apiKeyId
      });
      throw error;
    }
  }

  /**
   * Blacklist a token
   */
  async blacklistToken(token: string): Promise<void> {
    try {
      // Add to local blacklist
      this.tokenBlacklist.add(token);

      // Add to Redis blacklist with expiration
      await this.redis.setex(`blacklist:${token}`, 86400, '1'); // 24 hours

      logger.debug('Token blacklisted', {
        tokenPrefix: token.substring(0, 20)
      });

    } catch (error) {
      logger.error('Failed to blacklist token', { error });
    }
  }

  /**
   * Get user permissions based on role and custom permissions
   */
  private async getUserPermissions(userId: string): Promise<string[]> {
    try {
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('role, custom_permissions')
        .eq('id', userId)
        .single();

      if (!profile) {
        return [];
      }

      // Import permissions dynamically to avoid circular dependency
      const { RolePermissions } = await import('./permissions');
      
      const rolePermissions = RolePermissions[profile.role] || [];
      const customPermissions = profile.custom_permissions || [];

      return [...new Set([...rolePermissions, ...customPermissions])];

    } catch (error) {
      logger.error('Failed to get user permissions', { error, userId });
      return [];
    }
  }

  /**
   * Update user's last login timestamp
   */
  private async updateLastLogin(userId: string): Promise<void> {
    try {
      await this.supabase
        .from('profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', userId);
    } catch (error) {
      logger.debug('Failed to update last login', { error, userId });
    }
  }

  /**
   * Check API key rate limit
   */
  private async checkAPIKeyRateLimit(
    apiKeyId: string,
    rateLimit: { requestsPerMinute: number; requestsPerHour: number }
  ): Promise<{ allowed: boolean; resetTime?: number }> {
    try {
      const now = Date.now();
      const minuteWindow = Math.floor(now / 60000);
      const hourWindow = Math.floor(now / 3600000);

      const minuteKey = `api_rate_limit:${apiKeyId}:${minuteWindow}`;
      const hourKey = `api_rate_limit:${apiKeyId}:${hourWindow}`;

      const [minuteCount, hourCount] = await Promise.all([
        this.redis.incr(minuteKey),
        this.redis.incr(hourKey)
      ]);

      // Set expiration for new keys
      if (minuteCount === 1) {
        await this.redis.expire(minuteKey, 60);
      }
      if (hourCount === 1) {
        await this.redis.expire(hourKey, 3600);
      }

      const minuteAllowed = minuteCount <= rateLimit.requestsPerMinute;
      const hourAllowed = hourCount <= rateLimit.requestsPerHour;

      return {
        allowed: minuteAllowed && hourAllowed,
        resetTime: minuteAllowed ? undefined : (minuteWindow + 1) * 60000
      };

    } catch (error) {
      logger.error('Rate limit check failed', { error, apiKeyId });
      // Allow request if rate limit check fails
      return { allowed: true };
    }
  }

  /**
   * Generate secure API key
   */
  private generateAPIKey(): string {
    const prefix = 'intaj_';
    const randomBytes = crypto.randomBytes(32).toString('hex');
    return `${prefix}${randomBytes}`;
  }

  /**
   * Hash API key for secure storage
   */
  private hashAPIKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  /**
   * Load token blacklist from Redis
   */
  private async loadTokenBlacklist(): Promise<void> {
    try {
      const keys = await this.redis.keys('blacklist:*');
      for (const key of keys) {
        const token = key.replace('blacklist:', '');
        this.tokenBlacklist.add(token);
      }
      
      logger.debug('Token blacklist loaded', { count: keys.length });
    } catch (error) {
      logger.error('Failed to load token blacklist', { error });
    }
  }
}

// Singleton instance
let authServiceInstance: AuthService;

export function getAuthService(): AuthService {
  if (!authServiceInstance) {
    authServiceInstance = new AuthService();
  }
  return authServiceInstance;
}
