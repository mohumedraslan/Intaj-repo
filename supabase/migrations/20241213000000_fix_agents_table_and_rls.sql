-- Fix agents table structure and add missing RLS policies
-- This migration works with existing agents table structure

-- Skip the rename logic since agents table already exists
-- Just ensure all foreign key references are correct

-- Ensure agents table has all required columns
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS base_prompt TEXT,
ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'gpt-4o',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create or update the updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;
CREATE TRIGGER update_agents_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on agents table
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own agents" ON agents;
DROP POLICY IF EXISTS "Users can create their own agents" ON agents;
DROP POLICY IF EXISTS "Users can update their own agents" ON agents;
DROP POLICY IF EXISTS "Users can delete their own agents" ON agents;

-- Create comprehensive RLS policies for agents
CREATE POLICY "Users can view their own agents"
ON agents
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own agents"
ON agents
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agents"
ON agents
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agents"
ON agents
FOR DELETE
USING (auth.uid() = user_id);

-- Create storage bucket for agent avatars if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('agent-avatars', 'agent-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for agent avatars
DROP POLICY IF EXISTS "Users can upload their own agent avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can view agent avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own agent avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own agent avatars" ON storage.objects;

CREATE POLICY "Users can upload their own agent avatars"
ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'agent-avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view agent avatars"
ON storage.objects
FOR SELECT
USING (bucket_id = 'agent-avatars');

CREATE POLICY "Users can update their own agent avatars"
ON storage.objects
FOR UPDATE
USING (
    bucket_id = 'agent-avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own agent avatars"
ON storage.objects
FOR DELETE
USING (
    bucket_id = 'agent-avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_created_at ON agents(created_at);
CREATE INDEX IF NOT EXISTS idx_agents_model ON agents(model);

-- Update any existing records to have default settings if null
UPDATE agents 
SET settings = '{"status": "active"}'::jsonb 
WHERE settings IS NULL OR settings = '{}'::jsonb;

-- Ensure model column has a default value for existing records
UPDATE agents 
SET model = 'gpt-4o' 
WHERE model IS NULL OR model = '';
