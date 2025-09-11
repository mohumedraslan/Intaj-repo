-- Migration to add encrypted credentials column to connections table

-- First, check if the credentials column already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'connections' 
        AND column_name = 'credentials'
    ) THEN
        -- Add the credentials column if it doesn't exist
        ALTER TABLE connections ADD COLUMN credentials TEXT;
        
        -- Update comment to explain encryption requirement
        COMMENT ON COLUMN connections.credentials IS 'Encrypted credentials for platform authentication (API keys, OAuth tokens). Must be encrypted using the encryption utility before storage.';
    END IF;
END
$$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_connections_platform ON connections(platform);