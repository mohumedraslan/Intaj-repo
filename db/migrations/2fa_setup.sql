-- Add 2FA fields to profiles table
ALTER TABLE IF EXISTS profiles
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS two_factor_secret TEXT,
ADD COLUMN IF NOT EXISTS two_factor_backup_codes TEXT[],
ADD COLUMN IF NOT EXISTS two_factor_recovery_codes TEXT[];

-- Create table for temporary 2FA setup tokens
CREATE TABLE IF NOT EXISTS two_factor_setup (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) NOT NULL,
    secret TEXT NOT NULL,
    qr_code TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '10 minutes'
);

-- Create index for cleanup
CREATE INDEX IF NOT EXISTS idx_two_factor_setup_expires ON two_factor_setup(expires_at);

-- Function to clean up expired setup tokens
CREATE OR REPLACE FUNCTION cleanup_expired_2fa_setup()
RETURNS void AS $$
BEGIN
    DELETE FROM two_factor_setup
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
