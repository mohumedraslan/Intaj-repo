// src/lib/types.ts
// Supabase Database type for type safety (generated from your schema, simplified for MVP)
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          onboarded: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          onboarded?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          onboarded?: boolean;
          created_at?: string;
        };
      };
      chatbots: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          model: string;
          settings: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          model: string;
          settings?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          model?: string;
          settings?: Json;
          created_at?: string;
        };
      };
      // Add other tables as needed for MVP
    };
  };
}
