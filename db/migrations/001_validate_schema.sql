-- =====================================================
-- Database Schema Validation Script
-- Version: 001
-- Purpose: Validate schema normalization was successful
-- =====================================================

-- Create validation results table
CREATE TEMP TABLE validation_results (
    check_name TEXT,
    status TEXT,
    details TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- VALIDATION CHECKS
-- =====================================================

-- Check 1: Verify new tables exist
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_name IN ('agent_templates', 'deployments', 'usage_logs_enhanced', 'connection_status_history', 'agent_performance_metrics')
    AND table_schema = 'public';
    
    IF table_count = 5 THEN
        INSERT INTO validation_results (check_name, status, details) 
        VALUES ('New Tables Created', 'PASS', 'All 5 new tables created successfully');
    ELSE
        INSERT INTO validation_results (check_name, status, details) 
        VALUES ('New Tables Created', 'FAIL', 'Expected 5 tables, found ' || table_count);
    END IF;
END $$;

-- Check 2: Verify column naming fixes
DO $$
DECLARE
    chatbot_refs INTEGER := 0;
    agent_refs INTEGER := 0;
BEGIN
    -- Count remaining chatbot_id references
    SELECT COUNT(*) INTO chatbot_refs
    FROM information_schema.columns 
    WHERE column_name = 'chatbot_id' 
    AND table_schema = 'public'
    AND table_name NOT LIKE '_backup_%';
    
    -- Count new agent_id references
    SELECT COUNT(*) INTO agent_refs
    FROM information_schema.columns 
    WHERE column_name = 'agent_id' 
    AND table_schema = 'public'
    AND table_name IN ('faqs', 'workflows', 'vectors', 'widget_sessions', 'oauth_states');
    
    IF chatbot_refs = 0 AND agent_refs >= 3 THEN
        INSERT INTO validation_results (check_name, status, details) 
        VALUES ('Column Naming Fixed', 'PASS', 'chatbot_id columns renamed to agent_id where applicable');
    ELSE
        INSERT INTO validation_results (check_name, status, details) 
        VALUES ('Column Naming Fixed', 'PARTIAL', 'Found ' || chatbot_refs || ' chatbot_id refs, ' || agent_refs || ' agent_id refs');
    END IF;
END $$;

-- Check 3: Verify foreign key constraints
DO $$
DECLARE
    fk_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'agent_id'
    AND kcu.table_name IN ('faqs', 'workflows', 'vectors', 'widget_sessions', 'oauth_states', 'deployments', 'usage_logs_enhanced', 'agent_performance_metrics');
    
    IF fk_count >= 5 THEN
        INSERT INTO validation_results (check_name, status, details) 
        VALUES ('Foreign Key Constraints', 'PASS', 'agent_id foreign keys created (' || fk_count || ')');
    ELSE
        INSERT INTO validation_results (check_name, status, details) 
        VALUES ('Foreign Key Constraints', 'PARTIAL', 'Expected >= 5 FK constraints, found ' || fk_count);
    END IF;
END $$;

-- Check 4: Verify performance indexes
DO $$
DECLARE
    index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE schemaname = 'public'
    AND (indexname LIKE 'idx_%agent%' 
    OR indexname LIKE 'idx_%conversation%'
    OR indexname LIKE 'idx_%message%'
    OR indexname LIKE 'idx_%usage%'
    OR indexname LIKE 'idx_%performance%');
    
    IF index_count >= 10 THEN
        INSERT INTO validation_results (check_name, status, details) 
        VALUES ('Performance Indexes', 'PASS', 'Performance indexes created (' || index_count || ')');
    ELSE
        INSERT INTO validation_results (check_name, status, details) 
        VALUES ('Performance Indexes', 'PARTIAL', 'Expected >= 10 indexes, found ' || index_count);
    END IF;
END $$;

-- Check 5: Verify RLS policies on new tables
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public'
    AND tablename IN ('agent_templates', 'deployments', 'usage_logs_enhanced', 'connection_status_history', 'agent_performance_metrics');
    
    IF policy_count >= 5 THEN
        INSERT INTO validation_results (check_name, status, details) 
        VALUES ('RLS Policies', 'PASS', 'RLS policies created for new tables (' || policy_count || ')');
    ELSE
        INSERT INTO validation_results (check_name, status, details) 
        VALUES ('RLS Policies', 'PARTIAL', 'Expected >= 5 policies, found ' || policy_count);
    END IF;
END $$;

-- Check 6: Verify agent templates data
DO $$
DECLARE
    template_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO template_count FROM agent_templates WHERE is_active = true;
    
    IF template_count >= 5 THEN
        INSERT INTO validation_results (check_name, status, details) 
        VALUES ('Agent Templates Data', 'PASS', 'Default agent templates inserted (' || template_count || ')');
    ELSE
        INSERT INTO validation_results (check_name, status, details) 
        VALUES ('Agent Templates Data', 'PARTIAL', 'Expected >= 5 templates, found ' || template_count);
    END IF;
END $$;

-- Check 7: Verify onboarding steps update (if profiles table exists)
DO $$
DECLARE
    old_refs INTEGER := 0;
    profiles_exists BOOLEAN := false;
BEGIN
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') INTO profiles_exists;
    
    IF profiles_exists THEN
        SELECT COUNT(*) INTO old_refs 
        FROM profiles 
        WHERE onboarding_steps ? 'created_first_chatbot';
        
        IF old_refs = 0 THEN
            INSERT INTO validation_results (check_name, status, details) 
            VALUES ('Onboarding Steps Updated', 'PASS', 'All onboarding steps updated to use agent terminology');
        ELSE
            INSERT INTO validation_results (check_name, status, details) 
            VALUES ('Onboarding Steps Updated', 'PARTIAL', 'Found ' || old_refs || ' profiles with old chatbot references');
        END IF;
    ELSE
        INSERT INTO validation_results (check_name, status, details) 
        VALUES ('Onboarding Steps Updated', 'SKIP', 'Profiles table does not exist');
    END IF;
END $$;

-- Check 8: Verify data integrity (safe version)
DO $$
DECLARE
    orphaned_count INTEGER := 0;
    total_orphaned INTEGER := 0;
    agents_exists BOOLEAN := false;
BEGIN
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agents') INTO agents_exists;
    
    IF agents_exists THEN
        -- Check for orphaned FAQs
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'faqs') THEN
            SELECT COUNT(*) INTO orphaned_count FROM faqs WHERE agent_id NOT IN (SELECT id FROM agents);
            total_orphaned := total_orphaned + orphaned_count;
        END IF;
        
        -- Check for orphaned messages
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
            SELECT COUNT(*) INTO orphaned_count FROM messages WHERE agent_id IS NOT NULL AND agent_id NOT IN (SELECT id FROM agents);
            total_orphaned := total_orphaned + orphaned_count;
        END IF;
        
        -- Check for orphaned connections
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'connections') THEN
            SELECT COUNT(*) INTO orphaned_count FROM connections WHERE agent_id IS NOT NULL AND agent_id NOT IN (SELECT id FROM agents);
            total_orphaned := total_orphaned + orphaned_count;
        END IF;
        
        IF total_orphaned = 0 THEN
            INSERT INTO validation_results (check_name, status, details) 
            VALUES ('Data Integrity', 'PASS', 'No orphaned records found');
        ELSE
            INSERT INTO validation_results (check_name, status, details) 
            VALUES ('Data Integrity', 'FAIL', 'Found ' || total_orphaned || ' orphaned records');
        END IF;
    ELSE
        INSERT INTO validation_results (check_name, status, details) 
        VALUES ('Data Integrity', 'SKIP', 'Agents table does not exist');
    END IF;
END $$;

-- Check 9: Verify table constraints
DO $$
DECLARE
    constraint_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO constraint_count
    FROM information_schema.table_constraints 
    WHERE constraint_type = 'CHECK'
    AND table_name IN ('agent_templates', 'deployments', 'usage_logs_enhanced', 'agent_performance_metrics')
    AND table_schema = 'public';
    
    IF constraint_count >= 8 THEN
        INSERT INTO validation_results (check_name, status, details) 
        VALUES ('Table Constraints', 'PASS', 'Check constraints created (' || constraint_count || ')');
    ELSE
        INSERT INTO validation_results (check_name, status, details) 
        VALUES ('Table Constraints', 'PARTIAL', 'Expected >= 8 constraints, found ' || constraint_count);
    END IF;
END $$;

-- =====================================================
-- DISPLAY VALIDATION RESULTS
-- =====================================================

-- Show validation summary
DO $$
DECLARE
    total_checks INTEGER;
    passed_checks INTEGER;
    failed_checks INTEGER;
    partial_checks INTEGER;
    rec RECORD;
BEGIN
    SELECT COUNT(*) INTO total_checks FROM validation_results;
    SELECT COUNT(*) INTO passed_checks FROM validation_results WHERE status = 'PASS';
    SELECT COUNT(*) INTO failed_checks FROM validation_results WHERE status = 'FAIL';
    SELECT COUNT(*) INTO partial_checks FROM validation_results WHERE status IN ('PARTIAL', 'SKIP');
    
    RAISE NOTICE '=== SCHEMA VALIDATION RESULTS ===';
    RAISE NOTICE 'Total Checks: %', total_checks;
    RAISE NOTICE 'Passed: %', passed_checks;
    RAISE NOTICE 'Partial/Skipped: %', partial_checks;
    RAISE NOTICE 'Failed: %', failed_checks;
    RAISE NOTICE '';
    
    -- Show detailed results
    FOR rec IN SELECT * FROM validation_results ORDER BY 
        CASE status 
            WHEN 'PASS' THEN 1 
            WHEN 'PARTIAL' THEN 2 
            WHEN 'SKIP' THEN 3 
            WHEN 'FAIL' THEN 4 
        END, check_name LOOP
        RAISE NOTICE '[%] %: %', rec.status, rec.check_name, rec.details;
    END LOOP;
    
    RAISE NOTICE '';
    IF failed_checks = 0 THEN
        IF partial_checks = 0 THEN
            RAISE NOTICE '✅ ALL VALIDATION CHECKS PASSED!';
            RAISE NOTICE 'Schema normalization completed successfully.';
        ELSE
            RAISE NOTICE '⚠️  VALIDATION COMPLETED WITH PARTIAL RESULTS';
            RAISE NOTICE 'Some checks were skipped or partially successful.';
        END IF;
    ELSE
        RAISE NOTICE '❌ % VALIDATION CHECKS FAILED!', failed_checks;
        RAISE NOTICE 'Please review the failed checks above.';
    END IF;
    RAISE NOTICE '================================';
END $$;

-- Export validation results for logging
SELECT 
    check_name,
    status,
    details,
    created_at
FROM validation_results 
ORDER BY 
    CASE status 
        WHEN 'PASS' THEN 1 
        WHEN 'PARTIAL' THEN 2 
        WHEN 'SKIP' THEN 3 
        WHEN 'FAIL' THEN 4 
    END, check_name;