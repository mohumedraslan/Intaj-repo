/**
 * Error Tracking and Monitoring
 * Comprehensive error tracking with Sentry integration and custom analytics
 */

import * as Sentry from '@sentry/nextjs';
import { createLogger } from '../logging/Logger';
import { trackError } from '../metrics/businessMetrics';

const logger = createLogger('ErrorTracking');

export interface ErrorContext {
  userId?: string;
  agentId?: string;
  conversationId?: string;
  messageId?: string;
  correlationId?: string;
  platform?: string;
  operation?: string;
  component?: string;
  version?: string;
  environment?: string;
  userAgent?: string;
  ip?: string;
  url?: string;
  method?: string;
  statusCode?: number;
  [key: string]: any;
}

export interface ErrorMetadata {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'business' | 'technical' | 'security' | 'performance';
  fingerprint?: string[];
  tags?: Record<string, string>;
  extra?: Record<string, any>;
}

/**
 * Initialize error tracking system
 */
export function initializeErrorTracking(): void {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    logger.warn('Sentry DSN not configured, error tracking will be limited');
    return;
  }

  try {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.APP_VERSION || '1.0.0',
      
      // Performance monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      
      // Session replay (only in production)
      replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.01 : 0,
      replaysOnErrorSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
      
      // Error filtering
      beforeSend(event, hint) {
        // Filter out development errors
        if (process.env.NODE_ENV === 'development') {
          // Only send critical errors in development
          if (event.level !== 'fatal' && event.level !== 'error') {
            return null;
          }
        }

        // Filter out known noise
        if (event.exception?.values?.[0]?.value?.includes('ResizeObserver loop limit exceeded')) {
          return null;
        }

        if (event.exception?.values?.[0]?.value?.includes('Non-Error promise rejection')) {
          return null;
        }

        // Add custom context
        if (hint.originalException instanceof Error) {
          event.extra = {
            ...event.extra,
            errorName: hint.originalException.name,
            errorStack: hint.originalException.stack,
            timestamp: new Date().toISOString()
          };
        }

        return event;
      },

      // Breadcrumb filtering
      beforeBreadcrumb(breadcrumb) {
        // Filter out noisy breadcrumbs
        if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
          return null;
        }

        if (breadcrumb.category === 'navigation' && breadcrumb.data?.to?.includes('/api/')) {
          return null;
        }

        return breadcrumb;
      },

      // Integration configuration
      integrations: [
        new Sentry.BrowserTracing({
          // Capture interactions
          routingInstrumentation: Sentry.nextRouterInstrumentation,
          
          // Don't capture all requests
          tracePropagationTargets: [
            'localhost',
            /^https:\/\/yourapi\.domain\.com\/api/,
          ],
        }),
        new Sentry.Replay({
          // Mask all text and input content
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
    });

    logger.info('Error tracking initialized', {
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN ? 'configured' : 'missing',
      environment: process.env.NODE_ENV,
      release: process.env.APP_VERSION
    });

  } catch (error) {
    logger.error('Failed to initialize error tracking', { error });
  }
}

/**
 * Capture error with context and metadata
 */
export function captureError(
  error: Error,
  context: ErrorContext = {},
  metadata: Partial<ErrorMetadata> = {}
): string | undefined {
  try {
    const {
      severity = 'medium',
      category = 'technical',
      fingerprint,
      tags = {},
      extra = {}
    } = metadata;

    // Log error locally
    logger.error('Error captured', {
      errorName: error.name,
      errorMessage: error.message,
      severity,
      category,
      ...context
    });

    // Track error metrics
    trackError(
      error.name,
      context.component || 'unknown',
      severity,
      context
    );

    // Send to Sentry if available
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      return Sentry.withScope(scope => {
        // Set context
        if (context.userId) {
          scope.setUser({ id: context.userId });
        }

        // Set tags
        Object.entries({
          ...tags,
          severity,
          category,
          component: context.component,
          operation: context.operation,
          platform: context.platform,
          environment: process.env.NODE_ENV
        }).forEach(([key, value]) => {
          if (value) {
            scope.setTag(key, String(value));
          }
        });

        // Set extra context
        scope.setContext('error_context', {
          ...context,
          ...extra,
          timestamp: new Date().toISOString()
        });

        // Set fingerprint for grouping
        if (fingerprint) {
          scope.setFingerprint(fingerprint);
        }

        // Set level
        const sentryLevel = mapSeverityToSentryLevel(severity);
        scope.setLevel(sentryLevel);

        return Sentry.captureException(error);
      });
    }

    return undefined;

  } catch (captureError) {
    logger.error('Failed to capture error', {
      originalError: error.message,
      captureError
    });
    return undefined;
  }
}

/**
 * Capture message with context
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' | 'fatal' = 'info',
  context: ErrorContext = {}
): string | undefined {
  try {
    logger.info('Message captured', {
      message,
      level,
      ...context
    });

    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      return Sentry.withScope(scope => {
        // Set context
        if (context.userId) {
          scope.setUser({ id: context.userId });
        }

        // Set tags
        Object.entries(context).forEach(([key, value]) => {
          if (value && typeof value === 'string') {
            scope.setTag(key, value);
          }
        });

        scope.setContext('message_context', {
          ...context,
          timestamp: new Date().toISOString()
        });

        return Sentry.captureMessage(message, level);
      });
    }

    return undefined;

  } catch (error) {
    logger.error('Failed to capture message', { error, originalMessage: message });
    return undefined;
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string = 'custom',
  level: 'debug' | 'info' | 'warning' | 'error' | 'fatal' = 'info',
  data: Record<string, any> = {}
): void {
  try {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.addBreadcrumb({
        message,
        category,
        level,
        data: {
          ...data,
          timestamp: new Date().toISOString()
        }
      });
    }

    logger.debug('Breadcrumb added', {
      message,
      category,
      level,
      data
    });

  } catch (error) {
    logger.debug('Failed to add breadcrumb', { error, message });
  }
}

/**
 * Set user context for error tracking
 */
export function setUserContext(user: {
  id: string;
  email?: string;
  username?: string;
  subscription?: string;
}): void {
  try {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.setUser(user);
    }

    logger.debug('User context set', {
      userId: user.id,
      hasEmail: !!user.email,
      subscription: user.subscription
    });

  } catch (error) {
    logger.debug('Failed to set user context', { error });
  }
}

/**
 * Clear user context
 */
export function clearUserContext(): void {
  try {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.setUser(null);
    }

    logger.debug('User context cleared');

  } catch (error) {
    logger.debug('Failed to clear user context', { error });
  }
}

/**
 * Start performance transaction
 */
export function startTransaction(
  name: string,
  operation: string,
  description?: string
): any {
  try {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      return Sentry.startTransaction({
        name,
        op: operation,
        description,
        tags: {
          environment: process.env.NODE_ENV
        }
      });
    }

    return null;

  } catch (error) {
    logger.debug('Failed to start transaction', { error, name, operation });
    return null;
  }
}

/**
 * Capture performance timing
 */
export function capturePerformance(
  name: string,
  duration: number,
  context: Record<string, any> = {}
): void {
  try {
    // Log performance locally
    logger.debug('Performance captured', {
      name,
      duration,
      ...context
    });

    // Add breadcrumb for performance tracking
    addBreadcrumb(
      `Performance: ${name}`,
      'performance',
      'info',
      {
        duration,
        ...context
      }
    );

  } catch (error) {
    logger.debug('Failed to capture performance', { error, name, duration });
  }
}

/**
 * Error boundary helper for React components
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>
) {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return Sentry.withErrorBoundary(Component, {
      fallback: fallback || (({ error, resetError }) => (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>{error.message}</p>
          <button onClick={resetError}>Try again</button>
        </div>
      )),
      beforeCapture: (scope, error, errorInfo) => {
        scope.setTag('errorBoundary', true);
        scope.setContext('errorInfo', errorInfo);
      }
    });
  }

  return Component;
}

// Helper functions

function mapSeverityToSentryLevel(severity: ErrorMetadata['severity']): Sentry.SeverityLevel {
  switch (severity) {
    case 'low': return 'info';
    case 'medium': return 'warning';
    case 'high': return 'error';
    case 'critical': return 'fatal';
    default: return 'error';
  }
}

// Export convenience functions
export const trackErrorEvent = captureError;
export const trackMessageEvent = captureMessage;
export const trackBreadcrumb = addBreadcrumb;
export const trackPerformance = capturePerformance;
