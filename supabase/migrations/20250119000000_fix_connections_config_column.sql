-- Fix connections table to use 'config' column instead of 'credentials'
-- This aligns with the codebase expectations

-- Add config column if it doesn't exist
ALTER TABLE connections 
ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb;

-- Migrate data from credentials to config if credentials exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'connections' 
        AND column_name = 'credentials'
    ) THEN
        -- Copy data from credentials to config
        UPDATE connections 
        SET config = credentials 
        WHERE config = '{}'::jsonb AND credentials IS NOT NULL;
        
        -- Drop the credentials column
        ALTER TABLE connections DROP COLUMN IF EXISTS credentials;
    END IF;
END $$;

-- Ensure other required columns exist
ALTER TABLE connections 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'error'));

ALTER TABLE connections 
ADD COLUMN IF NOT EXISTS name TEXT;

ALTER TABLE connections 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();

ALTER TABLE connections 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add agent_id column if it doesn't exist (should already exist from previous migrations)
ALTER TABLE connections 
ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agents(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);
CREATE INDEX IF NOT EXISTS idx_connections_agent_id ON connections(agent_id);
CREATE INDEX IF NOT EXISTS idx_connections_platform ON connections(platform);
CREATE INDEX IF NOT EXISTS idx_connections_user_id ON connections(user_id);

-- Update existing records to have proper status
UPDATE connections SET status = 'active' WHERE status IS NULL;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_connections_updated_at ON connections;
CREATE TRIGGER update_connections_updated_at
    BEFORE UPDATE ON connections
    FOR EACH ROW
    EXECUTE FUNCTION update_connections_updated_at();

-- Ensure RLS is enabled
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

-- Update RLS policies to be more specific
DROP POLICY IF EXISTS "Users can view their own connections" ON connections;
DROP POLICY IF EXISTS "Users can create their own connections" ON connections;
DROP POLICY IF EXISTS "Users can update their own connections" ON connections;
DROP POLICY IF EXISTS "Users can delete their own connections" ON connections;

-- Recreate RLS policies with proper names
CREATE POLICY "connections_select_policy" 
  ON connections 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "connections_insert_policy" 
  ON connections 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "connections_update_policy" 
  ON connections 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "connections_delete_policy" 
  ON connections 
  FOR DELETE 
  USING (auth.uid() = user_id);
