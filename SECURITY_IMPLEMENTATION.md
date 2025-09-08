# Security Implementation Guide

## 1. Two-Factor Authentication (2FA)

### Implementation Plan

1. **Database Schema Updates**
```sql
-- Add to profiles table
ALTER TABLE profiles ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN two_factor_secret TEXT;
ALTER TABLE profiles ADD COLUMN two_factor_backup_codes TEXT[];
```

2. **Required Packages**
```bash
npm install @simplewebauthn/server @simplewebauthn/browser
# or
npm install speakeasy qrcode
```

3. **API Endpoints to Create**

```typescript
// src/app/api/auth/2fa/setup/route.ts
export async function POST(req: Request) {
  // 1. Generate secret
  // 2. Create QR code
  // 3. Store temporary secret
  // 4. Return QR code URL
}

// src/app/api/auth/2fa/verify/route.ts
export async function POST(req: Request) {
  // 1. Verify provided code
  // 2. Enable 2FA if correct
  // 3. Generate backup codes
  // 4. Update user profile
}

// src/app/api/auth/2fa/disable/route.ts
export async function POST(req: Request) {
  // 1. Verify current password
  // 2. Disable 2FA
  // 3. Clear secrets and backup codes
}

// src/app/api/auth/2fa/validate/route.ts
export async function POST(req: Request) {
  // 1. Validate 2FA code during login
  // 2. Create session if valid
}
```

4. **Frontend Components**
- 2FA Setup Wizard
- QR Code Display
- Code Verification Form
- Backup Codes Display
- 2FA Settings Management

5. **Security Considerations**
- Rate limiting on verification attempts
- Secure storage of secrets
- Session management with 2FA status
- Backup codes for account recovery
- Audit logging for all 2FA events

## 2. SOC2 Compliance

### Required Implementations

1. **Access Control**
```typescript
// src/lib/security/access.ts
export interface AccessPolicy {
  resource: string;
  action: 'read' | 'write' | 'delete';
  conditions?: Record<string, any>;
}

export class AccessControl {
  // Implement RBAC with detailed audit logging
  async checkAccess(userId: string, policy: AccessPolicy): Promise<boolean>;
  async logAccess(userId: string, policy: AccessPolicy, granted: boolean): Promise<void>;
}
```

2. **Audit Logging Enhancement**
```typescript
// src/lib/security/auditLogger.ts
export interface AuditEvent {
  userId: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  ip: string;
  userAgent: string;
  timestamp: Date;
}

export class EnhancedAuditLogger {
  async log(event: AuditEvent): Promise<void>;
  async search(criteria: Partial<AuditEvent>): Promise<AuditEvent[]>;
  async export(startDate: Date, endDate: Date): Promise<string>; // CSV format
}
```

3. **Data Retention Policy**
```sql
-- Automated data retention
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
  -- Delete audit logs older than 1 year
  DELETE FROM audit_logs 
  WHERE timestamp < NOW() - INTERVAL '1 year';
  
  -- Archive messages older than 2 years
  INSERT INTO archived_messages 
  SELECT * FROM messages 
  WHERE created_at < NOW() - INTERVAL '2 years';
  
  DELETE FROM messages 
  WHERE created_at < NOW() - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql;
```

4. **Incident Response**
```typescript
// src/lib/security/incidentResponse.ts
export interface SecurityIncident {
  type: 'unauthorized_access' | 'data_breach' | 'api_abuse';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, any>;
}

export class IncidentResponse {
  async reportIncident(incident: SecurityIncident): Promise<void>;
  async notifyStakeholders(incident: SecurityIncident): Promise<void>;
  async createRemediationPlan(incident: SecurityIncident): Promise<void>;
}
```

## 3. API Key Rotation

### Implementation Details

1. **Database Schema**
```sql
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id),
    key_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    rotated_from UUID REFERENCES api_keys(id),
    status TEXT DEFAULT 'active',
    scopes TEXT[]
);

CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_status ON api_keys(status);
```

2. **Key Management Service**
```typescript
// src/lib/security/apiKeys.ts
export interface APIKeyOptions {
  name: string;
  expiresIn?: number; // days
  scopes?: string[];
}

export class APIKeyManager {
  // Generate new API key
  async createKey(userId: string, options: APIKeyOptions): Promise<string>;
  
  // Rotate existing key
  async rotateKey(keyId: string, options?: APIKeyOptions): Promise<string>;
  
  // Validate key
  async validateKey(key: string): Promise<boolean>;
  
  // List active keys
  async listKeys(userId: string): Promise<APIKey[]>;
  
  // Revoke key
  async revokeKey(keyId: string): Promise<void>;
}
```

3. **Auto-Rotation Policy**
```typescript
// src/lib/security/keyRotation.ts
export class KeyRotationPolicy {
  // Check for keys that need rotation
  async checkRotationNeeded(): Promise<void> {
    // 1. Find keys older than 90 days
    // 2. Notify users
    // 3. Schedule automatic rotation
  }

  // Perform automatic rotation
  async rotateExpiredKeys(): Promise<void> {
    // 1. Create new key
    // 2. Update all necessary references
    // 3. Mark old key for deprecation
    // 4. Notify users
  }

  // Grace period management
  async handleGracePeriod(): Promise<void> {
    // 1. Track old key usage
    // 2. Send reminders
    // 3. Disable after grace period
  }
}
```

4. **API Endpoints**
```typescript
// src/app/api/keys/route.ts
export async function POST(req: Request) {
  // Create new API key
}

export async function GET(req: Request) {
  // List active keys
}

// src/app/api/keys/[id]/rotate/route.ts
export async function POST(req: Request) {
  // Rotate specific key
}

// src/app/api/keys/[id]/revoke/route.ts
export async function POST(req: Request) {
  // Revoke specific key
}
```

## Implementation Order and Timeline

1. **Week 1-2: Two-Factor Authentication**
   - Database schema updates
   - Basic 2FA flow
   - QR code generation
   - Backup codes system

2. **Week 3-4: API Key Rotation**
   - Database schema
   - Key management service
   - Rotation mechanisms
   - Grace period handling

3. **Week 5-8: SOC2 Compliance**
   - Access control implementation
   - Enhanced audit logging
   - Data retention policies
   - Incident response system

## Business Impact

1. **Enhanced Security Posture**
   - Reduced risk of unauthorized access
   - Better compliance with security standards
   - Improved incident response capabilities

2. **Customer Trust**
   - SOC2 compliance attracts enterprise customers
   - 2FA shows commitment to security
   - API key rotation demonstrates best practices

3. **Competitive Advantage**
   - Security features as differentiator
   - Enterprise-ready platform
   - Compliance certifications

## Monitoring & Metrics

1. **Security Metrics**
   - 2FA adoption rate
   - Failed authentication attempts
   - API key rotation compliance
   - Security incident response time

2. **Business Metrics**
   - Customer satisfaction scores
   - Enterprise customer acquisition
   - Churn rate changes
   - Support ticket volume

## Future Considerations

1. **Advanced Security**
   - Hardware key support (YubiKey)
   - IP allowlisting
   - Advanced threat detection

2. **Compliance Expansion**
   - GDPR compliance
   - HIPAA compliance
   - ISO 27001 certification

3. **Integration Enhancement**
   - SSO providers
   - Enterprise identity providers
   - Compliance automation tools
