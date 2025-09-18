-- Fix connections table schema to add missing status column and other required fields

-- Add status column if it doesn't exist
ALTER TABLE connections 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'error'));

-- Add credentials column if it doesn't exist
ALTER TABLE connections 
ADD COLUMN IF NOT EXISTS credentials JSONB DEFAULT '{}'::jsonb;

-- Add agent_id column if it doesn't exist (renamed from chatbot_id)
ALTER TABLE connections 
ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agents(id) ON DELETE CASCADE;

-- Update existing data to have proper status
UPDATE connections SET status = 'active' WHERE status IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);
CREATE INDEX IF NOT EXISTS idx_connections_agent_id ON connections(agent_id);
CREATE INDEX IF NOT EXISTS idx_connections_platform ON connections(platform);

-- Update RLS policies
DROP POLICY IF EXISTS "Users can view their own connections" ON connections;
DROP POLICY IF EXISTS "Users can create their own connections" ON connections;
DROP POLICY IF EXISTS "Users can update their own connections" ON connections;
DROP POLICY IF EXISTS "Users can delete their own connections" ON connections;

-- Recreate RLS policies
CREATE POLICY "Users can view their own connections" 
  ON connections 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own connections" 
  ON connections 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connections" 
  ON connections 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connections" 
  ON connections 
  FOR DELETE 
  USING (auth.uid() = user_id);
