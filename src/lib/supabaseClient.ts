import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from './types/database.types'

export const supabase = createClientComponentClient<Database>()

// Export createClient for compatibility with existing imports
export const createClient = () => createClientComponentClient<Database>()
