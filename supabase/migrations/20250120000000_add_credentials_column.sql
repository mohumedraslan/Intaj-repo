-- Add credentials column to connections table
-- This stores encrypted credentials for integrations

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

-- Add RLS policy for credentials access
DROP POLICY IF EXISTS "Users can access their own connection credentials" ON connections;
CREATE POLICY "Users can access their own connection credentials" 
ON connections FOR ALL 
USING (auth.uid() = user_id);

-- Ensure the config column exists and has proper structure
ALTER TABLE connections 
ALTER COLUMN config SET DEFAULT '{}';

-- Update any NULL config values
UPDATE connections 
SET config = '{}' 
WHERE config IS NULL;
