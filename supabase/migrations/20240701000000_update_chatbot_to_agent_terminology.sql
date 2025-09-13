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

-- Update onboarding steps in profiles
UPDATE profiles
SET onboarding_steps = jsonb_set(
  onboarding_steps,
  '{created_first_agent}',
  onboarding_steps->'created_first_chatbot'
)
WHERE onboarding_steps ? 'created_first_chatbot';

UPDATE profiles
SET onboarding_steps = onboarding_steps - 'created_first_chatbot'
WHERE onboarding_steps ? 'created_first_chatbot';

-- Rename function
CREATE OR REPLACE FUNCTION public.get_top_agents()
 RETURNS TABLE(id uuid, name text, description text, avatar_url text, user_id uuid, created_at timestamp with time zone, updated_at timestamp with time zone, settings jsonb, base_prompt text, model text)
 LANGUAGE sql
AS $function$
  SELECT * FROM agents
  ORDER BY created_at DESC
  LIMIT 10;
$function$;

-- Drop old function if it exists
DROP FUNCTION IF EXISTS public.get_top_chatbots();