-- Comprehensive schema verification and fixes for Intaj platform
-- Run this in Supabase SQL Editor to ensure all tables and constraints exist

-- 1. Fix connections table to use 'config' column
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
        UPDATE connections 
        SET config = credentials 
        WHERE config = '{}'::jsonb AND credentials IS NOT NULL;
        
        ALTER TABLE connections DROP COLUMN IF EXISTS credentials;
    END IF;
END $$;

-- Ensure all required columns exist in connections
ALTER TABLE connections 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'error')),
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agents(id) ON DELETE CASCADE;

-- 2. Verify agents table has all required columns
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS base_prompt TEXT,
ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'gpt-4o',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS agent_type TEXT,
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- 3. Ensure conversations table exists with correct schema
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    connection_id UUID REFERENCES connections(id) ON DELETE CASCADE,
    chat_id TEXT,
    channel TEXT,
    status TEXT DEFAULT 'active',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    first_message_at TIMESTAMP WITH TIME ZONE,
    last_message_at TIMESTAMP WITH TIME ZONE
);

-- 4. Ensure messages table exists with unified schema
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    connection_id UUID REFERENCES connections(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    
    -- Unified fields (preferred)
    channel TEXT,
    direction TEXT CHECK (direction IN ('inbound', 'outbound')),
    role TEXT CHECK (role IN ('user', 'agent', 'system')),
    content_text TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    
    -- Legacy fields (fallback)
    platform TEXT,
    sender_type TEXT,
    sender_name TEXT,
    message_type TEXT DEFAULT 'text',
    content TEXT,
    
    -- Status and metadata
    status TEXT DEFAULT 'received',
    metadata JSONB DEFAULT '{}'::jsonb,
    chat_id TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    sent_at TIMESTAMP WITH TIME ZONE
);

-- 5. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);
CREATE INDEX IF NOT EXISTS idx_connections_agent_id ON connections(agent_id);
CREATE INDEX IF NOT EXISTS idx_connections_platform ON connections(platform);
CREATE INDEX IF NOT EXISTS idx_connections_user_id ON connections(user_id);

CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_created_at ON agents(created_at);
CREATE INDEX IF NOT EXISTS idx_agents_model ON agents(model);

CREATE INDEX IF NOT EXISTS idx_messages_agent_status ON messages(agent_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_direction ON messages(conversation_id, direction, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_channel_status ON messages(channel, status);
CREATE INDEX IF NOT EXISTS idx_messages_direction_status ON messages(direction, status);

CREATE INDEX IF NOT EXISTS idx_conversations_agent_status ON conversations(agent_id, status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_channel_chat ON conversations(channel, chat_id);

-- 6. Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;
DROP TRIGGER IF EXISTS update_connections_updated_at ON connections;
DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;

-- Create triggers
CREATE TRIGGER update_agents_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_connections_updated_at
    BEFORE UPDATE ON connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Enable RLS on all tables
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- 8. Create/update RLS policies for agents
DROP POLICY IF EXISTS "Users can view their own agents" ON agents;
DROP POLICY IF EXISTS "Users can create their own agents" ON agents;
DROP POLICY IF EXISTS "Users can update their own agents" ON agents;
DROP POLICY IF EXISTS "Users can delete their own agents" ON agents;

CREATE POLICY "Users can view their own agents"
ON agents FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own agents"
ON agents FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agents"
ON agents FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agents"
ON agents FOR DELETE USING (auth.uid() = user_id);

-- 9. Create/update RLS policies for connections
DROP POLICY IF EXISTS "connections_select_policy" ON connections;
DROP POLICY IF EXISTS "connections_insert_policy" ON connections;
DROP POLICY IF EXISTS "connections_update_policy" ON connections;
DROP POLICY IF EXISTS "connections_delete_policy" ON connections;

CREATE POLICY "connections_select_policy"
ON connections FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "connections_insert_policy"
ON connections FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "connections_update_policy"
ON connections FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "connections_delete_policy"
ON connections FOR DELETE USING (auth.uid() = user_id);

-- 10. Create/update RLS policies for messages
DROP POLICY IF EXISTS "messages_select_policy" ON messages;
DROP POLICY IF EXISTS "messages_write_policy" ON messages;
DROP POLICY IF EXISTS "messages_update_policy" ON messages;

CREATE POLICY "messages_select_policy"
ON messages FOR SELECT USING (
    (user_id = auth.uid()) OR 
    (EXISTS (SELECT 1 FROM agents a WHERE a.id = messages.agent_id AND a.user_id = auth.uid()))
);

CREATE POLICY "messages_write_policy"
ON messages FOR INSERT WITH CHECK (true); -- Allow system inserts

CREATE POLICY "messages_update_policy"
ON messages FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM agents a 
        JOIN connections c ON c.agent_id = a.id 
        WHERE c.id = messages.connection_id AND a.user_id = auth.uid()
    )
);

-- 11. Create/update RLS policies for conversations
DROP POLICY IF EXISTS "conversations_select_policy" ON conversations;
DROP POLICY IF EXISTS "conversations_write_policy" ON conversations;
DROP POLICY IF EXISTS "conversations_update_policy" ON conversations;

CREATE POLICY "conversations_select_policy"
ON conversations FOR SELECT USING (
    (user_id = auth.uid()) OR 
    (EXISTS (SELECT 1 FROM agents a WHERE a.id = conversations.agent_id AND a.user_id = auth.uid()))
);

CREATE POLICY "conversations_write_policy"
ON conversations FOR INSERT WITH CHECK (true); -- Allow system inserts

CREATE POLICY "conversations_update_policy"
ON conversations FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM agents a 
        JOIN connections c ON c.agent_id = a.id 
        WHERE conversations.connection_id = c.id AND a.user_id = auth.uid()
    )
);

-- 12. Test data insertion (replace with actual user ID)
DO $$
DECLARE
    test_agent_id UUID;
    test_connection_id UUID;
    test_conversation_id UUID;
BEGIN
    -- Only run if user is authenticated
    IF auth.uid() IS NOT NULL THEN
        -- Insert test agent
        INSERT INTO agents (name, base_prompt, model, user_id, agent_type) 
        VALUES ('Test Agent', 'You are helpful', 'gpt-4o', auth.uid(), 'customer_support') 
        RETURNING id INTO test_agent_id;
        
        -- Insert test connection
        INSERT INTO connections (agent_id, user_id, platform, config, status, name) 
        VALUES (test_agent_id, auth.uid(), 'telegram', '{"bot_token": "test_token"}', 'active', 'Test Connection')
        RETURNING id INTO test_connection_id;
        
        -- Insert test conversation
        INSERT INTO conversations (user_id, agent_id, connection_id, chat_id, channel, status)
        VALUES (auth.uid(), test_agent_id, test_connection_id, 'test_chat', 'telegram', 'active')
        RETURNING id INTO test_conversation_id;
        
        -- Insert test message
        INSERT INTO messages (
            user_id, agent_id, connection_id, conversation_id,
            channel, direction, role, content_text, status
        ) VALUES (
            auth.uid(), test_agent_id, test_connection_id, test_conversation_id,
            'telegram', 'inbound', 'user', 'Hello test message', 'received'
        );
        
        RAISE NOTICE 'Test data inserted successfully!';
        RAISE NOTICE 'Agent ID: %', test_agent_id;
        RAISE NOTICE 'Connection ID: %', test_connection_id;
        RAISE NOTICE 'Conversation ID: %', test_conversation_id;
    ELSE
        RAISE NOTICE 'No authenticated user - skipping test data insertion';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Test data insertion failed: %', SQLERRM;
END $$;

-- 13. Verify schema with sample queries
SELECT 'Schema verification complete!' as status;

-- Show table structures
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('agents', 'connections', 'messages', 'conversations')
    AND table_schema = 'public'
ORDER BY table_name, ordinal_position;
