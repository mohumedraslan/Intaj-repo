-- Create WhatsApp bots table
CREATE TABLE IF NOT EXISTS whatsapp_bots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    phone_number_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    webhook_verify_token TEXT NOT NULL,
    business_account_id TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    display_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    support_mode TEXT NOT NULL DEFAULT 'hybrid' CHECK (support_mode IN ('auto', 'hybrid', 'manual')),
    business_hours JSONB NOT NULL DEFAULT '{"enabled": true, "timezone": "UTC", "schedule": {}}',
    auto_responses JSONB NOT NULL DEFAULT '{"welcome_message": "", "business_hours_message": "", "fallback_message": ""}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(agent_id, user_id)
);

-- Create WhatsApp messages table for logging
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    whatsapp_bot_id UUID NOT NULL REFERENCES whatsapp_bots(id) ON DELETE CASCADE,
    whatsapp_user_id TEXT NOT NULL,
    whatsapp_user_name TEXT,
    message_type TEXT NOT NULL CHECK (message_type IN ('text', 'image', 'document', 'audio', 'video', 'location', 'contact')),
    message_content TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    is_ai_response BOOLEAN DEFAULT FALSE,
    response_time_seconds DECIMAL(10,3),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create WhatsApp analytics view
CREATE OR REPLACE VIEW whatsapp_analytics AS
SELECT 
    agent_id,
    user_id,
    DATE(created_at) as message_date,
    COUNT(*) as total_messages,
    COUNT(DISTINCT whatsapp_user_id) as unique_users,
    COUNT(*) FILTER (WHERE direction = 'inbound') as inbound_messages,
    COUNT(*) FILTER (WHERE direction = 'outbound') as outbound_messages,
    COUNT(*) FILTER (WHERE is_ai_response = true) as ai_responses,
    AVG(response_time_seconds) FILTER (WHERE response_time_seconds IS NOT NULL) as avg_response_time,
    COUNT(DISTINCT whatsapp_user_id) FILTER (WHERE created_at >= CURRENT_DATE) as active_conversations
FROM whatsapp_messages
GROUP BY agent_id, user_id, DATE(created_at);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_bots_agent_id ON whatsapp_bots(agent_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_bots_user_id ON whatsapp_bots(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_agent_id ON whatsapp_messages(agent_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_id ON whatsapp_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at ON whatsapp_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_whatsapp_user_id ON whatsapp_messages(whatsapp_user_id);

-- Enable RLS
ALTER TABLE whatsapp_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for whatsapp_bots
CREATE POLICY "Users can view their own WhatsApp bots" ON whatsapp_bots
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own WhatsApp bots" ON whatsapp_bots
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own WhatsApp bots" ON whatsapp_bots
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own WhatsApp bots" ON whatsapp_bots
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for whatsapp_messages
CREATE POLICY "Users can view their own WhatsApp messages" ON whatsapp_messages
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own WhatsApp messages" ON whatsapp_messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_whatsapp_bots_updated_at 
    BEFORE UPDATE ON whatsapp_bots 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
