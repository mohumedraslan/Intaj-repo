import { createClient } from '@supabase/supabase-js';

export interface AuditLogEntry {
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata: {
    ip?: string;
    userAgent?: string;
    location?: string;
    changes?: Record<string, { old: unknown; new: unknown }>;
    [key: string]: unknown;
  };
  severity: 'info' | 'warning' | 'critical';
  status: 'success' | 'failure';
  timestamp: Date;
}

export class AuditLogger {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  async log(entry: Omit<AuditLogEntry, 'timestamp'>): Promise<void> {
    const fullEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date(),
    };

    const { error } = await this.supabase.from('audit_logs').insert([fullEntry]);

    if (error) {
      console.error('Failed to write audit log:', error);
      // Fallback to local logging if database write fails
      this.logLocally(fullEntry);
    }
  }

  private logLocally(entry: AuditLogEntry): void {
    const logEntry = {
      timestamp: entry.timestamp.toISOString(),
      userId: entry.userId,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      severity: entry.severity,
      status: entry.status,
      metadata: JSON.stringify(entry.metadata),
    };

    console.log('[AUDIT LOG]', logEntry);
  }

  async logAuthEvent(
    userId: string,
    action: string,
    status: 'success' | 'failure',
    metadata: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      userId,
      action,
      resourceType: 'auth',
      metadata,
      severity: status === 'failure' ? 'warning' : 'info',
      status,
    });
  }

  async logDataAccess(
    userId: string,
    resourceType: string,
    resourceId: string,
    action: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      userId,
      action,
      resourceType,
      resourceId,
      metadata,
      severity: 'info',
      status: 'success',
    });
  }

  async logSecurityEvent(
    userId: string,
    action: string,
    metadata: Record<string, unknown>,
    severity: 'warning' | 'critical' = 'warning'
  ): Promise<void> {
    await this.log({
      userId,
      action,
      resourceType: 'security',
      metadata,
      severity,
      status: 'failure',
    });
  }

  async search(options: {
    userId?: string;
    action?: string;
    resourceType?: string;
    severity?: 'info' | 'warning' | 'critical';
    status?: 'success' | 'failure';
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AuditLogEntry[]> {
    let query = this.supabase.from('audit_logs').select();

    if (options.userId) query = query.eq('userId', options.userId);
    if (options.action) query = query.eq('action', options.action);
    if (options.resourceType) query = query.eq('resourceType', options.resourceType);
    if (options.severity) query = query.eq('severity', options.severity);
    if (options.status) query = query.eq('status', options.status);
    if (options.startDate) query = query.gte('timestamp', options.startDate.toISOString());
    if (options.endDate) query = query.lte('timestamp', options.endDate.toISOString());
    if (options.limit) query = query.limit(options.limit);

    const { data, error } = await query;

    if (error) throw new Error('Failed to search audit logs');
    return data;
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger();
