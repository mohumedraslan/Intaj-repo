import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from '../types/database.types';

export const createClient = () => {
  return createServerComponentClient<Database>({ cookies });
};

// For API routes that need to handle Bearer tokens
export const createApiClient = (request: Request) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  // Extract token from request
  const authHeader = request.headers.get('Authorization');
  const authToken = authHeader?.replace('Bearer ', '') || '';
  
  console.log('createApiClient Debug:', {
    hasAuthHeader: !!authHeader,
    tokenLength: authToken.length,
    tokenPreview: authToken.substring(0, 50) + '...'
  });
  
  const client = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    }
  });

  return client;
};