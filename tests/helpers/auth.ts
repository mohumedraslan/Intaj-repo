/**
 * Test Authentication Helper Functions
 * Provides utilities for generating test authentication tokens
 */

import jwt from 'jsonwebtoken';
import { createTestAPIKey } from './database';

export interface TestUser {
  id: string;
  email: string;
  role: string;
  permissions?: string[];
}

/**
 * Generate a test JWT token for authentication
 */
export async function generateTestJWT(user: TestUser, options?: {
  expiresIn?: string;
  issuer?: string;
}): Promise<string> {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    permissions: user.permissions || [],
    iat: Math.floor(Date.now() / 1000),
    iss: options?.issuer || 'intaj-test'
  };

  const secret = process.env.NEXTAUTH_SECRET || 'test-secret-key';
  
  return jwt.sign(payload, secret, {
    expiresIn: options?.expiresIn || '1h',
    algorithm: 'HS256'
  });
}

/**
 * Generate a test API key for API authentication
 */
export async function generateTestAPIKey(
  userId: string,
  options?: {
    name?: string;
    permissions?: string[];
    expiresAt?: Date;
  }
): Promise<string> {
  const apiKeyData = await createTestAPIKey(userId, options);
  return apiKeyData.apiKey;
}

/**
 * Decode and verify a JWT token (for testing)
 */
export function verifyTestJWT(token: string): any {
  const secret = process.env.NEXTAUTH_SECRET || 'test-secret-key';
  
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    throw new Error(`Invalid JWT token: ${error.message}`);
  }
}

/**
 * Generate an expired JWT token for testing
 */
export async function generateExpiredJWT(user: TestUser): Promise<string> {
  return generateTestJWT(user, { expiresIn: '-1h' }); // Expired 1 hour ago
}

/**
 * Generate a malformed JWT token for testing
 */
export function generateMalformedJWT(): string {
  return 'invalid.jwt.token';
}

/**
 * Generate test authentication headers
 */
export function createAuthHeaders(token: string, type: 'Bearer' | 'API-Key' = 'Bearer'): Record<string, string> {
  if (type === 'Bearer') {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  } else {
    return {
      'X-API-Key': token,
      'Content-Type': 'application/json'
    };
  }
}

/**
 * Create test user with common roles
 */
export const TestUsers = {
  admin: {
    id: 'test-admin-id',
    email: 'admin@test.com',
    role: 'admin',
    permissions: [
      'agent:create', 'agent:read', 'agent:update', 'agent:delete',
      'user:manage', 'system:config'
    ]
  },
  
  user: {
    id: 'test-user-id',
    email: 'user@test.com',
    role: 'user',
    permissions: [
      'agent:create', 'agent:read', 'agent:update', 'agent:delete'
    ]
  },
  
  readonly: {
    id: 'test-readonly-id',
    email: 'readonly@test.com',
    role: 'readonly',
    permissions: [
      'agent:read'
    ]
  },
  
  apiUser: {
    id: 'test-api-user-id',
    email: 'api@test.com',
    role: 'api_user',
    permissions: [
      'agent:read', 'agent:create', 'api:webhook_manage'
    ]
  }
};

/**
 * Generate tokens for all test users
 */
export async function generateAllTestTokens(): Promise<{
  admin: { jwt: string; apiKey: string };
  user: { jwt: string; apiKey: string };
  readonly: { jwt: string; apiKey: string };
  apiUser: { jwt: string; apiKey: string };
}> {
  return {
    admin: {
      jwt: await generateTestJWT(TestUsers.admin),
      apiKey: await generateTestAPIKey(TestUsers.admin.id, {
        name: 'Admin Test Key',
        permissions: TestUsers.admin.permissions
      })
    },
    user: {
      jwt: await generateTestJWT(TestUsers.user),
      apiKey: await generateTestAPIKey(TestUsers.user.id, {
        name: 'User Test Key',
        permissions: TestUsers.user.permissions
      })
    },
    readonly: {
      jwt: await generateTestJWT(TestUsers.readonly),
      apiKey: await generateTestAPIKey(TestUsers.readonly.id, {
        name: 'Readonly Test Key',
        permissions: TestUsers.readonly.permissions
      })
    },
    apiUser: {
      jwt: await generateTestJWT(TestUsers.apiUser),
      apiKey: await generateTestAPIKey(TestUsers.apiUser.id, {
        name: 'API User Test Key',
        permissions: TestUsers.apiUser.permissions
      })
    }
  };
}

/**
 * Mock authentication middleware for testing
 */
export function mockAuthMiddleware(user: TestUser | null) {
  return (req: any, res: any, next: any) => {
    if (user) {
      req.user = user;
      req.permissionContext = {
        userId: user.id,
        role: user.role,
        permissions: user.permissions || []
      };
    }
    next();
  };
}

/**
 * Create test session data
 */
export function createTestSession(user: TestUser) {
  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    accessToken: generateTestJWT(user),
    refreshToken: 'test-refresh-token'
  };
}

/**
 * Validate test token format
 */
export function isValidTestToken(token: string): boolean {
  try {
    if (token.startsWith('intaj_test_')) {
      // API key format
      return token.length > 20;
    } else {
      // JWT format
      const parts = token.split('.');
      return parts.length === 3;
    }
  } catch {
    return false;
  }
}

/**
 * Extract user ID from token
 */
export function extractUserIdFromToken(token: string): string | null {
  try {
    if (token.startsWith('intaj_test_')) {
      // For API keys, we'd need to look up in database
      // For testing, return a mock ID
      return 'test-user-from-api-key';
    } else {
      // JWT token
      const decoded = verifyTestJWT(token);
      return decoded.sub;
    }
  } catch {
    return null;
  }
}

/**
 * Test authentication scenarios
 */
export const AuthScenarios = {
  validJWT: async () => ({
    token: await generateTestJWT(TestUsers.user),
    user: TestUsers.user,
    expectedStatus: 200
  }),
  
  validAPIKey: async () => ({
    token: await generateTestAPIKey(TestUsers.user.id),
    user: TestUsers.user,
    expectedStatus: 200
  }),
  
  expiredJWT: async () => ({
    token: await generateExpiredJWT(TestUsers.user),
    user: null,
    expectedStatus: 401
  }),
  
  malformedJWT: () => ({
    token: generateMalformedJWT(),
    user: null,
    expectedStatus: 401
  }),
  
  noToken: () => ({
    token: null,
    user: null,
    expectedStatus: 401
  }),
  
  insufficientPermissions: async () => ({
    token: await generateTestJWT(TestUsers.readonly),
    user: TestUsers.readonly,
    expectedStatus: 403
  })
};

/**
 * Helper to test different authentication scenarios
 */
export async function testAuthScenario(
  scenario: keyof typeof AuthScenarios,
  requestFn: (token: string | null, headers: Record<string, string>) => Promise<any>
) {
  const scenarioData = await AuthScenarios[scenario]();
  
  const headers = scenarioData.token 
    ? createAuthHeaders(scenarioData.token)
    : {};
  
  const response = await requestFn(scenarioData.token, headers);
  
  return {
    response,
    expectedStatus: scenarioData.expectedStatus,
    user: scenarioData.user
  };
}
