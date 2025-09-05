-- Supabase function to increment usage (idempotent upsert)
CREATE OR REPLACE FUNCTION increment_usage(user_id uuid, month text)
RETURNS void AS $$
BEGIN
  INSERT INTO usage_metrics (user_id, month, message_count)
  VALUES (user_id, month, 1)
  ON CONFLICT (user_id, month)
  DO UPDATE SET message_count = usage_metrics.message_count + 1;
END;
$$ LANGUAGE plpgsql;
