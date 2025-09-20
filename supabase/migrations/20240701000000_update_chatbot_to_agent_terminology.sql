-- Migration to update 'chatbot' terminology to 'agent' in database schema

-- Rename the chatbots table to agents
ALTER TABLE chatbots RENAME TO agents;

-- Update references in data_sources table
ALTER TABLE data_sources RENAME COLUMN chatbot_id TO agent_id;
ALTER TABLE data_sources
  DROP CONSTRAINT IF EXISTS data_sources_chatbot_id_fkey,
  ADD CONSTRAINT data_sources_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE;

-- Update references in connections table
ALTER TABLE connections RENAME COLUMN chatbot_id TO agent_id;
ALTER TABLE connections
  DROP CONSTRAINT IF EXISTS connections_chatbot_id_fkey,
  ADD CONSTRAINT connections_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES agents(id);

-- Update index name
DROP INDEX IF EXISTS idx_connections_chatbot_id;
CREATE INDEX idx_connections_agent_id ON connections(agent_id);

-- Update storage bucket name
UPDATE storage.buckets SET name = 'agent-avatars', id = 'agent-avatars' WHERE id = 'chatbot-avatars';

-- Update RLS policies
DROP POLICY IF EXISTS "Users can view their own chatbots" ON agents;
CREATE POLICY "Users can view their own agents"
ON agents
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own chatbots" ON agents;
CREATE POLICY "Users can create their own agents"
ON agents
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own chatbots" ON agents;
CREATE POLICY "Users can update their own agents"
ON agents
FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own chatbots" ON agents;
CREATE POLICY "Users can delete their own agents"
ON agents
FOR DELETE
USING (auth.uid() = user_id);

-- Update onboarding steps in profiles (only if profiles table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'profiles' 
        AND table_schema = 'public'
    ) THEN
        -- Update onboarding steps to use agent terminology
        UPDATE profiles
        SET onboarding_steps = jsonb_set(
          COALESCE(onboarding_steps, '{}'::jsonb),
          '{created_first_agent}',
          COALESCE(onboarding_steps->'created_first_chatbot', 'true'::jsonb)
        )
        WHERE onboarding_steps ? 'created_first_chatbot';

        UPDATE profiles
        SET onboarding_steps = onboarding_steps - 'created_first_chatbot'
        WHERE onboarding_steps ? 'created_first_chatbot';
        
        RAISE NOTICE 'Updated onboarding steps in profiles table';
    ELSE
        RAISE NOTICE 'Profiles table does not exist, skipping onboarding steps update';
    END IF;
END $$;

-- Rename function - fix return type to match actual agents table structure
CREATE OR REPLACE FUNCTION public.get_top_agents()
 RETURNS TABLE(id uuid, user_id uuid, name text, description text, settings jsonb, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
AS $function$
  SELECT id, user_id, name, description, settings, created_at, updated_at 
  FROM agents
  ORDER BY created_at DESC
  LIMIT 10;
$function$;

-- Drop old function if it exists
DROP FUNCTION IF EXISTS public.get_top_chatbots();