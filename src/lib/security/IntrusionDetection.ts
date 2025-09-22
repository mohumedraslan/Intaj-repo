/**
 * Intrusion Detection System
 * Real-time threat detection and automated response
 */

import { NextRequest } from 'next/server';
import { Redis } from 'ioredis';
import { createLogger } from '../logging/Logger';
import { getMetricsCollector } from '../metrics/MetricsCollector';
import { getSecurityAuditLogger, SecurityEventType } from './SecurityAuditLogger';

const logger = createLogger('IntrusionDetection');
const metrics = getMetricsCollector();
const auditLogger = getSecurityAuditLogger();

export interface SecurityAssessment {
  threats: ThreatType[];
  riskScore: number;
  shouldBlock: boolean;
  confidence: number;
  recommendations: string[];
}

export enum ThreatType {
  SQL_INJECTION = 'SQL_INJECTION',
  XSS = 'XSS',
  BRUTE_FORCE = 'BRUTE_FORCE',
  BOT_ACTIVITY = 'BOT_ACTIVITY',
  RATE_LIMIT_VIOLATION = 'RATE_LIMIT_VIOLATION',
  SUSPICIOUS_USER_AGENT = 'SUSPICIOUS_USER_AGENT',
  GEO_ANOMALY = 'GEO_ANOMALY',
  PRIVILEGE_ESCALATION = 'PRIVILEGE_ESCALATION',
  DATA_EXFILTRATION = 'DATA_EXFILTRATION',
  ACCOUNT_TAKEOVER = 'ACCOUNT_TAKEOVER'
}

export class IntrusionDetection {
  private redis: Redis;
  
  private suspiciousPatterns = [
    // SQL Injection patterns
    { pattern: /union\s+select/i, threat: ThreatType.SQL_INJECTION, weight: 0.9 },
    { pattern: /(\%27)|(\')|(\-\-)|(\%23)|(#)/i, threat: ThreatType.SQL_INJECTION, weight: 0.7 },
    { pattern: /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i, threat: ThreatType.SQL_INJECTION, weight: 0.8 },
    
    // XSS patterns
    { pattern: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, threat: ThreatType.XSS, weight: 0.95 },
    { pattern: /javascript:/i, threat: ThreatType.XSS, weight: 0.8 },
    { pattern: /on\w+\s*=/i, threat: ThreatType.XSS, weight: 0.7 },
    { pattern: /<iframe\b[^>]*>/i, threat: ThreatType.XSS, weight: 0.9 },
    
    // Command injection patterns
    { pattern: /(\||;|&|\$\(|\`)/g, threat: ThreatType.SQL_INJECTION, weight: 0.6 },
    { pattern: /(wget|curl|nc|netcat|python|perl|ruby|php|bash|sh|cmd|powershell)/gi, threat: ThreatType.SQL_INJECTION, weight: 0.8 }
  ];

  private botUserAgents = [
    /bot/i, /crawler/i, /spider/i, /scraper/i,
    /curl/i, /wget/i, /python/i, /java/i,
    /sqlmap/i, /nikto/i, /nessus/i, /burp/i,
    /nmap/i, /masscan/i, /zap/i
  ];

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL!);
  }

  /**
   * Analyze request for security threats
   */
  async analyzeRequest(req: NextRequest): Promise<SecurityAssessment> {
    const startTime = Date.now();
    
    try {
      const threats: ThreatType[] = [];
      let riskScore = 0;
      const recommendations: string[] = [];

      const clientIP = this.getClientIP(req);
      const userAgent = req.headers.get('user-agent') || '';
      const url = req.nextUrl.pathname + req.nextUrl.search;

      // Check for SQL injection patterns
      const sqlThreats = this.detectSQLInjection(req);
      if (sqlThreats.detected) {
        threats.push(ThreatType.SQL_INJECTION);
        riskScore += sqlThreats.score;
        recommendations.push('Block request with SQL injection patterns');
      }

      // Check for XSS patterns
      const xssThreats = this.detectXSS(req);
      if (xssThreats.detected) {
        threats.push(ThreatType.XSS);
        riskScore += xssThreats.score;
        recommendations.push('Sanitize input to prevent XSS');
      }

      // Check for brute force attempts
      const bruteForce = await this.detectBruteForce(req);
      if (bruteForce.detected) {
        threats.push(ThreatType.BRUTE_FORCE);
        riskScore += bruteForce.score;
        recommendations.push('Implement progressive delays or CAPTCHA');
      }

      // Check for bot activity
      const botActivity = this.detectBotActivity(req);
      if (botActivity.detected) {
        threats.push(ThreatType.BOT_ACTIVITY);
        riskScore += botActivity.score;
        recommendations.push('Challenge with CAPTCHA or rate limiting');
      }

      // Check rate limiting violations
      const rateLimitViolation = await this.checkRateLimitViolations(clientIP);
      if (rateLimitViolation.detected) {
        threats.push(ThreatType.RATE_LIMIT_VIOLATION);
        riskScore += rateLimitViolation.score;
        recommendations.push('Apply stricter rate limiting');
      }

      // Check for suspicious user agent
      const suspiciousUA = this.detectSuspiciousUserAgent(userAgent);
      if (suspiciousUA.detected) {
        threats.push(ThreatType.SUSPICIOUS_USER_AGENT);
        riskScore += suspiciousUA.score;
        recommendations.push('Monitor or block suspicious user agents');
      }

      // Normalize risk score (0-100)
      riskScore = Math.min(100, riskScore);

      const shouldBlock = riskScore >= 80 || threats.some(t => 
        [ThreatType.SQL_INJECTION, ThreatType.XSS].includes(t)
      );

      const assessment: SecurityAssessment = {
        threats,
        riskScore,
        shouldBlock,
        confidence: this.calculateConfidence(threats, riskScore),
        recommendations
      };

      // Log suspicious activity
      if (threats.length > 0) {
        await auditLogger.logSuspiciousActivity(
          `Threats detected: ${threats.join(', ')}`,
          clientIP,
          userAgent,
          undefined,
          {
            url,
            riskScore,
            threats,
            shouldBlock
          }
        );
      }

      // Track metrics
      metrics.incrementCounter('intrusion_detection_analysis', {
        threatCount: threats.length.toString(),
        riskLevel: this.getRiskLevel(riskScore),
        blocked: shouldBlock.toString()
      });

      metrics.recordHistogram('intrusion_detection_duration', Date.now() - startTime);

      return assessment;

    } catch (error) {
      logger.error('Intrusion detection analysis failed', { error });
      
      // Fail safe - allow request but log error
      return {
        threats: [],
        riskScore: 0,
        shouldBlock: false,
        confidence: 0,
        recommendations: []
      };
    }
  }

  /**
   * Detect SQL injection attempts
   */
  private detectSQLInjection(req: NextRequest): { detected: boolean; score: number } {
    const url = req.nextUrl.pathname + req.nextUrl.search;
    const body = req.body ? req.body.toString() : '';
    const content = url + ' ' + body;

    let score = 0;
    let detected = false;

    for (const { pattern, threat, weight } of this.suspiciousPatterns) {
      if (threat === ThreatType.SQL_INJECTION && pattern.test(content)) {
        detected = true;
        score += weight * 30; // Base score of 30 for SQL injection
      }
    }

    return { detected, score };
  }

  /**
   * Detect XSS attempts
   */
  private detectXSS(req: NextRequest): { detected: boolean; score: number } {
    const url = req.nextUrl.pathname + req.nextUrl.search;
    const body = req.body ? req.body.toString() : '';
    const content = url + ' ' + body;

    let score = 0;
    let detected = false;

    for (const { pattern, threat, weight } of this.suspiciousPatterns) {
      if (threat === ThreatType.XSS && pattern.test(content)) {
        detected = true;
        score += weight * 25; // Base score of 25 for XSS
      }
    }

    return { detected, score };
  }

  /**
   * Detect brute force attempts
   */
  private async detectBruteForce(req: NextRequest): Promise<{ detected: boolean; score: number }> {
    try {
      const clientIP = this.getClientIP(req);
      const isAuthEndpoint = req.nextUrl.pathname.includes('/auth/') || 
                            req.nextUrl.pathname.includes('/login');

      if (!isAuthEndpoint) {
        return { detected: false, score: 0 };
      }

      const key = `brute_force:${clientIP}`;
      const attempts = await this.redis.get(key);
      const attemptCount = attempts ? parseInt(attempts, 10) : 0;

      // Increment attempt counter
      await this.redis.incr(key);
      await this.redis.expire(key, 300); // 5 minutes

      const detected = attemptCount > 10; // More than 10 attempts in 5 minutes
      const score = Math.min(50, attemptCount * 3); // Up to 50 points

      return { detected, score };

    } catch (error) {
      logger.debug('Brute force detection failed', { error });
      return { detected: false, score: 0 };
    }
  }

  /**
   * Detect bot activity
   */
  private detectBotActivity(req: NextRequest): { detected: boolean; score: number } {
    const userAgent = req.headers.get('user-agent') || '';
    
    // Check against known bot patterns
    const isBotUA = this.botUserAgents.some(pattern => pattern.test(userAgent));
    
    // Check for missing common headers
    const hasAccept = req.headers.has('accept');
    const hasAcceptLanguage = req.headers.has('accept-language');
    const hasAcceptEncoding = req.headers.has('accept-encoding');
    
    const missingHeaders = [hasAccept, hasAcceptLanguage, hasAcceptEncoding]
      .filter(has => !has).length;

    // Check for suspicious request patterns
    const hasNoReferer = !req.headers.has('referer') && req.method === 'POST';
    const hasShortUA = userAgent.length < 20;

    let score = 0;
    if (isBotUA) score += 40;
    if (missingHeaders > 1) score += 20;
    if (hasNoReferer) score += 15;
    if (hasShortUA) score += 10;

    const detected = score >= 30;

    return { detected, score };
  }

  /**
   * Check for rate limit violations
   */
  private async checkRateLimitViolations(clientIP: string): Promise<{ detected: boolean; score: number }> {
    try {
      const key = `rate_violations:${clientIP}`;
      const violations = await this.redis.get(key);
      const violationCount = violations ? parseInt(violations, 10) : 0;

      const detected = violationCount > 5; // More than 5 violations
      const score = Math.min(30, violationCount * 5);

      return { detected, score };

    } catch (error) {
      return { detected: false, score: 0 };
    }
  }

  /**
   * Detect suspicious user agents
   */
  private detectSuspiciousUserAgent(userAgent: string): { detected: boolean; score: number } {
    const suspiciousPatterns = [
      /sqlmap/i, /nikto/i, /nessus/i, /burp/i,
      /nmap/i, /masscan/i, /zap/i, /w3af/i,
      /acunetix/i, /appscan/i, /webscarab/i
    ];

    const detected = suspiciousPatterns.some(pattern => pattern.test(userAgent));
    const score = detected ? 35 : 0;

    return { detected, score };
  }

  /**
   * Get client IP address
   */
  private getClientIP(req: NextRequest): string {
    const forwarded = req.headers.get('x-forwarded-for');
    const realIP = req.headers.get('x-real-ip');
    const clientIP = forwarded ? forwarded.split(',')[0] : realIP || req.ip || 'unknown';
    
    return clientIP.trim();
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(threats: ThreatType[], riskScore: number): number {
    if (threats.length === 0) return 0.95; // High confidence in clean requests
    
    const highConfidenceThreats = [
      ThreatType.SQL_INJECTION,
      ThreatType.XSS,
      ThreatType.SUSPICIOUS_USER_AGENT
    ];

    const hasHighConfidenceThreat = threats.some(t => highConfidenceThreats.includes(t));
    
    if (hasHighConfidenceThreat) return 0.9;
    if (riskScore > 70) return 0.8;
    if (riskScore > 40) return 0.6;
    
    return 0.4;
  }

  /**
   * Get risk level string
   */
  private getRiskLevel(score: number): string {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }

  /**
   * Record rate limit violation
   */
  async recordRateLimitViolation(clientIP: string): Promise<void> {
    try {
      const key = `rate_violations:${clientIP}`;
      await this.redis.incr(key);
      await this.redis.expire(key, 3600); // 1 hour
    } catch (error) {
      logger.debug('Failed to record rate limit violation', { error });
    }
  }

  /**
   * Get threat statistics
   */
  async getThreatStatistics(timeframe: 'hour' | 'day' | 'week' = 'day'): Promise<{
    totalThreats: number;
    threatsByType: Record<ThreatType, number>;
    blockedRequests: number;
    topThreats: Array<{ type: ThreatType; count: number }>;
  }> {
    // This would typically query a time-series database
    // For now, return mock data structure
    return {
      totalThreats: 0,
      threatsByType: {} as Record<ThreatType, number>,
      blockedRequests: 0,
      topThreats: []
    };
  }
}

// Singleton instance
let intrusionDetectionInstance: IntrusionDetection;

export function getIntrusionDetection(): IntrusionDetection {
  if (!intrusionDetectionInstance) {
    intrusionDetectionInstance = new IntrusionDetection();
  }
  return intrusionDetectionInstance;
}
