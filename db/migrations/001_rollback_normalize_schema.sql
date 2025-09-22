-- =====================================================
-- Database Schema Normalization ROLLBACK Script
-- Version: 001
-- Purpose: Rollback schema normalization changes if needed
-- =====================================================

-- Log rollback start (safe version)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'error_logs') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'error_logs' AND column_name = 'context') THEN
            INSERT INTO error_logs (error_type, error_message, context, created_at) 
            VALUES ('MIGRATION_ROLLBACK', 'Schema normalization rollback started', '{"version": "001"}', NOW());
        ELSE
            INSERT INTO error_logs (error_type, error_message, created_at) 
            VALUES ('MIGRATION_ROLLBACK', 'Schema normalization rollback started', NOW());
        END IF;
    END IF;
END $$;

-- =====================================================
-- PHASE 1: DROP NEW TABLES (in reverse dependency order)
-- =====================================================

-- Drop new tables created in migration
DROP TABLE IF EXISTS agent_performance_metrics CASCADE;
DROP TABLE IF EXISTS connection_status_history CASCADE;
DROP TABLE IF EXISTS usage_logs_enhanced CASCADE;
DROP TABLE IF EXISTS deployments CASCADE;
DROP TABLE IF EXISTS agent_templates CASCADE;

-- =====================================================
-- PHASE 2: REVERT COLUMN NAMING CHANGES
-- =====================================================

-- Revert faqs table (agent_id -> chatbot_id)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'faqs' AND column_name = 'agent_id') THEN
        
        ALTER TABLE faqs DROP CONSTRAINT IF EXISTS faqs_agent_id_fkey;
        ALTER TABLE faqs RENAME COLUMN agent_id TO chatbot_id;
        ALTER TABLE faqs ADD CONSTRAINT faqs_chatbot_id_fkey 
        FOREIGN KEY (chatbot_id) REFERENCES agents(id) ON DELETE CASCADE;
        DROP INDEX IF EXISTS idx_faqs_agent_id;
        CREATE INDEX IF NOT EXISTS idx_faqs_chatbot_id ON faqs(chatbot_id);
    END IF;
END $$;

-- Revert workflows table (agent_id -> chatbot_id)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'workflows' AND column_name = 'agent_id') THEN
        
        ALTER TABLE workflows DROP CONSTRAINT IF EXISTS workflows_agent_id_fkey;
        ALTER TABLE workflows RENAME COLUMN agent_id TO chatbot_id;
        ALTER TABLE workflows ADD CONSTRAINT workflows_chatbot_id_fkey 
        FOREIGN KEY (chatbot_id) REFERENCES agents(id) ON DELETE CASCADE;
        DROP INDEX IF EXISTS idx_workflows_agent_id;
        CREATE INDEX IF NOT EXISTS idx_workflows_chatbot_id ON workflows(chatbot_id);
    END IF;
END $$;

-- Revert vectors table (agent_id -> chatbot_id)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'vectors' AND column_name = 'agent_id') THEN
        
        ALTER TABLE vectors DROP CONSTRAINT IF EXISTS vectors_agent_id_fkey;
        ALTER TABLE vectors RENAME COLUMN agent_id TO chatbot_id;
        ALTER TABLE vectors ADD CONSTRAINT vectors_chatbot_id_fkey 
        FOREIGN KEY (chatbot_id) REFERENCES agents(id) ON DELETE CASCADE;
        DROP INDEX IF EXISTS idx_vectors_agent_id;
        CREATE INDEX IF NOT EXISTS idx_vectors_chatbot_id ON vectors(chatbot_id);
    END IF;
END $$;

-- Revert widget_sessions table (agent_id -> chatbot_id)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'widget_sessions' AND column_name = 'agent_id') THEN
        
        ALTER TABLE widget_sessions DROP CONSTRAINT IF EXISTS widget_sessions_agent_id_fkey;
        ALTER TABLE widget_sessions RENAME COLUMN agent_id TO chatbot_id;
        ALTER TABLE widget_sessions ADD CONSTRAINT widget_sessions_chatbot_id_fkey 
        FOREIGN KEY (chatbot_id) REFERENCES agents(id) ON DELETE CASCADE;
        DROP INDEX IF EXISTS idx_widget_sessions_agent_id;
        CREATE INDEX IF NOT EXISTS idx_widget_sessions_chatbot_id ON widget_sessions(chatbot_id);
    END IF;
END $$;

-- Revert oauth_states table (agent_id -> chatbot_id)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'oauth_states' AND column_name = 'agent_id') THEN
        
        ALTER TABLE oauth_states DROP CONSTRAINT IF EXISTS oauth_states_agent_id_fkey;
        ALTER TABLE oauth_states RENAME COLUMN agent_id TO chatbot_id;
        ALTER TABLE oauth_states ADD CONSTRAINT oauth_states_chatbot_id_fkey 
        FOREIGN KEY (chatbot_id) REFERENCES agents(id) ON DELETE CASCADE;
        DROP INDEX IF EXISTS idx_oauth_states_agent_id;
        CREATE INDEX IF NOT EXISTS idx_oauth_states_chatbot_id ON oauth_states(chatbot_id);
    END IF;
END $$;

-- Revert profiles onboarding_steps naming (created_first_agent -> created_first_chatbot)
UPDATE profiles 
SET onboarding_steps = jsonb_set(
    onboarding_steps - 'created_first_agent',
    '{created_first_chatbot}',
    COALESCE(onboarding_steps->'created_first_agent', 'false'::jsonb)
)
WHERE onboarding_steps ? 'created_first_agent';

-- =====================================================
-- PHASE 3: DROP NEW INDEXES
-- =====================================================

-- Drop performance optimization indexes
DROP INDEX IF EXISTS idx_messages_agent_status_created;
DROP INDEX IF EXISTS idx_messages_conversation_created;
DROP INDEX IF EXISTS idx_messages_platform_status_created;
DROP INDEX IF EXISTS idx_conversations_agent_last_message;
DROP INDEX IF EXISTS idx_conversations_status_updated;
DROP INDEX IF EXISTS idx_conversations_platform_status;
DROP INDEX IF EXISTS idx_usage_logs_enhanced_agent_date;
DROP INDEX IF EXISTS idx_usage_logs_enhanced_provider_model;
DROP INDEX IF EXISTS idx_usage_logs_enhanced_conversation;
DROP INDEX IF EXISTS idx_agent_performance_metrics_agent_date;
DROP INDEX IF EXISTS idx_agent_performance_metrics_date;
DROP INDEX IF EXISTS idx_connections_agent_platform_status;
DROP INDEX IF EXISTS idx_connections_status_updated;
DROP INDEX IF EXISTS idx_agents_status_type_created;
DROP INDEX IF EXISTS idx_agents_user_status;
DROP INDEX IF EXISTS idx_data_sources_agent_status;
DROP INDEX IF EXISTS idx_data_sources_type_status;
DROP INDEX IF EXISTS idx_messages_content_text_search;
DROP INDEX IF EXISTS idx_agents_name_description_search;

-- =====================================================
-- PHASE 4: RESTORE FROM BACKUP (if needed)
-- =====================================================

-- Restore data from backup tables if they exist
DO $$
BEGIN
    -- Restore faqs if backup exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_backup_faqs') THEN
        DELETE FROM faqs;
        INSERT INTO faqs SELECT * FROM _backup_faqs;
        DROP TABLE _backup_faqs;
    END IF;
    
    -- Restore workflows if backup exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_backup_workflows') THEN
        DELETE FROM workflows WHERE chatbot_id IS NOT NULL;
        INSERT INTO workflows SELECT * FROM _backup_workflows;
        DROP TABLE _backup_workflows;
    END IF;
    
    -- Restore vectors if backup exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_backup_vectors') THEN
        DELETE FROM vectors WHERE chatbot_id IS NOT NULL;
        INSERT INTO vectors SELECT * FROM _backup_vectors;
        DROP TABLE _backup_vectors;
    END IF;
    
    -- Restore widget_sessions if backup exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_backup_widget_sessions') THEN
        DELETE FROM widget_sessions WHERE chatbot_id IS NOT NULL;
        INSERT INTO widget_sessions SELECT * FROM _backup_widget_sessions;
        DROP TABLE _backup_widget_sessions;
    END IF;
END $$;

-- =====================================================
-- PHASE 5: CLEANUP AND VALIDATION
-- =====================================================

-- Update table statistics
ANALYZE agents;
ANALYZE connections;
ANALYZE conversations;
ANALYZE messages;
ANALYZE faqs;
ANALYZE workflows;
ANALYZE vectors;
ANALYZE widget_sessions;

-- Log rollback completion (safe version)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'error_logs') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'error_logs' AND column_name = 'context') THEN
            INSERT INTO error_logs (error_type, error_message, context, created_at) 
            VALUES ('MIGRATION_ROLLBACK', 'Schema normalization rollback completed', 
                    '{"version": "001", "completed_at": "' || NOW() || '"}', NOW());
        ELSE
            INSERT INTO error_logs (error_type, error_message, created_at) 
            VALUES ('MIGRATION_ROLLBACK', 'Schema normalization rollback completed', NOW());
        END IF;
    END IF;
END $$;

-- Display rollback summary
DO $$
BEGIN
    RAISE NOTICE '=== SCHEMA NORMALIZATION ROLLBACK COMPLETED ===';
    RAISE NOTICE 'Version: 001';
    RAISE NOTICE 'Rolled back at: %', NOW();
    RAISE NOTICE 'All new tables dropped';
    RAISE NOTICE 'Column names reverted to original';
    RAISE NOTICE 'Indexes cleaned up';
    RAISE NOTICE 'Data restored from backups where available';
    RAISE NOTICE '=================================================';
END $$;
