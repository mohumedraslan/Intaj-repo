-- Migration to add chatbot_id to connections table
ALTER TABLE connections
ADD COLUMN IF NOT EXISTS chatbot_id UUID REFERENCES chatbots(id) ON DELETE CASCADE;

-- Create an index for the new column
CREATE INDEX IF NOT EXISTS idx_connections_chatbot_id ON connections(chatbot_id);

-- Add a comment to the new column
COMMENT ON COLUMN connections.chatbot_id IS 'The ID of the chatbot (agent) this connection is linked to.';
