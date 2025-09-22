/**
 * Authentication middleware for API endpoints
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AuthenticationError, AuthorizationError, ErrorFactory } from '@/lib/errors';
import { Database } from '@/types/supabase';

// User interface from authentication
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'user' | 'admin' | 'super_admin';
  subscription_tier: 'free' | 'pro' | 'enterprise';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// API key interface
export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_hash: string;
  permissions: string[];
  is_active: boolean;
  expires_at?: string;
  last_used_at?: string;
  created_at: string;
}

// Service account interface for internal services
export interface ServiceAccount {
  id: string;
  name: string;
  permissions: string[];
  is_active: boolean;
}

/**
 * Authentication service class
 */
export class AuthService {
  private supabase;

  constructor() {
    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Authenticate user via JWT token
   */
  async authenticateJWT(token: string, correlationId?: string): Promise<AuthenticatedUser> {
    try {
      // Verify JWT token with Supabase
      const { data: { user }, error } = await this.supabase.auth.getUser(token);

      if (error || !user) {
        throw ErrorFactory.unauthorized('Invalid or expired token', correlationId);
      }

      // Get user profile with role and subscription info
      const { data: profile, error: profileError } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        throw ErrorFactory.unauthorized('User profile not found', correlationId);
      }

      if (!profile.is_active) {
        throw ErrorFactory.unauthorized('User account is deactivated', correlationId);
      }

      return {
        id: profile.id,
        email: user.email!,
        role: profile.role || 'user',
        subscription_tier: profile.subscription_tier || 'free',
        is_active: profile.is_active,
        created_at: profile.created_at,
        updated_at: profile.updated_at
      };

    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw ErrorFactory.unauthorized('Authentication failed', correlationId);
    }
  }

  /**
   * Authenticate via API key
   */
  async authenticateApiKey(apiKey: string, correlationId?: string): Promise<AuthenticatedUser> {
    try {
      // Hash the provided API key for comparison
      const keyHash = await this.hashApiKey(apiKey);

      // Find API key in database
      const { data: apiKeyRecord, error } = await this.supabase
        .from('api_keys')
        .select(`
          *,
          profiles (*)
        `)
        .eq('key_hash', keyHash)
        .eq('is_active', true)
        .single();

      if (error || !apiKeyRecord) {
        throw ErrorFactory.unauthorized('Invalid API key', correlationId);
      }

      // Check if API key is expired
      if (apiKeyRecord.expires_at && new Date(apiKeyRecord.expires_at) < new Date()) {
        throw ErrorFactory.unauthorized('API key has expired', correlationId);
      }

      const profile = apiKeyRecord.profiles;
      if (!profile || !profile.is_active) {
        throw ErrorFactory.unauthorized('Associated user account is inactive', correlationId);
      }

      // Update last used timestamp
      await this.supabase
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', apiKeyRecord.id);

      return {
        id: profile.id,
        email: profile.email,
        role: profile.role || 'user',
        subscription_tier: profile.subscription_tier || 'free',
        is_active: profile.is_active,
        created_at: profile.created_at,
        updated_at: profile.updated_at
      };

    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw ErrorFactory.unauthorized('API key authentication failed', correlationId);
    }
  }

  /**
   * Authenticate service-to-service requests
   */
  async authenticateService(serviceToken: string, correlationId?: string): Promise<ServiceAccount> {
    try {
      // Verify service token (could be JWT or shared secret)
      const serviceId = await this.verifyServiceToken(serviceToken);

      // Get service account details
      const { data: serviceAccount, error } = await this.supabase
        .from('service_accounts')
        .select('*')
        .eq('id', serviceId)
        .eq('is_active', true)
        .single();

      if (error || !serviceAccount) {
        throw ErrorFactory.unauthorized('Invalid service token', correlationId);
      }

      return serviceAccount;

    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw ErrorFactory.unauthorized('Service authentication failed', correlationId);
    }
  }

  /**
   * Check if user has required permission
   */
  async checkPermission(
    user: AuthenticatedUser,
    permission: string,
    correlationId?: string
  ): Promise<void> {
    // Admin and super_admin have all permissions
    if (user.role === 'admin' || user.role === 'super_admin') {
      return;
    }

    // Check user-specific permissions
    const { data: userPermissions, error } = await this.supabase
      .from('user_permissions')
      .select('permission')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (error) {
      throw ErrorFactory.internal('Failed to check permissions', correlationId);
    }

    const hasPermission = userPermissions?.some(p => p.permission === permission);
    
    if (!hasPermission) {
      throw ErrorFactory.forbidden(`Missing required permission: ${permission}`, correlationId);
    }
  }

  /**
   * Check if user has required role
   */
  checkRole(user: AuthenticatedUser, requiredRole: string, correlationId?: string): void {
    const roleHierarchy = {
      'user': 0,
      'admin': 1,
      'super_admin': 2
    };

    const userLevel = roleHierarchy[user.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

    if (userLevel < requiredLevel) {
      throw ErrorFactory.forbidden(`Insufficient role. Required: ${requiredRole}`, correlationId);
    }
  }

  /**
   * Check subscription tier access
   */
  checkSubscriptionAccess(
    user: AuthenticatedUser,
    requiredTier: string,
    correlationId?: string
  ): void {
    const tierHierarchy = {
      'free': 0,
      'pro': 1,
      'enterprise': 2
    };

    const userLevel = tierHierarchy[user.subscription_tier] || 0;
    const requiredLevel = tierHierarchy[requiredTier as keyof typeof tierHierarchy] || 0;

    if (userLevel < requiredLevel) {
      throw ErrorFactory.forbidden(`Upgrade required. Required tier: ${requiredTier}`, correlationId);
    }
  }

  /**
   * Hash API key for storage
   */
  private async hashApiKey(apiKey: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Verify service token and return service ID
   */
  private async verifyServiceToken(token: string): Promise<string> {
    // This could be JWT verification or shared secret validation
    // For now, using simple shared secret approach
    const validServices = {
      [process.env.TELEGRAM_SERVICE_TOKEN || '']: 'telegram-service',
      [process.env.WHATSAPP_SERVICE_TOKEN || '']: 'whatsapp-service',
      [process.env.DISCORD_SERVICE_TOKEN || '']: 'discord-service',
      [process.env.INTERNAL_SERVICE_TOKEN || '']: 'internal-service'
    };

    const serviceId = validServices[token];
    if (!serviceId) {
      throw new Error('Invalid service token');
    }

    return serviceId;
  }
}

// Singleton instance
let authServiceInstance: AuthService | null = null;

/**
 * Get or create auth service singleton
 */
export function getAuthService(): AuthService {
  if (!authServiceInstance) {
    authServiceInstance = new AuthService();
  }
  return authServiceInstance;
}

/**
 * Extract authentication token from request
 */
export function extractAuthToken(request: NextRequest): string | null {
  // Check Authorization header (Bearer token)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check X-API-Key header
  const apiKeyHeader = request.headers.get('x-api-key');
  if (apiKeyHeader) {
    return apiKeyHeader;
  }

  // Check query parameter (for webhooks)
  const url = new URL(request.url);
  const tokenParam = url.searchParams.get('token');
  if (tokenParam) {
    return tokenParam;
  }

  return null;
}

/**
 * Determine authentication type from token
 */
export function getAuthType(token: string): 'jwt' | 'api_key' | 'service' {
  // JWT tokens typically have 3 parts separated by dots
  if (token.includes('.') && token.split('.').length === 3) {
    return 'jwt';
  }

  // Service tokens have specific prefixes
  if (token.startsWith('svc_')) {
    return 'service';
  }

  // Default to API key
  return 'api_key';
}

/**
 * Get client IP address from request
 */
export function getClientIP(request: NextRequest): string {
  // Check various headers for real IP
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // Fallback to connection remote address
  return request.ip || '127.0.0.1';
}

/**
 * Permission constants
 */
export const PERMISSIONS = {
  // Agent permissions
  AGENT_CREATE: 'agent:create',
  AGENT_READ: 'agent:read',
  AGENT_UPDATE: 'agent:update',
  AGENT_DELETE: 'agent:delete',
  AGENT_DEPLOY: 'agent:deploy',

  // Integration permissions
  INTEGRATION_CREATE: 'integration:create',
  INTEGRATION_READ: 'integration:read',
  INTEGRATION_UPDATE: 'integration:update',
  INTEGRATION_DELETE: 'integration:delete',

  // Message permissions
  MESSAGE_SEND: 'message:send',
  MESSAGE_READ: 'message:read',
  MESSAGE_DELETE: 'message:delete',

  // Analytics permissions
  ANALYTICS_READ: 'analytics:read',
  ANALYTICS_EXPORT: 'analytics:export',

  // Admin permissions
  USER_MANAGE: 'user:manage',
  SYSTEM_CONFIG: 'system:config',
  AUDIT_LOG_READ: 'audit:read'
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];
