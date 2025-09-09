import { Database } from '@/types/supabase'

// Add these types to your supabase.ts types file

export interface Tables {
  subscription_tiers: {
    Row: {
      id: string
      name: string
      api_rate_limit: number
      daily_message_limit: number
      monthly_message_limit: number
      file_upload_limit: number
      file_size_limit: number
      max_chatbots: number
      price: number
      created_at: string
    }
  }
  user_usage: {
    Row: {
      id: string
      user_id: string
      api_calls_count: number
      api_calls_last_reset: string
      daily_messages_count: number
      daily_messages_last_reset: string
      monthly_messages_count: number
      monthly_messages_last_reset: string
      file_upload_total: number
      file_upload_last_reset: string
      created_at: string
      updated_at: string
    }
    Insert: {
      user_id: string
      api_calls_count?: number
      daily_messages_count?: number
      monthly_messages_count?: number
      file_upload_total?: number
      updated_at: string
    }
  }
  usage_notifications: {
    Row: {
      id: string
      user_id: string
      type: string
      message: string
      seen: boolean
      created_at: string
    }
  }
}
