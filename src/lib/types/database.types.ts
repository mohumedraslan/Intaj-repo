export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      chatbots: {
        Row: {
          id: string
          created_at: string
          owner_id: string
          name: string
          description: string
          status: 'active' | 'inactive' | 'deleted'
          model: string
          settings: Json
        }
        Insert: {
          id?: string
          created_at?: string
          owner_id: string
          name: string
          description?: string
          status?: 'active' | 'inactive' | 'deleted'
          model?: string
          settings?: Json
        }
        Update: {
          id?: string
          created_at?: string
          owner_id?: string
          name?: string
          description?: string
          status?: 'active' | 'inactive' | 'deleted'
          model?: string
          settings?: Json
        }
      }
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          full_name: string | null
          avatar_url: string | null
          subscription_tier: 'free' | 'pro' | 'enterprise'
          subscription_status: 'active' | 'canceled' | 'past_due'
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
          full_name?: string | null
          avatar_url?: string | null
          subscription_tier?: 'free' | 'pro' | 'enterprise'
          subscription_status?: 'active' | 'canceled' | 'past_due'
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          full_name?: string | null
          avatar_url?: string | null
          subscription_tier?: 'free' | 'pro' | 'enterprise'
          subscription_status?: 'active' | 'canceled' | 'past_due'
        }
      }
      conversations: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          chatbot_id: string
          user_id: string | null
          channel: string
          status: 'active' | 'archived' | 'deleted'
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          chatbot_id: string
          user_id?: string | null
          channel: string
          status?: 'active' | 'archived' | 'deleted'
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          chatbot_id?: string
          user_id?: string | null
          channel?: string
          status?: 'active' | 'archived' | 'deleted'
        }
      }
    }
  }
}
