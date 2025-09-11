-- Migration to add oauth_states table for OAuth flow state management

-- Create oauth_states table if it doesn't exist
CREATE TABLE IF NOT EXISTS oauth_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    state TEXT NOT NULL,
    platform TEXT NOT NULL,
    chatbot_id UUID REFERENCES chatbots(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON oauth_states(state);
CREATE INDEX IF NOT EXISTS idx_oauth_states_user_id ON oauth_states(user_id);

-- Add comment
COMMENT ON TABLE oauth_states IS 'Stores OAuth state parameters to prevent CSRF attacks during OAuth flow';