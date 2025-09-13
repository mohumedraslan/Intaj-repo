-- Fix Schema Issues Migration
-- This migration addresses the missing columns and tables identified in console logs

-- 1. Add missing columns to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES profiles(id) ON DELETE CASCADE;

-- 2. Create user_settings table (referenced in logs but missing)
CREATE TABLE IF NOT EXISTS user_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    onboarding_steps jsonb DEFAULT '{
        "created_first_agent": false,
        "added_data_source": false,
        "connected_channel": false,
        "has_dismissed": false
    }'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create user_2fa_secrets table (referenced in logs)
CREATE TABLE IF NOT EXISTS user_2fa_secrets (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    secret text NOT NULL,
    enabled boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Add missing columns to chatbots table
ALTER TABLE chatbots 
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS base_prompt text,
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- 5. Add missing columns to data_sources table  
ALTER TABLE data_sources
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS content text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

-- 6. Add missing columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_steps jsonb DEFAULT '{
    "created_first_agent": false,
    "added_data_source": false,
    "connected_channel": false,
    "has_dismissed": false
}'::jsonb;

-- 7. Enable Row Level Security (RLS) on new tables
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_2fa_secrets ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for user_settings
CREATE POLICY "Users can view own settings" ON user_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON user_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- 9. Create RLS policies for user_2fa_secrets
CREATE POLICY "Users can view own 2FA secrets" ON user_2fa_secrets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own 2FA secrets" ON user_2fa_secrets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own 2FA secrets" ON user_2fa_secrets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own 2FA secrets" ON user_2fa_secrets
    FOR DELETE USING (auth.uid() = user_id);

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_2fa_secrets_user_id ON user_2fa_secrets(user_id);
CREATE INDEX IF NOT EXISTS idx_data_sources_user_id ON data_sources(user_id);

-- 11. Update existing data_sources records to have user_id
UPDATE data_sources 
SET user_id = chatbots.user_id 
FROM chatbots 
WHERE data_sources.chatbot_id = chatbots.id 
AND data_sources.user_id IS NULL;

-- 12. Update existing messages records to have user_id
UPDATE messages 
SET user_id = chatbots.user_id 
FROM chatbots 
WHERE messages.chatbot_id = chatbots.id 
AND messages.user_id IS NULL;
