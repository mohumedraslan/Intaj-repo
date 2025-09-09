-- Two-Factor Authentication Setup for Intaj Platform
-- This file creates the necessary table and functions for 2FA

-- Create user_2fa_secrets table
CREATE TABLE IF NOT EXISTS user_2fa_secrets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  secret TEXT NOT NULL, -- Encrypted 2FA secret
  enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS (Row Level Security)
ALTER TABLE user_2fa_secrets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can only access their own 2FA secrets" ON user_2fa_secrets
  FOR ALL USING (auth.uid() = user_id);

-- Create function to check if user has 2FA enabled
CREATE OR REPLACE FUNCTION has_2fa_enabled(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_enabled BOOLEAN;
BEGIN
  SELECT enabled INTO is_enabled
  FROM user_2fa_secrets
  WHERE user_id = user_id_param;
  
  RETURN COALESCE(is_enabled, FALSE);
END;
$$;

-- Create function to get user's 2FA secret (for server-side verification)
CREATE OR REPLACE FUNCTION get_user_2fa_secret(user_id_param UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_secret TEXT;
BEGIN
  SELECT secret INTO user_secret
  FROM user_2fa_secrets
  WHERE user_id = user_id_param AND enabled = TRUE;
  
  RETURN user_secret;
END;
$$;

-- Create function to update 2FA status
CREATE OR REPLACE FUNCTION update_2fa_status(user_id_param UUID, enabled_param BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_2fa_secrets
  SET enabled = enabled_param, updated_at = NOW()
  WHERE user_id = user_id_param;
  
  RETURN FOUND;
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON user_2fa_secrets TO authenticated;
GRANT EXECUTE ON FUNCTION has_2fa_enabled(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_2fa_secret(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_2fa_status(UUID, BOOLEAN) TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_2fa_secrets_user_id ON user_2fa_secrets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_2fa_secrets_enabled ON user_2fa_secrets(enabled);
