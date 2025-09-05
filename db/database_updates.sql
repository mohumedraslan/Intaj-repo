-- 10. widget_sessions (for embeddable widget auth)
CREATE TABLE IF NOT EXISTS widget_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    chatbot_id uuid REFERENCES chatbots(id) ON DELETE CASCADE,
    token text NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_widget_sessions_token ON widget_sessions(token);
-- 9. usage_metrics (for free/pro plan limits)
CREATE TABLE IF NOT EXISTS usage_metrics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    month text NOT NULL, -- e.g. '2025-09'
    message_count int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_metrics_user_month ON usage_metrics(user_id, month);
-- 8. vectors (for embeddings)
CREATE TABLE IF NOT EXISTS vectors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    chatbot_id uuid REFERENCES chatbots(id) ON DELETE CASCADE,
    source_type text NOT NULL, -- faq, file, etc.
    source_id uuid, -- id of the FAQ, file, etc.
    content text NOT NULL,
    embedding vector(1536) NOT NULL, -- pgvector extension, adjust dim as needed
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vectors_chatbot_id ON vectors(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_vectors_source_id ON vectors(source_id);
CREATE INDEX IF NOT EXISTS idx_vectors_created_at ON vectors(created_at);
-- Intaj Database Schema (MVP)
-- Postgres SQL, uses gen_random_uuid() for PKs

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. profiles
CREATE TABLE IF NOT EXISTS profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text,
    email text UNIQUE NOT NULL,
    subscription text NOT NULL DEFAULT 'free',
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);

-- 2. chatbots
CREATE TABLE IF NOT EXISTS chatbots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    name text NOT NULL,
    model text NOT NULL,
    settings jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chatbots_user_id ON chatbots(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbots_created_at ON chatbots(created_at);

-- 3. messages
CREATE TABLE IF NOT EXISTS messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    chatbot_id uuid REFERENCES chatbots(id) ON DELETE CASCADE,
    role text NOT NULL,
    content text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_chatbot_id ON messages(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- 4. faqs
CREATE TABLE IF NOT EXISTS faqs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    chatbot_id uuid REFERENCES chatbots(id) ON DELETE CASCADE,
    question text NOT NULL,
    answer text NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_faqs_chatbot_id ON faqs(chatbot_id);

-- 5. data_sources
CREATE TABLE IF NOT EXISTS data_sources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    chatbot_id uuid REFERENCES chatbots(id) ON DELETE CASCADE,
    type text NOT NULL,
    path text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_data_sources_chatbot_id ON data_sources(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_data_sources_created_at ON data_sources(created_at);

-- 6. connections
CREATE TABLE IF NOT EXISTS connections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    chatbot_id uuid REFERENCES chatbots(id) ON DELETE CASCADE,
    platform text NOT NULL,
    credentials jsonb NOT NULL,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_connections_user_id ON connections(user_id);
CREATE INDEX IF NOT EXISTS idx_connections_chatbot_id ON connections(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_connections_created_at ON connections(created_at);

-- 7. workflows
CREATE TABLE IF NOT EXISTS workflows (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    chatbot_id uuid REFERENCES chatbots(id) ON DELETE CASCADE,
    name text NOT NULL,
    definition jsonb NOT NULL,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_workflows_user_id ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_chatbot_id ON workflows(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_workflows_created_at ON workflows(created_at);
