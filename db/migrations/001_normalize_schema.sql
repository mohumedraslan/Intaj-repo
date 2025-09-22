-- =====================================================
-- Database Schema Normalization & Migration Script
-- Version: 001
-- Purpose: Fix naming inconsistencies, add missing tables, optimize performance
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================================================
-- PHASE 1: BACKUP AND VALIDATION
-- =====================================================

-- Create backup tables for critical data (safe version)
DO $$
BEGIN
    -- Backup faqs table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'faqs') THEN
        CREATE TABLE IF NOT EXISTS _backup_faqs AS SELECT * FROM faqs;
    END IF;
    
    -- Backup workflows table if chatbot_id column exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workflows') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workflows' AND column_name = 'chatbot_id') THEN
            CREATE TABLE IF NOT EXISTS _backup_workflows AS SELECT * FROM workflows WHERE chatbot_id IS NOT NULL;
        ELSE
            CREATE TABLE IF NOT EXISTS _backup_workflows AS SELECT * FROM workflows;
        END IF;
    END IF;
    
    -- Backup vectors table if chatbot_id column exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vectors') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vectors' AND column_name = 'chatbot_id') THEN
            CREATE TABLE IF NOT EXISTS _backup_vectors AS SELECT * FROM vectors WHERE chatbot_id IS NOT NULL;
        ELSE
            CREATE TABLE IF NOT EXISTS _backup_vectors AS SELECT * FROM vectors;
        END IF;
    END IF;
    
    -- Backup widget_sessions table if chatbot_id column exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'widget_sessions') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'widget_sessions' AND column_name = 'chatbot_id') THEN
            CREATE TABLE IF NOT EXISTS _backup_widget_sessions AS SELECT * FROM widget_sessions WHERE chatbot_id IS NOT NULL;
        ELSE
            CREATE TABLE IF NOT EXISTS _backup_widget_sessions AS SELECT * FROM widget_sessions;
        END IF;
    END IF;
END $$;

-- Log migration start (safe version - only if error_logs table exists with these columns)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'error_logs') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'error_logs' AND column_name = 'context') THEN
            INSERT INTO error_logs (error_type, error_message, context, created_at) 
            VALUES ('MIGRATION', 'Schema normalization started', '{"version": "001", "phase": "backup"}', NOW());
        ELSE
            INSERT INTO error_logs (error_type, error_message, created_at) 
            VALUES ('MIGRATION', 'Schema normalization started', NOW());
        END IF;
    END IF;
END $$;

-- =====================================================
-- PHASE 2: FIX NAMING INCONSISTENCIES
-- =====================================================

-- Fix faqs table column naming (chatbot_id -> agent_id)
DO $$ 
BEGIN
    -- Check if column exists and rename it
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'faqs' AND column_name = 'chatbot_id') THEN
        
        -- Drop existing foreign key constraint
        ALTER TABLE faqs DROP CONSTRAINT IF EXISTS faqs_chatbot_id_fkey;
        
        -- Rename column
        ALTER TABLE faqs RENAME COLUMN chatbot_id TO agent_id;
        
        -- Add new foreign key constraint
        ALTER TABLE faqs ADD CONSTRAINT faqs_agent_id_fkey 
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE;
        
        -- Create index
        CREATE INDEX IF NOT EXISTS idx_faqs_agent_id ON faqs(agent_id);
    END IF;
END $$;

-- Fix workflows table column naming (chatbot_id -> agent_id)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'workflows' AND column_name = 'chatbot_id') THEN
        
        ALTER TABLE workflows DROP CONSTRAINT IF EXISTS workflows_chatbot_id_fkey;
        ALTER TABLE workflows RENAME COLUMN chatbot_id TO agent_id;
        ALTER TABLE workflows ADD CONSTRAINT workflows_agent_id_fkey 
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_workflows_agent_id ON workflows(agent_id);
    END IF;
END $$;

-- Fix vectors table column naming (chatbot_id -> agent_id)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'vectors' AND column_name = 'chatbot_id') THEN
        
        ALTER TABLE vectors DROP CONSTRAINT IF EXISTS vectors_chatbot_id_fkey;
        ALTER TABLE vectors RENAME COLUMN chatbot_id TO agent_id;
        ALTER TABLE vectors ADD CONSTRAINT vectors_agent_id_fkey 
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_vectors_agent_id ON vectors(agent_id);
    END IF;
END $$;

-- Fix widget_sessions table column naming (chatbot_id -> agent_id)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'widget_sessions' AND column_name = 'chatbot_id') THEN
        
        ALTER TABLE widget_sessions DROP CONSTRAINT IF EXISTS widget_sessions_chatbot_id_fkey;
        ALTER TABLE widget_sessions RENAME COLUMN chatbot_id TO agent_id;
        ALTER TABLE widget_sessions ADD CONSTRAINT widget_sessions_agent_id_fkey 
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_widget_sessions_agent_id ON widget_sessions(agent_id);
    END IF;
END $$;

-- Fix oauth_states table column naming (chatbot_id -> agent_id)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'oauth_states' AND column_name = 'chatbot_id') THEN
        
        ALTER TABLE oauth_states DROP CONSTRAINT IF EXISTS oauth_states_chatbot_id_fkey;
        ALTER TABLE oauth_states RENAME COLUMN chatbot_id TO agent_id;
        ALTER TABLE oauth_states ADD CONSTRAINT oauth_states_agent_id_fkey 
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_oauth_states_agent_id ON oauth_states(agent_id);
    END IF;
END $$;

-- Fix profiles onboarding_steps naming (created_first_chatbot -> created_first_agent)
UPDATE profiles 
SET onboarding_steps = jsonb_set(
    onboarding_steps - 'created_first_chatbot',
    '{created_first_agent}',
    COALESCE(onboarding_steps->'created_first_chatbot', 'false'::jsonb)
)
WHERE onboarding_steps ? 'created_first_chatbot';

-- =====================================================
-- PHASE 3: ADD NEW REQUIRED TABLES
-- =====================================================

-- Agent Templates Table
CREATE TABLE IF NOT EXISTS agent_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('customer_support', 'sales', 'marketing', 'hr', 'technical_support', 'general')),
    name TEXT NOT NULL,
    description TEXT,
    base_prompt TEXT NOT NULL,
    default_config JSONB DEFAULT '{}',
    available_tools JSONB DEFAULT '[]',
    model_recommendations JSONB DEFAULT '[]',
    use_cases TEXT[],
    tags TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT agent_templates_name_type_unique UNIQUE (name, type)
);

-- Deployments Table
CREATE TABLE IF NOT EXISTS deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    config_snapshot JSONB NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'failed', 'pending')),
    deployment_type TEXT DEFAULT 'manual' CHECK (deployment_type IN ('manual', 'auto', 'rollback')),
    notes TEXT,
    deployed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deployed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT deployments_agent_version_unique UNIQUE (agent_id, version)
);

-- Enhanced Usage Logs Table (if not exists or needs enhancement)
CREATE TABLE IF NOT EXISTS usage_logs_enhanced (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    tokens_total INTEGER GENERATED ALWAYS AS (tokens_input + tokens_output) STORED,
    cost_usd DECIMAL(10,6),
    latency_ms INTEGER,
    request_id TEXT,
    response_status TEXT DEFAULT 'success',
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT usage_logs_enhanced_tokens_positive CHECK (tokens_input >= 0 AND tokens_output >= 0),
    CONSTRAINT usage_logs_enhanced_cost_positive CHECK (cost_usd IS NULL OR cost_usd >= 0),
    CONSTRAINT usage_logs_enhanced_latency_positive CHECK (latency_ms IS NULL OR latency_ms >= 0)
);

-- Connection Status History Table
CREATE TABLE IF NOT EXISTS connection_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    reason TEXT,
    metadata JSONB DEFAULT '{}',
    changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Performance Metrics Table
CREATE TABLE IF NOT EXISTS agent_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_conversations INTEGER DEFAULT 0,
    total_messages INTEGER DEFAULT 0,
    avg_response_time_ms INTEGER,
    success_rate DECIMAL(5,2),
    user_satisfaction_score DECIMAL(3,2),
    total_tokens_used INTEGER DEFAULT 0,
    total_cost_usd DECIMAL(10,2),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT agent_performance_metrics_agent_date_unique UNIQUE (agent_id, date),
    CONSTRAINT agent_performance_metrics_rates_valid CHECK (
        success_rate IS NULL OR (success_rate >= 0 AND success_rate <= 100)
    ),
    CONSTRAINT agent_performance_metrics_satisfaction_valid CHECK (
        user_satisfaction_score IS NULL OR (user_satisfaction_score >= 0 AND user_satisfaction_score <= 5)
    )
);

-- =====================================================
-- PHASE 4: PERFORMANCE OPTIMIZATION INDEXES
-- =====================================================

-- Message querying patterns
CREATE INDEX IF NOT EXISTS idx_messages_agent_status_created 
ON messages(agent_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_platform_status_created 
ON messages(platform, status, created_at DESC);

-- Conversation patterns
CREATE INDEX IF NOT EXISTS idx_conversations_agent_last_message 
ON conversations(agent_id, last_message_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_conversations_status_updated 
ON conversations(status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_platform_status 
ON conversations(platform, status, created_at DESC);

-- Usage analytics
CREATE INDEX IF NOT EXISTS idx_usage_logs_enhanced_agent_date 
ON usage_logs_enhanced(agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_usage_logs_enhanced_provider_model 
ON usage_logs_enhanced(provider, model, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_usage_logs_enhanced_conversation 
ON usage_logs_enhanced(conversation_id, created_at DESC) WHERE conversation_id IS NOT NULL;

-- Agent performance
CREATE INDEX IF NOT EXISTS idx_agent_performance_metrics_agent_date 
ON agent_performance_metrics(agent_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_agent_performance_metrics_date 
ON agent_performance_metrics(date DESC);

-- Connection optimization
CREATE INDEX IF NOT EXISTS idx_connections_agent_platform_status 
ON connections(agent_id, platform, status);

CREATE INDEX IF NOT EXISTS idx_connections_status_updated 
ON connections(status, updated_at DESC);

-- Agent optimization
CREATE INDEX IF NOT EXISTS idx_agents_status_type_created 
ON agents(status, agent_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agents_user_status 
ON agents(user_id, status, created_at DESC);

-- Data sources optimization
CREATE INDEX IF NOT EXISTS idx_data_sources_agent_status 
ON data_sources(agent_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_data_sources_type_status 
ON data_sources(type, status, created_at DESC);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_messages_content_text_search 
ON messages USING gin(to_tsvector('english', content_text)) 
WHERE content_text IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agents_name_description_search 
ON agents USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- =====================================================
-- PHASE 5: UPDATE RLS POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE agent_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs_enhanced ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Agent Templates RLS (public read, admin write)
CREATE POLICY "Anyone can view active agent templates" ON agent_templates
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage agent templates" ON agent_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Deployments RLS
CREATE POLICY "Users can view their agent deployments" ON deployments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM agents 
            WHERE agents.id = deployments.agent_id 
            AND agents.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create deployments for their agents" ON deployments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM agents 
            WHERE agents.id = deployments.agent_id 
            AND agents.user_id = auth.uid()
        )
    );

-- Usage Logs Enhanced RLS
CREATE POLICY "Users can view their agent usage logs" ON usage_logs_enhanced
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM agents 
            WHERE agents.id = usage_logs_enhanced.agent_id 
            AND agents.user_id = auth.uid()
        )
    );

-- Connection Status History RLS
CREATE POLICY "Users can view their connection history" ON connection_status_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM connections 
            WHERE connections.id = connection_status_history.connection_id 
            AND connections.user_id = auth.uid()
        )
    );

-- Agent Performance Metrics RLS
CREATE POLICY "Users can view their agent performance metrics" ON agent_performance_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM agents 
            WHERE agents.id = agent_performance_metrics.agent_id 
            AND agents.user_id = auth.uid()
        )
    );

-- =====================================================
-- PHASE 6: DATA MIGRATION AND CLEANUP
-- =====================================================

-- Migrate existing usage_logs data to enhanced table if needed (safe version)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usage_logs') THEN
        INSERT INTO usage_logs_enhanced (
            agent_id, provider, model, tokens_input, tokens_output, 
            cost_usd, latency_ms, request_id, created_at
        )
        SELECT 
            agent_id, 
            COALESCE(provider, 'unknown') as provider,
            COALESCE(model, 'unknown') as model,
            COALESCE(CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usage_logs' AND column_name = 'input_tokens') 
                         THEN input_tokens ELSE 0 END, 0) as tokens_input,
            COALESCE(CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usage_logs' AND column_name = 'output_tokens') 
                         THEN output_tokens ELSE 0 END, 0) as tokens_output,
            cost,
            CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usage_logs' AND column_name = 'response_time_ms') 
                 THEN response_time_ms ELSE NULL END,
            request_id,
            created_at
        FROM usage_logs 
        WHERE NOT EXISTS (
            SELECT 1 FROM usage_logs_enhanced ule 
            WHERE ule.agent_id = usage_logs.agent_id 
            AND ule.created_at = usage_logs.created_at
        )
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Insert default agent templates
INSERT INTO agent_templates (type, name, description, base_prompt, default_config, available_tools, model_recommendations, use_cases, tags) VALUES
('customer_support', 'Customer Support Agent', 'Handles customer inquiries and support tickets', 
 'You are a helpful customer support agent. Provide clear, concise, and friendly responses to customer inquiries. Always aim to resolve issues efficiently while maintaining a professional tone.',
 '{"temperature": 0.7, "max_tokens": 1000, "timeout_ms": 10000}',
 '["knowledge_base", "ticket_creation", "escalation"]',
 '["gpt-4o", "gpt-4o-mini", "claude-3-sonnet"]',
 ARRAY['Customer inquiries', 'Technical support', 'Order assistance', 'Refund requests'],
 ARRAY['support', 'customer-service', 'help-desk']),

('sales', 'Sales Assistant', 'Assists with sales inquiries and lead qualification',
 'You are a professional sales assistant. Help potential customers understand our products and services, qualify leads, and guide them through the sales process. Be persuasive but not pushy.',
 '{"temperature": 0.8, "max_tokens": 1200, "timeout_ms": 12000}',
 '["product_catalog", "pricing", "lead_qualification", "appointment_booking"]',
 '["gpt-4o", "claude-3-sonnet", "gpt-4o-mini"]',
 ARRAY['Lead qualification', 'Product demos', 'Pricing inquiries', 'Sales follow-up'],
 ARRAY['sales', 'lead-generation', 'conversion']),

('marketing', 'Marketing Assistant', 'Handles marketing campaigns and content creation',
 'You are a creative marketing assistant. Help with content creation, campaign ideas, and marketing strategy. Be creative, engaging, and brand-aware in your responses.',
 '{"temperature": 0.9, "max_tokens": 1500, "timeout_ms": 15000}',
 '["content_generation", "campaign_analytics", "social_media", "email_marketing"]',
 '["gpt-4o", "claude-3-sonnet", "gpt-4o-mini"]',
 ARRAY['Content creation', 'Campaign planning', 'Social media management', 'Email marketing'],
 ARRAY['marketing', 'content', 'campaigns', 'social-media']),

('hr', 'HR Assistant', 'Manages HR inquiries and employee support',
 'You are a professional HR assistant. Handle employee inquiries about policies, benefits, and procedures. Maintain confidentiality and provide accurate information about company policies.',
 '{"temperature": 0.6, "max_tokens": 1000, "timeout_ms": 10000}',
 '["policy_lookup", "benefits_info", "leave_management", "onboarding"]',
 '["gpt-4o", "gpt-4o-mini", "claude-3-sonnet"]',
 ARRAY['Policy inquiries', 'Benefits questions', 'Leave requests', 'Employee onboarding'],
 ARRAY['hr', 'human-resources', 'employee-support', 'policies']),

('technical_support', 'Technical Support Agent', 'Provides technical assistance and troubleshooting',
 'You are a technical support specialist. Help users troubleshoot technical issues, provide step-by-step solutions, and escalate complex problems when necessary. Be patient and thorough in your explanations.',
 '{"temperature": 0.5, "max_tokens": 1500, "timeout_ms": 15000}',
 '["troubleshooting", "documentation", "system_diagnostics", "escalation"]',
 '["gpt-4o", "claude-3-sonnet", "gpt-4o-mini"]',
 ARRAY['Technical troubleshooting', 'Software support', 'Hardware issues', 'System diagnostics'],
 ARRAY['technical', 'support', 'troubleshooting', 'diagnostics'])

ON CONFLICT (name, type) DO NOTHING;

-- =====================================================
-- PHASE 7: VALIDATION AND CLEANUP
-- =====================================================

-- Validate foreign key relationships
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    -- Check for orphaned records
    SELECT COUNT(*) INTO invalid_count FROM faqs WHERE agent_id NOT IN (SELECT id FROM agents);
    IF invalid_count > 0 THEN
        RAISE WARNING 'Found % orphaned FAQ records', invalid_count;
    END IF;
    
    SELECT COUNT(*) INTO invalid_count FROM messages WHERE agent_id IS NOT NULL AND agent_id NOT IN (SELECT id FROM agents);
    IF invalid_count > 0 THEN
        RAISE WARNING 'Found % orphaned message records', invalid_count;
    END IF;
    
    SELECT COUNT(*) INTO invalid_count FROM connections WHERE agent_id IS NOT NULL AND agent_id NOT IN (SELECT id FROM agents);
    IF invalid_count > 0 THEN
        RAISE WARNING 'Found % orphaned connection records', invalid_count;
    END IF;
END $$;

-- Update table statistics
ANALYZE agents;
ANALYZE connections;
ANALYZE conversations;
ANALYZE messages;
ANALYZE agent_templates;
ANALYZE deployments;
ANALYZE usage_logs_enhanced;
ANALYZE agent_performance_metrics;

-- Log migration completion (safe version)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'error_logs') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'error_logs' AND column_name = 'context') THEN
            INSERT INTO error_logs (error_type, error_message, context, created_at) 
            VALUES ('MIGRATION', 'Schema normalization completed successfully', 
                    '{"version": "001", "phase": "completed", "timestamp": "' || NOW() || '"}', NOW());
        ELSE
            INSERT INTO error_logs (error_type, error_message, created_at) 
            VALUES ('MIGRATION', 'Schema normalization completed successfully', NOW());
        END IF;
    END IF;
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Display summary
DO $$
BEGIN
    RAISE NOTICE '=== SCHEMA NORMALIZATION MIGRATION COMPLETED ===';
    RAISE NOTICE 'Version: 001';
    RAISE NOTICE 'Completed at: %', NOW();
    RAISE NOTICE 'New tables created: agent_templates, deployments, usage_logs_enhanced, connection_status_history, agent_performance_metrics';
    RAISE NOTICE 'Indexes created: % performance optimization indexes', 15;
    RAISE NOTICE 'RLS policies updated for all new tables';
    RAISE NOTICE 'Data migration completed for usage logs and agent templates';
    RAISE NOTICE '================================================';
END $$;
