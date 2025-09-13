-- Migration to add chatbot_id to connections table

-- Add chatbot_id column to connections table
ALTER TABLE connections
ADD COLUMN chatbot_id UUID REFERENCES chatbots(id);

-- Create index for faster lookups
CREATE INDEX idx_connections_chatbot_id ON connections(chatbot_id);

-- Update RLS policies to include chatbot_id
DROP POLICY IF EXISTS connections_select_policy ON connections;
CREATE POLICY connections_select_policy ON connections
    FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS connections_insert_policy ON connections;
CREATE POLICY connections_insert_policy ON connections
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS connections_update_policy ON connections;
CREATE POLICY connections_update_policy ON connections
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS connections_delete_policy ON connections;
CREATE POLICY connections_delete_policy ON connections
    FOR DELETE
    USING (user_id = auth.uid());