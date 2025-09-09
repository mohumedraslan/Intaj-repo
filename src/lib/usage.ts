// src/lib/usage.ts
import { supabase } from './storageClient';

const FREE_TIER_LIMIT = 500;

export async function incrementUsage(userId: string) {
  const month = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  // Upsert usage row
  const { data, error } = await supabase.rpc('increment_usage', { user_id: userId, month });
  if (error) throw error;
  return data;
}

export async function checkUsageLimit(userId: string): Promise<boolean> {
  const month = new Date().toISOString().slice(0, 7);
  const { data, error } = await supabase
    .from('usage_metrics')
    .select('message_count')
    .eq('user_id', userId)
    .eq('month', month)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  const count = data?.message_count || 0;
  return count < FREE_TIER_LIMIT;
}
