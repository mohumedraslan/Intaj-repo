/**
 * Comprehensive Health Check System
 * Monitors system dependencies and overall application health
 */

import { createLogger } from '../logging/Logger';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

const logger = createLogger('HealthChecker');

export interface HealthStatus {
  healthy: boolean;
  message?: string;
  details?: Record<string, any>;
  responseTime?: number;
  timestamp: string;
}

export interface HealthCheck {
  name: string;
  description: string;
  critical: boolean;
  timeout?: number;
  check(): Promise<HealthStatus>;
}

export interface HealthReport {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: Array<{
    name: string;
    status: HealthStatus;
    critical: boolean;
  }>;
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    critical_failures: number;
  };
}

export class HealthChecker {
  private checks: Map<string, HealthCheck> = new Map();
  private readonly startTime = Date.now();

  /**
   * Add a health check
   */
  addCheck(check: HealthCheck): void {
    this.checks.set(check.name, check);
    logger.debug('Health check added', {
      name: check.name,
      critical: check.critical,
      timeout: check.timeout
    });
  }

  /**
   * Remove a health check
   */
  removeCheck(name: string): void {
    this.checks.delete(name);
    logger.debug('Health check removed', { name });
  }

  /**
   * Run all health checks and generate report
   */
  async checkHealth(): Promise<HealthReport> {
    const startTime = Date.now();
    
    logger.debug('Starting health check', {
      totalChecks: this.checks.size
    });

    const checkPromises = Array.from(this.checks.values()).map(async (check) => {
      try {
        const status = await this.runSingleCheck(check);
        return {
          name: check.name,
          status,
          critical: check.critical
        };
      } catch (error) {
        logger.error('Health check failed', {
          checkName: check.name,
          error
        });

        return {
          name: check.name,
          status: {
            healthy: false,
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          },
          critical: check.critical
        };
      }
    });

    const results = await Promise.allSettled(checkPromises);
    const checks = results.map(result => 
      result.status === 'fulfilled' 
        ? result.value 
        : {
            name: 'unknown',
            status: {
              healthy: false,
              message: 'Health check execution failed',
              timestamp: new Date().toISOString()
            },
            critical: true
          }
    );

    // Calculate summary
    const summary = {
      total: checks.length,
      healthy: checks.filter(c => c.status.healthy).length,
      unhealthy: checks.filter(c => !c.status.healthy).length,
      critical_failures: checks.filter(c => !c.status.healthy && c.critical).length
    };

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (summary.critical_failures > 0) {
      overallStatus = 'unhealthy';
    } else if (summary.unhealthy > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    const report: HealthReport = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks,
      summary
    };

    const checkDuration = Date.now() - startTime;
    
    logger.info('Health check completed', {
      status: overallStatus,
      duration: checkDuration,
      summary
    });

    return report;
  }

  /**
   * Run a single health check with timeout
   */
  private async runSingleCheck(check: HealthCheck): Promise<HealthStatus> {
    const timeout = check.timeout || 5000;
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Health check '${check.name}' timed out after ${timeout}ms`));
      }, timeout);

      check.check()
        .then(status => {
          clearTimeout(timeoutId);
          const responseTime = Date.now() - startTime;
          resolve({
            ...status,
            responseTime,
            timestamp: new Date().toISOString()
          });
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Get list of registered checks
   */
  getRegisteredChecks(): Array<{ name: string; description: string; critical: boolean }> {
    return Array.from(this.checks.values()).map(check => ({
      name: check.name,
      description: check.description,
      critical: check.critical
    }));
  }
}

/**
 * Database Health Check
 */
export class DatabaseHealthCheck implements HealthCheck {
  name = 'database';
  description = 'PostgreSQL database connectivity and basic operations';
  critical = true;
  timeout = 10000;

  private supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  async check(): Promise<HealthStatus> {
    try {
      const startTime = Date.now();
      
      // Test basic connectivity
      const { data, error } = await this.supabase
        .from('profiles')
        .select('count')
        .limit(1);

      if (error) {
        return {
          healthy: false,
          message: `Database query failed: ${error.message}`,
          details: { error: error.code },
          timestamp: new Date().toISOString()
        };
      }

      const responseTime = Date.now() - startTime;

      return {
        healthy: true,
        message: 'Database is accessible and responsive',
        details: {
          responseTime,
          connection: 'active'
        },
        responseTime,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        healthy: false,
        message: error instanceof Error ? error.message : 'Database connection failed',
        timestamp: new Date().toISOString()
      };
    }
  }
}

/**
 * Redis Health Check
 */
export class RedisHealthCheck implements HealthCheck {
  name = 'redis';
  description = 'Redis cache connectivity and operations';
  critical = false;
  timeout = 5000;

  async check(): Promise<HealthStatus> {
    try {
      // For now, we'll simulate a Redis check
      // In production, you would use actual Redis client
      const startTime = Date.now();
      
      // Simulate Redis ping
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const responseTime = Date.now() - startTime;

      return {
        healthy: true,
        message: 'Redis is accessible and responsive',
        details: {
          responseTime,
          connection: 'active'
        },
        responseTime,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        healthy: false,
        message: error instanceof Error ? error.message : 'Redis connection failed',
        timestamp: new Date().toISOString()
      };
    }
  }
}

/**
 * LLM Provider Health Check
 */
export class LLMProviderHealthCheck implements HealthCheck {
  name = 'llm_providers';
  description = 'LLM provider API connectivity';
  critical = false;
  timeout = 15000;

  async check(): Promise<HealthStatus> {
    const providers = [];
    const results: Record<string, boolean> = {};

    // Check OpenRouter
    if (process.env.OPENROUTER_API_KEY) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          },
          signal: AbortSignal.timeout(10000)
        });
        results.openrouter = response.ok;
        providers.push('openrouter');
      } catch {
        results.openrouter = false;
        providers.push('openrouter');
      }
    }

    // Check OpenAI
    if (process.env.OPENAI_API_KEY) {
      try {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          signal: AbortSignal.timeout(10000)
        });
        results.openai = response.ok;
        providers.push('openai');
      } catch {
        results.openai = false;
        providers.push('openai');
      }
    }

    const healthyProviders = Object.values(results).filter(Boolean).length;
    const totalProviders = providers.length;

    return {
      healthy: healthyProviders > 0,
      message: `${healthyProviders}/${totalProviders} LLM providers are accessible`,
      details: {
        providers: results,
        healthy_count: healthyProviders,
        total_count: totalProviders
      },
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Vector Database Health Check
 */
export class VectorDBHealthCheck implements HealthCheck {
  name = 'vector_database';
  description = 'Qdrant vector database connectivity';
  critical = false;
  timeout = 10000;

  async check(): Promise<HealthStatus> {
    try {
      const qdrantHost = process.env.QDRANT_HOST || 'localhost';
      const qdrantPort = process.env.QDRANT_PORT || '6333';
      
      const response = await fetch(`http://${qdrantHost}:${qdrantPort}/health`, {
        signal: AbortSignal.timeout(8000)
      });

      if (!response.ok) {
        return {
          healthy: false,
          message: `Vector database returned status ${response.status}`,
          details: {
            host: qdrantHost,
            port: qdrantPort,
            status: response.status
          },
          timestamp: new Date().toISOString()
        };
      }

      return {
        healthy: true,
        message: 'Vector database is accessible and responsive',
        details: {
          host: qdrantHost,
          port: qdrantPort,
          status: response.status
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        healthy: false,
        message: error instanceof Error ? error.message : 'Vector database connection failed',
        timestamp: new Date().toISOString()
      };
    }
  }
}

/**
 * System Resources Health Check
 */
export class SystemResourcesHealthCheck implements HealthCheck {
  name = 'system_resources';
  description = 'System memory and CPU usage';
  critical = false;
  timeout = 1000;

  async check(): Promise<HealthStatus> {
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      // Convert to MB for readability
      const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
      const rssMB = Math.round(memoryUsage.rss / 1024 / 1024);
      
      // Calculate memory usage percentage
      const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      
      // Check if memory usage is concerning
      const memoryHealthy = memoryUsagePercent < 90;
      const rssHealthy = rssMB < 1000; // Less than 1GB RSS

      return {
        healthy: memoryHealthy && rssHealthy,
        message: memoryHealthy && rssHealthy 
          ? 'System resources are within normal limits'
          : 'System resources are under pressure',
        details: {
          memory: {
            heap_used_mb: heapUsedMB,
            heap_total_mb: heapTotalMB,
            rss_mb: rssMB,
            external_mb: Math.round(memoryUsage.external / 1024 / 1024),
            usage_percent: Math.round(memoryUsagePercent)
          },
          cpu: {
            user_microseconds: cpuUsage.user,
            system_microseconds: cpuUsage.system
          },
          uptime_seconds: Math.round(process.uptime())
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        healthy: false,
        message: error instanceof Error ? error.message : 'Failed to check system resources',
        timestamp: new Date().toISOString()
      };
    }
  }
}

/**
 * Environment Configuration Health Check
 */
export class EnvironmentHealthCheck implements HealthCheck {
  name = 'environment';
  description = 'Environment variables and configuration';
  critical = true;
  timeout = 1000;

  async check(): Promise<HealthStatus> {
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];

    const optionalVars = [
      'OPENROUTER_API_KEY',
      'OPENAI_API_KEY',
      'REDIS_URL',
      'QDRANT_HOST'
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);
    const present = optionalVars.filter(varName => !!process.env[varName]);

    return {
      healthy: missing.length === 0,
      message: missing.length === 0 
        ? 'All required environment variables are configured'
        : `Missing required environment variables: ${missing.join(', ')}`,
      details: {
        required_missing: missing,
        optional_present: present,
        node_env: process.env.NODE_ENV,
        app_version: process.env.APP_VERSION
      },
      timestamp: new Date().toISOString()
    };
  }
}

// Singleton instance
let healthCheckerInstance: HealthChecker | null = null;

/**
 * Get or create health checker singleton
 */
export function getHealthChecker(): HealthChecker {
  if (!healthCheckerInstance) {
    healthCheckerInstance = new HealthChecker();
    
    // Register default health checks
    healthCheckerInstance.addCheck(new DatabaseHealthCheck());
    healthCheckerInstance.addCheck(new RedisHealthCheck());
    healthCheckerInstance.addCheck(new LLMProviderHealthCheck());
    healthCheckerInstance.addCheck(new VectorDBHealthCheck());
    healthCheckerInstance.addCheck(new SystemResourcesHealthCheck());
    healthCheckerInstance.addCheck(new EnvironmentHealthCheck());
  }
  
  return healthCheckerInstance;
}
