-- Create telegram_messages table for conversation logging
CREATE TABLE IF NOT EXISTS telegram_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  telegram_user_id BIGINT NOT NULL,
  user_message TEXT NOT NULL,
  bot_response TEXT,
  response_type TEXT NOT NULL DEFAULT 'ai_response',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_telegram_messages_agent_id ON telegram_messages(agent_id);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_telegram_user_id ON telegram_messages(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_created_at ON telegram_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_response_type ON telegram_messages(response_type);

-- Enable RLS
ALTER TABLE telegram_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view messages for their own agents"
ON telegram_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM agents 
    WHERE agents.id = telegram_messages.agent_id 
    AND agents.user_id = auth.uid()
  )
);

CREATE POLICY "System can insert telegram messages"
ON telegram_messages
FOR INSERT
WITH CHECK (true);

-- Create analytics view for Telegram performance
CREATE OR REPLACE VIEW telegram_analytics AS
SELECT 
  tm.agent_id,
  a.user_id,
  DATE(tm.created_at) as message_date,
  COUNT(*) as total_messages,
  COUNT(DISTINCT tm.telegram_user_id) as unique_users,
  COUNT(CASE WHEN tm.response_type = 'ai_response' THEN 1 END) as ai_responses,
  COUNT(CASE WHEN tm.response_type = 'auto_response' THEN 1 END) as auto_responses,
  COUNT(CASE WHEN tm.response_type = 'human_escalation' THEN 1 END) as human_escalations,
  AVG(LENGTH(tm.user_message)) as avg_message_length,
  AVG(LENGTH(tm.bot_response)) as avg_response_length
FROM telegram_messages tm
JOIN agents a ON tm.agent_id = a.id
GROUP BY tm.agent_id, a.user_id, DATE(tm.created_at);

-- Grant access to the view
GRANT SELECT ON telegram_analytics TO authenticated;
