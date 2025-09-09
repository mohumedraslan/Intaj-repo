import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

interface RateLimitConfig {
  apiRateLimit: number      // Requests per minute
  dailyMessageLimit: number
  monthlyMessageLimit: number
  fileUploadLimit: number   // MB per month
  fileSizeLimit: number     // MB per file
  maxChatbots: number
}

interface UsageMetrics {
  apiCallsCount: number
  dailyMessagesCount: number
  monthlyMessagesCount: number
  fileUploadTotal: number   // In bytes
}

export class RateLimiter {
  private supabase: ReturnType<typeof createClient<Database>>
  private cache: Map<string, { count: number; resetTime: number }> = new Map()

  constructor(supabaseClient: ReturnType<typeof createClient<Database>>) {
    this.supabase = supabaseClient
  }

  // Check if user can make API call
  async canMakeApiCall(userId: string): Promise<boolean> {
    // First check cache to avoid database hits
    const cacheKey = `api:${userId}`
    const cached = this.cache.get(cacheKey)
    const now = Date.now()

    if (cached && now < cached.resetTime) {
      if (cached.count >= await this.getTierLimit(userId, 'apiRateLimit')) {
        return false
      }
      cached.count++
      return true
    }

    // Cache miss or expired, check database
    const { data: usage } = await this.supabase
      .rpc('check_api_rate_limit', { user_id_param: userId })

    // Update cache
    this.cache.set(cacheKey, {
      count: 1,
      resetTime: now + 60000 // 1 minute
    })

    return usage || false
  }

  // Check if user can send message
  async canSendMessage(userId: string): Promise<boolean> {
    const { data: usage } = await this.supabase
      .from('user_usage')
      .select('daily_messages_count, monthly_messages_count')
      .eq('user_id', userId)
      .single()

    if (!usage) return false

    const limits = await this.getTierLimits(userId)
    
    return usage.daily_messages_count < limits.dailyMessageLimit &&
           usage.monthly_messages_count < limits.monthlyMessageLimit
  }

  // Check if user can upload file
  async canUploadFile(userId: string, fileSize: number): Promise<boolean> {
    const { data: usage } = await this.supabase
      .from('user_usage')
      .select('file_upload_total')
      .eq('user_id', userId)
      .single()

    if (!usage) return false

    const limits = await this.getTierLimits(userId)
    
    return fileSize <= limits.fileSizeLimit * 1024 * 1024 && // Convert MB to bytes
           usage.file_upload_total + fileSize <= limits.fileUploadLimit * 1024 * 1024
  }

  // Record usage
  async recordUsage(userId: string, type: 'api' | 'message' | 'file', amount: number = 1): Promise<void> {
    const updates: Partial<Record<keyof UsageMetrics, number>> = {}
    
    switch (type) {
      case 'api':
        updates.apiCallsCount = amount
        break
      case 'message':
        updates.dailyMessagesCount = amount
        updates.monthlyMessagesCount = amount
        break
      case 'file':
        updates.fileUploadTotal = amount
        break
    }

    await this.supabase
      .from('user_usage')
      .upsert({
        user_id: userId,
        ...updates,
        updated_at: new Date().toISOString()
      })

    // Check limits and create notifications if needed
    await this.checkAndNotifyLimits(userId)
  }

  // Get user's subscription tier limits
  private async getTierLimits(userId: string): Promise<RateLimitConfig> {
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('subscription')
      .eq('id', userId)
      .single()

    if (!profile) throw new Error('User not found')

    const { data: tierLimits } = await this.supabase
      .from('subscription_tiers')
      .select('*')
      .eq('name', profile.subscription)
      .single()

    if (!tierLimits) throw new Error('Subscription tier not found')

    return {
      apiRateLimit: tierLimits.api_rate_limit,
      dailyMessageLimit: tierLimits.daily_message_limit,
      monthlyMessageLimit: tierLimits.monthly_message_limit,
      fileUploadLimit: tierLimits.file_upload_limit,
      fileSizeLimit: tierLimits.file_size_limit,
      maxChatbots: tierLimits.max_chatbots
    }
  }

  // Get specific tier limit
  private async getTierLimit(userId: string, limit: keyof RateLimitConfig): Promise<number> {
    const limits = await this.getTierLimits(userId)
    return limits[limit]
  }

  // Check limits and create notifications
  private async checkAndNotifyLimits(userId: string): Promise<void> {
    await this.supabase.rpc('check_and_notify_limits')
  }

  // Get user's current usage metrics
  async getUsageMetrics(userId: string): Promise<UsageMetrics> {
    const { data } = await this.supabase
      .from('user_usage')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (!data) throw new Error('Usage metrics not found')

    return {
      apiCallsCount: data.api_calls_count,
      dailyMessagesCount: data.daily_messages_count,
      monthlyMessagesCount: data.monthly_messages_count,
      fileUploadTotal: data.file_upload_total
    }
  }

  // Get user's notifications
  async getNotifications(userId: string): Promise<Array<{ type: string, message: string }>> {
    const { data } = await this.supabase
      .from('usage_notifications')
      .select('type, message')
      .eq('user_id', userId)
      .eq('seen', false)
      .order('created_at', { ascending: false })

    return data || []
  }
}
