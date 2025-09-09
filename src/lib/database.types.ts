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
      activity_log: {
        Row: {
          id: string
          user_id: string
          type: string
          message: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          message: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          message?: string
          metadata?: Json | null
          created_at?: string
        }
      }
      bot_metrics: {
        Row: {
          id: string
          chatbot_id: string
          date: string
          conversation_count: number
          message_count: number
          avg_response_time: number
          avg_rating: number | null
          unique_users: number
        }
        Insert: {
          id?: string
          chatbot_id: string
          date: string
          conversation_count?: number
          message_count?: number
          avg_response_time?: number
          avg_rating?: number | null
          unique_users?: number
        }
        Update: {
          id?: string
          chatbot_id?: string
          date?: string
          conversation_count?: number
          message_count?: number
          avg_response_time?: number
          avg_rating?: number | null
          unique_users?: number
        }
      }
      chatbots: {
        Row: {
          id: string
          user_id: string
          name: string
          model: string
          settings: Json | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          model: string
          settings?: Json | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          model?: string
          settings?: Json | null
          status?: string
          created_at?: string
        }
      }
      conversation_ratings: {
        Row: {
          id: string
          conversation_id: string
          rating: number
          feedback: string | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          rating: number
          feedback?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          rating?: number
          feedback?: string | null
          created_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          chatbot_id: string
          user_session_id: string
          started_at: string
          ended_at: string | null
          message_count: number
          status: string
          metadata: Json | null
        }
        Insert: {
          id?: string
          chatbot_id: string
          user_session_id: string
          started_at?: string
          ended_at?: string | null
          message_count?: number
          status?: string
          metadata?: Json | null
        }
        Update: {
          id?: string
          chatbot_id?: string
          user_session_id?: string
          started_at?: string
          ended_at?: string | null
          message_count?: number
          status?: string
          metadata?: Json | null
        }
      }
      message_metrics: {
        Row: {
          id: string
          conversation_id: string
          message_id: string
          response_time: number
          token_count: number
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          message_id: string
          response_time: number
          token_count: number
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          message_id?: string
          response_time?: number
          token_count?: number
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          name: string | null
          email: string
          subscription: string
          created_at: string
        }
        Insert: {
          id?: string
          name?: string | null
          email: string
          subscription?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          email?: string
          subscription?: string
          created_at?: string
        }
      }
      user_metrics: {
        Row: {
          id: string
          user_id: string
          date: string
          active_bots: number
          total_conversations: number
          total_messages: number
          data_usage: number
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          active_bots?: number
          total_conversations?: number
          total_messages?: number
          data_usage?: number
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          active_bots?: number
          total_conversations?: number
          total_messages?: number
          data_usage?: number
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
