-- Add chatbot_id column to connections table
ALTER TABLE connections
ADD COLUMN chatbot_id UUID REFERENCES chatbots(id);

-- Create an index on the chatbot_id column for better query performance
CREATE INDEX idx_connections_chatbot_id ON connections(chatbot_id);

-- Update RLS policies to include chatbot_id in conditions
DROP POLICY IF EXISTS connections_select_policy ON connections;
CREATE POLICY connections_select_policy ON connections
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS connections_insert_policy ON connections;
CREATE POLICY connections_insert_policy ON connections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS connections_update_policy ON connections;
CREATE POLICY connections_update_policy ON connections
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS connections_delete_policy ON connections;
CREATE POLICY connections_delete_policy ON connections
  FOR DELETE
  USING (auth.uid() = user_id);