import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { ErrorHandler } from '@/lib/errorHandler'
import { supabase } from '@/lib/supabaseClient'

const errorHandler = new ErrorHandler(supabase)

// Global error wrapper for API routes
export async function withErrorHandling(
  req: Request,
  handler: (req: Request) => Promise<Response>
): Promise<Response> {
  try {
    return await handler(req)
  } catch (error) {
    if (error instanceof Error) {
      // Log the error
      await errorHandler.logError(error, {
        url: req.url,
        method: req.method,
        headers: Object.fromEntries(headers()),
      })

      // Attempt auto-recovery
      const recovered = await errorHandler.attemptRecovery(error)
      if (recovered) {
        // Retry the operation once if recovery was successful
        try {
          return await handler(req)
        } catch (retryError) {
          if (retryError instanceof Error) {
            await errorHandler.logError(retryError, { retryAfterRecovery: true })
          }
        }
      }

      // Return appropriate error response
      return NextResponse.json(
        { 
          error: errorHandler.getUserFriendlyMessage(error),
          code: getErrorStatusCode(error)
        },
        { status: getErrorStatusCode(error) }
      )
    }

    // Unknown error type
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// Helper to determine HTTP status code from error
function getErrorStatusCode(error: Error): number {
  switch (error.name) {
    case 'AuthenticationError':
      return 401
    case 'AuthorizationError':
      return 403
    case 'NotFoundError':
      return 404
    case 'ValidationError':
      return 400
    case 'RateLimitError':
      return 429
    case 'DatabaseError':
      return 503
    default:
      return 500
  }
}
