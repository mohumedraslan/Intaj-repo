import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

// Create DB tables for analytics
export const analyticsSchema = `
-- Analytics tables
CREATE TABLE api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  total_calls INT DEFAULT 0,
  monthly_limit INT DEFAULT 1000,
  total_cost DECIMAL(10,2) DEFAULT 0,
  api_cost DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_type TEXT NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Function to update usage
CREATE OR REPLACE FUNCTION update_api_usage()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO api_usage (user_id, total_calls)
  VALUES (NEW.user_id, 1)
  ON CONFLICT (user_id)
  DO UPDATE SET 
    total_calls = api_usage.total_calls + 1,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for message counts
CREATE TRIGGER update_usage_on_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_api_usage();
`

// Create analytics functions
export async function updatePerformanceMetrics(
  client: ReturnType<typeof createClient<Database>>,
  metricType: string,
  value: number
) {
  const { error } = await client
    .from('performance_metrics')
    .insert({
      metric_type: metricType,
      value
    })

  if (error) throw error
}

export async function getPerformanceMetrics(
  client: ReturnType<typeof createClient<Database>>,
  metricType: string,
  timeRange: string
) {
  const { data, error } = await client
    .from('performance_metrics')
    .select('*')
    .eq('metric_type', metricType)
    .gt('timestamp', timeRange)
    .order('timestamp', { ascending: true })

  if (error) throw error
  return data
}

export async function getApiUsage(
  client: ReturnType<typeof createClient<Database>>,
  userId: string
) {
  const { data, error } = await client
    .from('api_usage')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) throw error
  return data
}

export async function getMessageCountsByChannel(
  client: ReturnType<typeof createClient<Database>>,
  userId: string,
  timeRange: string
) {
  const { data, error } = await client
    .from('messages')
    .select('platform, count(*)')
    .eq('user_id', userId)
    .gt('created_at', timeRange)
    .group('platform')

  if (error) throw error
  return data
}
