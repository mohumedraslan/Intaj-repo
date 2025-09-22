/**
 * Security Audit Logger
 * Comprehensive audit logging for security events and compliance
 */

import { createLogger } from '../logging/Logger';
import { getMetricsCollector } from '../metrics/MetricsCollector';
import { captureError } from '../monitoring/errorTracking';
import { createClient } from '@supabase/supabase-js';

const logger = createLogger('SecurityAudit');
const metrics = getMetricsCollector();

export interface SecurityEvent {
  type: SecurityEventType;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  action: string;
  result: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  metadata?: Record<string, any>;
  timestamp?: Date;
}

export enum SecurityEventType {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  DATA_ACCESS = 'DATA_ACCESS',
  CONFIGURATION_CHANGE = 'CONFIGURATION_CHANGE',
  PRIVILEGE_ESCALATION = 'PRIVILEGE_ESCALATION',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  API_ACCESS = 'API_ACCESS',
  FILE_ACCESS = 'FILE_ACCESS',
  SYSTEM_ACCESS = 'SYSTEM_ACCESS'
}

export class SecurityAuditLogger {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  /**
   * Log a security event
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    const startTime = Date.now();

    try {
      const auditEvent = {
        ...event,
        timestamp: event.timestamp || new Date(),
        id: crypto.randomUUID()
      };

      // Log to structured logger
      await logger.info('Security event', {
        eventType: auditEvent.type,
        userId: auditEvent.userId,
        ipAddress: auditEvent.ipAddress,
        resource: auditEvent.resource,
        action: auditEvent.action,
        result: auditEvent.result,
        severity: auditEvent.severity,
        timestamp: auditEvent.timestamp.toISOString(),
        metadata: auditEvent.metadata
      });

      // Store in database for analysis and compliance
      await this.storeAuditEvent(auditEvent);

      // Track metrics
      metrics.incrementCounter('security_event_logged', {
        type: auditEvent.type,
        result: auditEvent.result,
        severity: auditEvent.severity
      });

      // Trigger alerts for critical events
      if (auditEvent.severity === 'CRITICAL') {
        await this.triggerSecurityAlert(auditEvent);
      }

      metrics.recordHistogram('security_audit_duration', Date.now() - startTime);

    } catch (error) {
      logger.error('Failed to log security event', { error, event });
      captureError(error as Error, {
        context: 'security_audit_logging',
        event: event.type
      });
    }
  }

  /**
   * Log authentication attempt
   */
  async logAuthenticationAttempt(
    email: string,
    success: boolean,
    ipAddress: string,
    userAgent: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logSecurityEvent({
      type: SecurityEventType.AUTHENTICATION,
      userId: success ? await this.getUserIdByEmail(email) : undefined,
      ipAddress,
      userAgent,
      action: 'LOGIN_ATTEMPT',
      result: success ? 'SUCCESS' : 'FAILURE',
      severity: success ? 'LOW' : 'MEDIUM',
      metadata: {
        email,
        ...metadata
      }
    });
  }

  /**
   * Log authorization failure
   */
  async logAuthorizationFailure(
    userId: string,
    resource: string,
    action: string,
    requiredPermissions: string[],
    ipAddress?: string
  ): Promise<void> {
    await this.logSecurityEvent({
      type: SecurityEventType.AUTHORIZATION,
      userId,
      ipAddress,
      resource,
      action,
      result: 'FAILURE',
      severity: 'MEDIUM',
      metadata: {
        requiredPermissions
      }
    });
  }

  /**
   * Log suspicious activity
   */
  async logSuspiciousActivity(
    description: string,
    ipAddress: string,
    userAgent?: string,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logSecurityEvent({
      type: SecurityEventType.SUSPICIOUS_ACTIVITY,
      userId,
      ipAddress,
      userAgent,
      action: 'SUSPICIOUS_BEHAVIOR_DETECTED',
      result: 'BLOCKED',
      severity: 'HIGH',
      metadata: {
        description,
        ...metadata
      }
    });
  }

  /**
   * Store audit event in database
   */
  private async storeAuditEvent(event: SecurityEvent & { id: string }): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('security_audit_logs')
        .insert({
          id: event.id,
          event_type: event.type,
          user_id: event.userId,
          session_id: event.sessionId,
          ip_address: event.ipAddress,
          user_agent: event.userAgent,
          resource: event.resource,
          action: event.action,
          result: event.result,
          severity: event.severity,
          metadata: event.metadata,
          created_at: event.timestamp!.toISOString()
        });

      if (error) {
        throw error;
      }

    } catch (error) {
      logger.error('Failed to store audit event', { error, eventId: event.id });
    }
  }

  /**
   * Trigger security alert for critical events
   */
  private async triggerSecurityAlert(event: SecurityEvent): Promise<void> {
    try {
      // Send to monitoring system
      logger.fatal('Critical security event', {
        eventType: event.type,
        action: event.action,
        userId: event.userId,
        ipAddress: event.ipAddress,
        metadata: event.metadata
      });

      // Track critical event metric
      metrics.incrementCounter('security_critical_event', {
        type: event.type,
        action: event.action
      });

      // TODO: Integrate with alerting system (email, Slack, PagerDuty, etc.)
      
    } catch (error) {
      logger.error('Failed to trigger security alert', { error });
    }
  }

  /**
   * Get user ID by email
   */
  private async getUserIdByEmail(email: string): Promise<string | undefined> {
    try {
      const { data } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      return data?.id;
    } catch {
      return undefined;
    }
  }
}

// Singleton instance
let auditLoggerInstance: SecurityAuditLogger;

export function getSecurityAuditLogger(): SecurityAuditLogger {
  if (!auditLoggerInstance) {
    auditLoggerInstance = new SecurityAuditLogger();
  }
  return auditLoggerInstance;
}
