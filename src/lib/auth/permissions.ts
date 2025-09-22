/**
 * Role-Based Access Control (RBAC) System
 * Defines permissions and role mappings for the Intaj platform
 */

export enum Permission {
  // Agent management
  AGENT_CREATE = 'agent:create',
  AGENT_READ = 'agent:read',
  AGENT_UPDATE = 'agent:update',
  AGENT_DELETE = 'agent:delete',
  AGENT_DEPLOY = 'agent:deploy',
  AGENT_ANALYTICS = 'agent:analytics',

  // Integration management
  INTEGRATION_SETUP = 'integration:setup',
  INTEGRATION_VIEW = 'integration:view',
  INTEGRATION_UPDATE = 'integration:update',
  INTEGRATION_DELETE = 'integration:delete',
  INTEGRATION_WEBHOOK = 'integration:webhook',

  // Knowledge base management
  KNOWLEDGE_BASE_CREATE = 'knowledge_base:create',
  KNOWLEDGE_BASE_READ = 'knowledge_base:read',
  KNOWLEDGE_BASE_UPDATE = 'knowledge_base:update',
  KNOWLEDGE_BASE_DELETE = 'knowledge_base:delete',
  KNOWLEDGE_BASE_UPLOAD = 'knowledge_base:upload',

  // Workflow management
  WORKFLOW_CREATE = 'workflow:create',
  WORKFLOW_READ = 'workflow:read',
  WORKFLOW_UPDATE = 'workflow:update',
  WORKFLOW_DELETE = 'workflow:delete',
  WORKFLOW_EXECUTE = 'workflow:execute',

  // Analytics and reporting
  ANALYTICS_VIEW = 'analytics:view',
  ANALYTICS_EXPORT = 'analytics:export',
  ANALYTICS_ADVANCED = 'analytics:advanced',

  // Team collaboration
  TEAM_INVITE = 'team:invite',
  TEAM_MANAGE = 'team:manage',
  TEAM_VIEW = 'team:view',
  TEAM_REMOVE = 'team:remove',

  // Billing and subscription
  BILLING_VIEW = 'billing:view',
  BILLING_MANAGE = 'billing:manage',
  BILLING_EXPORT = 'billing:export',

  // API and developer tools
  API_KEY_CREATE = 'api_key:create',
  API_KEY_VIEW = 'api_key:view',
  API_KEY_DELETE = 'api_key:delete',
  API_WEBHOOK_MANAGE = 'api:webhook_manage',

  // Admin functions
  USER_MANAGE = 'user:manage',
  USER_IMPERSONATE = 'user:impersonate',
  SYSTEM_CONFIG = 'system:config',
  SYSTEM_LOGS = 'system:logs',
  SYSTEM_METRICS = 'system:metrics',
  SYSTEM_HEALTH = 'system:health',

  // Security and audit
  SECURITY_AUDIT = 'security:audit',
  SECURITY_MANAGE = 'security:manage',
  AUDIT_LOGS = 'audit:logs',

  // Content moderation
  CONTENT_MODERATE = 'content:moderate',
  CONTENT_REVIEW = 'content:review'
}

export enum Role {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  TEAM_LEAD = 'team_lead',
  USER = 'user',
  READONLY = 'readonly',
  API_USER = 'api_user',
  GUEST = 'guest'
}

/**
 * Role-based permission mappings
 */
export const RolePermissions: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: Object.values(Permission), // All permissions

  [Role.ADMIN]: [
    // Agent management
    Permission.AGENT_CREATE,
    Permission.AGENT_READ,
    Permission.AGENT_UPDATE,
    Permission.AGENT_DELETE,
    Permission.AGENT_DEPLOY,
    Permission.AGENT_ANALYTICS,

    // Integration management
    Permission.INTEGRATION_SETUP,
    Permission.INTEGRATION_VIEW,
    Permission.INTEGRATION_UPDATE,
    Permission.INTEGRATION_DELETE,
    Permission.INTEGRATION_WEBHOOK,

    // Knowledge base
    Permission.KNOWLEDGE_BASE_CREATE,
    Permission.KNOWLEDGE_BASE_READ,
    Permission.KNOWLEDGE_BASE_UPDATE,
    Permission.KNOWLEDGE_BASE_DELETE,
    Permission.KNOWLEDGE_BASE_UPLOAD,

    // Workflows
    Permission.WORKFLOW_CREATE,
    Permission.WORKFLOW_READ,
    Permission.WORKFLOW_UPDATE,
    Permission.WORKFLOW_DELETE,
    Permission.WORKFLOW_EXECUTE,

    // Analytics
    Permission.ANALYTICS_VIEW,
    Permission.ANALYTICS_EXPORT,
    Permission.ANALYTICS_ADVANCED,

    // Team management
    Permission.TEAM_INVITE,
    Permission.TEAM_MANAGE,
    Permission.TEAM_VIEW,
    Permission.TEAM_REMOVE,

    // Billing
    Permission.BILLING_VIEW,
    Permission.BILLING_MANAGE,
    Permission.BILLING_EXPORT,

    // API management
    Permission.API_KEY_CREATE,
    Permission.API_KEY_VIEW,
    Permission.API_KEY_DELETE,
    Permission.API_WEBHOOK_MANAGE,

    // System monitoring
    Permission.SYSTEM_HEALTH,
    Permission.SYSTEM_METRICS,

    // Security
    Permission.SECURITY_AUDIT,
    Permission.AUDIT_LOGS,

    // Content moderation
    Permission.CONTENT_MODERATE,
    Permission.CONTENT_REVIEW
  ],

  [Role.TEAM_LEAD]: [
    // Agent management
    Permission.AGENT_CREATE,
    Permission.AGENT_READ,
    Permission.AGENT_UPDATE,
    Permission.AGENT_DELETE,
    Permission.AGENT_DEPLOY,
    Permission.AGENT_ANALYTICS,

    // Integration management
    Permission.INTEGRATION_SETUP,
    Permission.INTEGRATION_VIEW,
    Permission.INTEGRATION_UPDATE,
    Permission.INTEGRATION_DELETE,

    // Knowledge base
    Permission.KNOWLEDGE_BASE_CREATE,
    Permission.KNOWLEDGE_BASE_READ,
    Permission.KNOWLEDGE_BASE_UPDATE,
    Permission.KNOWLEDGE_BASE_DELETE,
    Permission.KNOWLEDGE_BASE_UPLOAD,

    // Workflows
    Permission.WORKFLOW_CREATE,
    Permission.WORKFLOW_READ,
    Permission.WORKFLOW_UPDATE,
    Permission.WORKFLOW_DELETE,
    Permission.WORKFLOW_EXECUTE,

    // Analytics
    Permission.ANALYTICS_VIEW,
    Permission.ANALYTICS_EXPORT,

    // Team collaboration
    Permission.TEAM_INVITE,
    Permission.TEAM_VIEW,

    // API management
    Permission.API_KEY_CREATE,
    Permission.API_KEY_VIEW,
    Permission.API_KEY_DELETE,

    // Content review
    Permission.CONTENT_REVIEW
  ],

  [Role.USER]: [
    // Agent management
    Permission.AGENT_CREATE,
    Permission.AGENT_READ,
    Permission.AGENT_UPDATE,
    Permission.AGENT_DELETE,
    Permission.AGENT_DEPLOY,

    // Integration management
    Permission.INTEGRATION_SETUP,
    Permission.INTEGRATION_VIEW,
    Permission.INTEGRATION_UPDATE,

    // Knowledge base
    Permission.KNOWLEDGE_BASE_CREATE,
    Permission.KNOWLEDGE_BASE_READ,
    Permission.KNOWLEDGE_BASE_UPDATE,
    Permission.KNOWLEDGE_BASE_DELETE,
    Permission.KNOWLEDGE_BASE_UPLOAD,

    // Workflows
    Permission.WORKFLOW_CREATE,
    Permission.WORKFLOW_READ,
    Permission.WORKFLOW_UPDATE,
    Permission.WORKFLOW_DELETE,
    Permission.WORKFLOW_EXECUTE,

    // Analytics (basic)
    Permission.ANALYTICS_VIEW,

    // Team collaboration (view only)
    Permission.TEAM_VIEW,

    // API management (own keys only)
    Permission.API_KEY_CREATE,
    Permission.API_KEY_VIEW,
    Permission.API_KEY_DELETE
  ],

  [Role.READONLY]: [
    // Read-only access
    Permission.AGENT_READ,
    Permission.INTEGRATION_VIEW,
    Permission.KNOWLEDGE_BASE_READ,
    Permission.WORKFLOW_READ,
    Permission.ANALYTICS_VIEW,
    Permission.TEAM_VIEW,
    Permission.API_KEY_VIEW
  ],

  [Role.API_USER]: [
    // API-specific permissions
    Permission.AGENT_READ,
    Permission.AGENT_CREATE,
    Permission.AGENT_UPDATE,
    Permission.INTEGRATION_VIEW,
    Permission.INTEGRATION_WEBHOOK,
    Permission.KNOWLEDGE_BASE_READ,
    Permission.KNOWLEDGE_BASE_UPLOAD,
    Permission.WORKFLOW_EXECUTE,
    Permission.ANALYTICS_VIEW
  ],

  [Role.GUEST]: [
    // Very limited access
    Permission.AGENT_READ,
    Permission.ANALYTICS_VIEW
  ]
};

/**
 * Resource-based permissions for fine-grained access control
 */
export interface ResourcePermission {
  resource: string;
  resourceId: string;
  permissions: Permission[];
}

/**
 * Permission context for request validation
 */
export interface PermissionContext {
  userId: string;
  role: Role;
  permissions: Permission[];
  resourcePermissions?: ResourcePermission[];
  teamId?: string;
  organizationId?: string;
}

/**
 * Check if user has specific permission
 */
export function hasPermission(
  context: PermissionContext,
  permission: Permission,
  resourceId?: string
): boolean {
  // Check role-based permissions
  if (context.permissions.includes(permission)) {
    return true;
  }

  // Check resource-specific permissions
  if (resourceId && context.resourcePermissions) {
    const resourcePerm = context.resourcePermissions.find(
      rp => rp.resourceId === resourceId
    );
    return resourcePerm?.permissions.includes(permission) || false;
  }

  return false;
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(
  context: PermissionContext,
  permissions: Permission[],
  resourceId?: string
): boolean {
  return permissions.some(permission => 
    hasPermission(context, permission, resourceId)
  );
}

/**
 * Check if user has all specified permissions
 */
export function hasAllPermissions(
  context: PermissionContext,
  permissions: Permission[],
  resourceId?: string
): boolean {
  return permissions.every(permission => 
    hasPermission(context, permission, resourceId)
  );
}

/**
 * Get permissions for a specific role
 */
export function getPermissionsForRole(role: Role): Permission[] {
  return RolePermissions[role] || [];
}

/**
 * Check if role has permission
 */
export function roleHasPermission(role: Role, permission: Permission): boolean {
  const rolePermissions = getPermissionsForRole(role);
  return rolePermissions.includes(permission);
}

/**
 * Get all available permissions grouped by category
 */
export function getPermissionsByCategory(): Record<string, Permission[]> {
  const categories: Record<string, Permission[]> = {};

  Object.values(Permission).forEach(permission => {
    const category = permission.split(':')[0];
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push(permission);
  });

  return categories;
}

/**
 * Validate permission string format
 */
export function isValidPermission(permission: string): permission is Permission {
  return Object.values(Permission).includes(permission as Permission);
}

/**
 * Validate role string format
 */
export function isValidRole(role: string): role is Role {
  return Object.values(Role).includes(role as Role);
}

/**
 * Get hierarchical role level (higher number = more permissions)
 */
export function getRoleLevel(role: Role): number {
  const roleLevels: Record<Role, number> = {
    [Role.GUEST]: 0,
    [Role.READONLY]: 1,
    [Role.API_USER]: 2,
    [Role.USER]: 3,
    [Role.TEAM_LEAD]: 4,
    [Role.ADMIN]: 5,
    [Role.SUPER_ADMIN]: 6
  };

  return roleLevels[role] || 0;
}

/**
 * Check if role A can manage role B
 */
export function canManageRole(managerRole: Role, targetRole: Role): boolean {
  return getRoleLevel(managerRole) > getRoleLevel(targetRole);
}

/**
 * Get default role for new users
 */
export function getDefaultRole(): Role {
  return Role.USER;
}

/**
 * Permission groups for UI organization
 */
export const PermissionGroups = {
  'Agent Management': [
    Permission.AGENT_CREATE,
    Permission.AGENT_READ,
    Permission.AGENT_UPDATE,
    Permission.AGENT_DELETE,
    Permission.AGENT_DEPLOY,
    Permission.AGENT_ANALYTICS
  ],
  'Integrations': [
    Permission.INTEGRATION_SETUP,
    Permission.INTEGRATION_VIEW,
    Permission.INTEGRATION_UPDATE,
    Permission.INTEGRATION_DELETE,
    Permission.INTEGRATION_WEBHOOK
  ],
  'Knowledge Base': [
    Permission.KNOWLEDGE_BASE_CREATE,
    Permission.KNOWLEDGE_BASE_READ,
    Permission.KNOWLEDGE_BASE_UPDATE,
    Permission.KNOWLEDGE_BASE_DELETE,
    Permission.KNOWLEDGE_BASE_UPLOAD
  ],
  'Workflows': [
    Permission.WORKFLOW_CREATE,
    Permission.WORKFLOW_READ,
    Permission.WORKFLOW_UPDATE,
    Permission.WORKFLOW_DELETE,
    Permission.WORKFLOW_EXECUTE
  ],
  'Analytics': [
    Permission.ANALYTICS_VIEW,
    Permission.ANALYTICS_EXPORT,
    Permission.ANALYTICS_ADVANCED
  ],
  'Team Management': [
    Permission.TEAM_INVITE,
    Permission.TEAM_MANAGE,
    Permission.TEAM_VIEW,
    Permission.TEAM_REMOVE
  ],
  'Billing': [
    Permission.BILLING_VIEW,
    Permission.BILLING_MANAGE,
    Permission.BILLING_EXPORT
  ],
  'API Management': [
    Permission.API_KEY_CREATE,
    Permission.API_KEY_VIEW,
    Permission.API_KEY_DELETE,
    Permission.API_WEBHOOK_MANAGE
  ],
  'System Administration': [
    Permission.USER_MANAGE,
    Permission.USER_IMPERSONATE,
    Permission.SYSTEM_CONFIG,
    Permission.SYSTEM_LOGS,
    Permission.SYSTEM_METRICS,
    Permission.SYSTEM_HEALTH
  ],
  'Security': [
    Permission.SECURITY_AUDIT,
    Permission.SECURITY_MANAGE,
    Permission.AUDIT_LOGS
  ],
  'Content Moderation': [
    Permission.CONTENT_MODERATE,
    Permission.CONTENT_REVIEW
  ]
};
