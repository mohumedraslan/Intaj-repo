import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

interface ErrorLogEntry {
  id: string
  error_type: string
  message: string
  stack_trace?: string
  metadata: Record<string, any>
  resolved: boolean
  created_at: string
}

interface RetryConfig {
  maxAttempts: number
  initialDelay: number
  maxDelay: number
  backoffFactor: number
}

export class ErrorHandler {
  private supabase: ReturnType<typeof createClient<Database>>
  private defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    initialDelay: 1000, // 1 second
    maxDelay: 10000,    // 10 seconds
    backoffFactor: 2
  }

  constructor(supabaseClient: ReturnType<typeof createClient<Database>>) {
    this.supabase = supabaseClient
  }

  // Log error to database and external service
  async logError(error: Error, metadata: Record<string, any> = {}) {
    try {
      const errorEntry = {
        error_type: error.name,
        message: error.message,
        stack_trace: error.stack,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV
        },
        resolved: false
      }

      // Log to Supabase
      await this.supabase
        .from('error_logs')
        .insert(errorEntry)

      // Could add external logging service here (e.g., Sentry)
      
      console.error('Error logged:', {
        type: error.name,
        message: error.message,
        metadata
      })
    } catch (loggingError) {
      // Fallback to console if database logging fails
      console.error('Error logging failed:', loggingError)
      console.error('Original error:', error)
    }
  }

  // Retry mechanism with exponential backoff
  async retry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const retryConfig = { ...this.defaultRetryConfig, ...config }
    let lastError: Error
    let delay = retryConfig.initialDelay

    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        return await operation()
      } catch (error: any) {
        lastError = error
        
        // Log each retry attempt
        await this.logError(error, {
          attempt,
          maxAttempts: retryConfig.maxAttempts,
          operation: operation.name
        })

        // Check if we should retry based on error type
        if (!this.isRetryableError(error) || attempt === retryConfig.maxAttempts) {
          throw error
        }

        // Wait with exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay))
        delay = Math.min(delay * retryConfig.backoffFactor, retryConfig.maxDelay)
      }
    }

    throw lastError!
  }

  // Check if error is retryable
  private isRetryableError(error: any): boolean {
    // Network errors
    if (error.name === 'NetworkError' || error.name === 'TimeoutError') {
      return true
    }

    // Database connection errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return true
    }

    // Rate limiting errors (retry after backoff)
    if (error.status === 429) {
      return true
    }

    // Supabase specific errors
    if (error.code === 'PGRST116' || error.code === 'PGRST012') {
      return true
    }

    return false
  }

  // Handle database fallback
  async withDatabaseFallback<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>
  ): Promise<T> {
    try {
      return await this.retry(primaryOperation)
    } catch (error: any) {
      await this.logError(error, { usedFallback: true })
      return fallbackOperation()
    }
  }

  // Notify users of errors
  async notifyUser(userId: string, error: Error, metadata: Record<string, any> = {}) {
    try {
      const notification = {
        user_id: userId,
        type: 'error',
        message: this.getUserFriendlyMessage(error),
        metadata: {
          error_type: error.name,
          ...metadata
        },
        seen: false
      }

      await this.supabase
        .from('user_notifications')
        .insert(notification)
    } catch (notificationError) {
      await this.logError(notificationError, {
        context: 'User notification failed',
        originalError: error
      })
    }
  }

  // Convert technical errors to user-friendly messages
  private getUserFriendlyMessage(error: Error): string {
    switch (error.name) {
      case 'NetworkError':
        return 'Connection issue detected. Please check your internet connection.'
      case 'TimeoutError':
        return 'The request took too long. Please try again.'
      case 'AuthenticationError':
        return 'Your session has expired. Please sign in again.'
      case 'RateLimitError':
        return 'You\'ve reached the usage limit. Please try again later.'
      default:
        return 'An unexpected error occurred. Our team has been notified.'
    }
  }

  // Auto-recovery procedures
  async attemptRecovery(error: Error): Promise<boolean> {
    try {
      switch (error.name) {
        case 'AuthenticationError':
          return await this.refreshAuth()
        case 'ConnectionError':
          return await this.reconnectDatabase()
        case 'StorageError':
          return await this.cleanupStorage()
        default:
          return false
      }
    } catch (recoveryError) {
      await this.logError(recoveryError, {
        context: 'Recovery attempt failed',
        originalError: error
      })
      return false
    }
  }

  // Specific recovery procedures
  private async refreshAuth(): Promise<boolean> {
    try {
      await this.supabase.auth.refreshSession()
      return true
    } catch {
      return false
    }
  }

  private async reconnectDatabase(): Promise<boolean> {
    try {
      // Implement reconnection logic
      return true
    } catch {
      return false
    }
  }

  private async cleanupStorage(): Promise<boolean> {
    try {
      // Implement storage cleanup
      return true
    } catch {
      return false
    }
  }
}
