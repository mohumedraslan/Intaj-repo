/**
 * Health Check API Endpoint
 * Provides comprehensive system health status for monitoring and alerting
 */

import { NextRequest, NextResponse } from 'next/server';
import { getHealthChecker } from '@/lib/health/HealthChecker';
import { createLogger } from '@/lib/logging/Logger';
import { trackAPIRequest } from '@/lib/metrics/businessMetrics';

const logger = createLogger('HealthAPI');

/**
 * GET /api/v1/health
 * Returns comprehensive system health status
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    logger.info('Health check requested', {
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });

    const healthChecker = getHealthChecker();
    const healthReport = await healthChecker.checkHealth();

    const responseTime = Date.now() - startTime;
    const statusCode = healthReport.status === 'healthy' ? 200 : 
                      healthReport.status === 'degraded' ? 200 : 503;

    // Track API metrics
    await trackAPIRequest(
      '/api/v1/health',
      'GET',
      statusCode,
      responseTime
    );

    logger.info('Health check completed', {
      status: healthReport.status,
      responseTime,
      healthyChecks: healthReport.summary.healthy,
      unhealthyChecks: healthReport.summary.unhealthy,
      criticalFailures: healthReport.summary.critical_failures
    });

    return NextResponse.json(healthReport, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    logger.error('Health check failed', {
      error,
      responseTime
    });

    // Track error metrics
    await trackAPIRequest(
      '/api/v1/health',
      'GET',
      500,
      responseTime
    );

    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check system failure',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
}

/**
 * GET /api/v1/health?check=<name>
 * Returns status of a specific health check
 */
export async function HEAD(request: NextRequest) {
  try {
    const healthChecker = getHealthChecker();
    const healthReport = await healthChecker.checkHealth();
    
    const statusCode = healthReport.status === 'healthy' ? 200 : 503;
    
    return new NextResponse(null, { 
      status: statusCode,
      headers: {
        'X-Health-Status': healthReport.status,
        'X-Health-Checks': healthReport.summary.total.toString(),
        'X-Health-Healthy': healthReport.summary.healthy.toString(),
        'X-Health-Unhealthy': healthReport.summary.unhealthy.toString(),
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    return new NextResponse(null, { 
      status: 503,
      headers: {
        'X-Health-Status': 'error',
        'Cache-Control': 'no-cache'
      }
    });
  }
}
