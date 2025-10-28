-- Add 2FA columns to the profiles table
ALTER TABLE profiles
ADD COLUMN two_factor_secret TEXT,
ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN two_factor_backup_codes TEXT[];
