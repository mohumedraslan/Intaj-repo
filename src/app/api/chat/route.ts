import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { RateLimiter } from '@/lib/rateLimiter'

const rateLimiter = new RateLimiter(supabase)

export async function POST(request: Request) {
  try {
    const { userId, message } = await request.json()

    // 1. Check API rate limit
    if (!(await rateLimiter.canMakeApiCall(userId))) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    // 2. Check message limit
    if (!(await rateLimiter.canSendMessage(userId))) {
      return NextResponse.json(
        { error: 'Message limit exceeded. Please upgrade your plan for more messages.' },
        { status: 429 }
      )
    }

    // Your existing chat logic here
    // ... (handling the message)

    // 3. Record the usage after successful operation
    await rateLimiter.recordUsage(userId, 'message')
    await rateLimiter.recordUsage(userId, 'api')

    // 4. Get any notifications for the user
    const notifications = await rateLimiter.getNotifications(userId)

    return NextResponse.json({
      success: true,
      notifications // Will show upgrade prompts or usage warnings
    })

  } catch (error) {
    console.error('Chat API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
