/**
 * Metrics API Endpoint
 * Exports Prometheus-compatible metrics for monitoring systems
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMetricsCollector } from '@/lib/metrics/MetricsCollector';
import { createLogger } from '@/lib/logging/Logger';
import { trackAPIRequest } from '@/lib/metrics/businessMetrics';

const logger = createLogger('MetricsAPI');

/**
 * GET /api/v1/monitoring/metrics
 * Returns Prometheus-formatted metrics
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    logger.debug('Metrics export requested', {
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });

    const metricsCollector = getMetricsCollector();
    const metricsText = await metricsCollector.exportMetrics();

    const responseTime = Date.now() - startTime;

    // Track API metrics (but don't create infinite loop)
    if (!request.url.includes('/metrics')) {
      await trackAPIRequest(
        '/api/v1/monitoring/metrics',
        'GET',
        200,
        responseTime
      );
    }

    logger.debug('Metrics exported', {
      responseTime,
      metricsSize: metricsText.length
    });

    return new NextResponse(metricsText, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    logger.error('Metrics export failed', {
      error,
      responseTime
    });

    // Track error metrics
    await trackAPIRequest(
      '/api/v1/monitoring/metrics',
      'GET',
      500,
      responseTime
    );

    return NextResponse.json({
      error: 'Failed to export metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
  }
}
