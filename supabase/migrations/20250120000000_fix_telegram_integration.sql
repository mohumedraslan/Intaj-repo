-- Fix Telegram integration schema issues
BEGIN;

-- Ensure connections table has all required columns
ALTER TABLE connections
  ADD COLUMN IF NOT EXISTS webhook_url TEXT,
  ADD COLUMN IF NOT EXISTS webhook_set_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS credentials JSONB;

-- Create index for faster Telegram message lookups
CREATE INDEX IF NOT EXISTS idx_messages_telegram ON messages(platform, chat_id) 
  WHERE platform = 'telegram';

-- Add RLS policies for connections table
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their connections" ON connections
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMIT;
