export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          email: string
          subscription: string
          created_at: string
        }
        Insert: {
          id: string
          name: string
          email: string
          subscription?: string
          created_at?: string
        }
      }
      chatbots: {
        Row: {
          id: string
          user_id: string
          name: string
          model: string
          settings: any
          active: boolean
          created_at: string
        }
      }
      messages: {
        Row: {
          id: string
          chatbot_id: string
          user_id: string
          role: string
          content: string
          platform: string
          created_at: string
        }
      }
      api_usage: {
        Row: {
          id: string
          user_id: string
          total_calls: number
          monthly_limit: number
          total_cost: number
          api_cost: number
          created_at: string
          updated_at: string
        }
      }
      performance_metrics: {
        Row: {
          id: string
          metric_type: string
          value: number
          timestamp: string
        }
      }
    }
  }
}
