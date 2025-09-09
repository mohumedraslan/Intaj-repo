import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { RateLimiter } from '@/lib/rateLimiter'

const rateLimiter = new RateLimiter(supabase)

export async function POST(request: Request) {
  try {
    const { userId, file } = await request.json()
    const fileSize = file.size // in bytes

    // 1. Check API rate limit
    if (!(await rateLimiter.canMakeApiCall(userId))) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    // 2. Check file upload limits
    if (!(await rateLimiter.canUploadFile(userId, fileSize))) {
      return NextResponse.json(
        { error: 'File upload limit exceeded. Please upgrade your plan for more storage.' },
        { status: 429 }
      )
    }

    // Your existing file upload logic here
    // ... (handling the file upload)

    // 3. Record the usage after successful upload
    await rateLimiter.recordUsage(userId, 'file', fileSize)
    await rateLimiter.recordUsage(userId, 'api')

    // 4. Get any notifications for the user
    const notifications = await rateLimiter.getNotifications(userId)

    return NextResponse.json({
      success: true,
      notifications // Will show upgrade prompts or usage warnings
    })

  } catch (error) {
    console.error('Upload API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
