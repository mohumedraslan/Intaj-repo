-- Analytics Tables for Dashboard

-- 1. conversations table (tracking chat sessions)
CREATE TABLE IF NOT EXISTS conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    chatbot_id uuid REFERENCES chatbots(id) ON DELETE CASCADE,
    user_session_id text NOT NULL,
    started_at timestamptz NOT NULL DEFAULT now(),
    ended_at timestamptz,
    message_count int NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'active',
    metadata jsonb
);
CREATE INDEX IF NOT EXISTS idx_conversations_chatbot_id ON conversations(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_conversations_started_at ON conversations(started_at);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);

-- 2. conversation_ratings (feedback & satisfaction)
CREATE TABLE IF NOT EXISTS conversation_ratings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
    rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback text,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_conversation_ratings_conversation_id ON conversation_ratings(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_ratings_created_at ON conversation_ratings(created_at);

-- 3. message_metrics (performance tracking)
CREATE TABLE IF NOT EXISTS message_metrics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
    message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
    response_time numeric NOT NULL, -- in seconds
    token_count int NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_message_metrics_conversation_id ON message_metrics(conversation_id);
CREATE INDEX IF NOT EXISTS idx_message_metrics_created_at ON message_metrics(created_at);

-- 4. activity_log (user actions & system events)
CREATE TABLE IF NOT EXISTS activity_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    type text NOT NULL, -- conversation, connection, update, signup
    message text NOT NULL,
    metadata jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON activity_log(type);

-- 5. bot_metrics (per-bot performance stats)
CREATE TABLE IF NOT EXISTS bot_metrics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    chatbot_id uuid REFERENCES chatbots(id) ON DELETE CASCADE,
    date date NOT NULL,
    conversation_count int NOT NULL DEFAULT 0,
    message_count int NOT NULL DEFAULT 0,
    avg_response_time numeric NOT NULL DEFAULT 0,
    avg_rating numeric,
    unique_users int NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bot_metrics_chatbot_date ON bot_metrics(chatbot_id, date);

-- 6. user_metrics (aggregate user activity)
CREATE TABLE IF NOT EXISTS user_metrics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    date date NOT NULL,
    active_bots int NOT NULL DEFAULT 0,
    total_conversations int NOT NULL DEFAULT 0,
    total_messages int NOT NULL DEFAULT 0,
    data_usage bigint NOT NULL DEFAULT 0 -- in bytes
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_metrics_user_date ON user_metrics(user_id, date);

-- Add status column to chatbots table if not exists
ALTER TABLE chatbots ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
CREATE INDEX IF NOT EXISTS idx_chatbots_status ON chatbots(status);
