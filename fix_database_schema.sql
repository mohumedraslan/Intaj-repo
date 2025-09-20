-- =====================================================
-- FIX DATABASE SCHEMA - Run this in Supabase SQL Editor
-- =====================================================

-- 1. Add missing credentials column to connections table
ALTER TABLE connections 
ADD COLUMN IF NOT EXISTS credentials JSONB DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN connections.credentials IS 'Encrypted credentials for platform integrations (tokens, keys, etc.)';

-- Update existing connections to have empty credentials object
UPDATE connections 
SET credentials = '{}' 
WHERE credentials IS NULL;

-- Create index for better performance on credentials queries
CREATE INDEX IF NOT EXISTS idx_connections_credentials ON connections USING GIN (credentials);

-- 2. Ensure config column has proper default
ALTER TABLE connections 
ALTER COLUMN config SET DEFAULT '{}';

-- Update any NULL config values
UPDATE connections 
SET config = '{}' 
WHERE config IS NULL;

-- 3. Add missing columns to messages table if they don't exist
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS platform VARCHAR(50),
ADD COLUMN IF NOT EXISTS platform_message_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS sender_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS chat_id VARCHAR(255);

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_agent_platform ON messages(agent_id, platform);
CREATE INDEX IF NOT EXISTS idx_messages_platform_chat ON messages(platform, chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_status_direction ON messages(status, direction);

-- 5. Add missing columns to conversations table if they don't exist
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS platform VARCHAR(50),
ADD COLUMN IF NOT EXISTS platform_user_id VARCHAR(255);

-- 6. Create indexes for conversations
CREATE INDEX IF NOT EXISTS idx_conversations_platform_user ON conversations(platform, platform_user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_agent_platform ON conversations(agent_id, platform);

-- 7. Ensure RLS policies are in place
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can access their own connections" ON connections;
DROP POLICY IF EXISTS "Users can access their own messages" ON messages;
DROP POLICY IF EXISTS "Users can access their own conversations" ON conversations;

-- Create new RLS policies
CREATE POLICY "Users can access their own connections" 
ON connections FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Users can access their own messages" 
ON messages FOR ALL 
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can access their own conversations" 
ON conversations FOR ALL 
USING (auth.uid() = user_id OR user_id IS NULL);

-- 8. Enable RLS on all tables
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- 9. Create agent RLS policy if it doesn't exist
DROP POLICY IF EXISTS "Users can access their own agents" ON agents;
CREATE POLICY "Users can access their own agents" 
ON agents FOR ALL 
USING (auth.uid() = user_id);

-- Success message
SELECT 'Database schema updated successfully! All missing columns and indexes have been added.' as result;
