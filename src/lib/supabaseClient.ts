// src/lib/supabaseClient.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from './types';

export function createClient() {
  return createClientComponentClient<Database>();
}
