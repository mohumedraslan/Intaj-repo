export interface Database {
  public: {
    Tables: {
      conversations: {
        Row: {
          id: string;
          created_at?: string;
          platform: 'whatsapp' | 'facebook' | 'instagram' | 'web';
          status: 'active' | 'closed';
          user_id: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          platform: 'whatsapp' | 'facebook' | 'instagram' | 'web';
          status?: 'active' | 'closed';
          user_id: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          platform?: 'whatsapp' | 'facebook' | 'instagram' | 'web';
          status?: 'active' | 'closed';
          user_id?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          created_at?: string;
          conversation_id: string;
          content: string;
          role: 'user' | 'assistant';
        };
        Insert: {
          id?: string;
          created_at?: string;
          conversation_id: string;
          content: string;
          role: 'user' | 'assistant';
        };
        Update: {
          id?: string;
          created_at?: string;
          conversation_id?: string;
          content?: string;
          role?: 'user' | 'assistant';
        };
      };
    };
  };
}
