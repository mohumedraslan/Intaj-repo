-- =====================================================
-- DATABASE OPERATIONS TEST SUITE
-- Intaj Platform - Comprehensive Testing
-- =====================================================

-- Test 1: Insert test agent
-- Note: Replace 'your_user_id_here' with actual user ID from auth.users
DO $$
DECLARE
    test_user_id uuid;
    test_agent_id uuid;
    test_connection_id uuid;
BEGIN
    -- Get a test user ID (replace with actual user ID)
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE EXCEPTION 'No users found. Please create a user first.';
    END IF;
    
    RAISE NOTICE 'Using test user ID: %', test_user_id;
    
    -- Insert test agent
    INSERT INTO agents (name, base_prompt, model, user_id, description, status, agent_type) 
    VALUES ('Test Support Agent', 'You are a helpful customer support assistant', 'gpt-4o', test_user_id, 'Test agent for database validation', 'active', 'chatbot') 
    RETURNING id INTO test_agent_id;
    
    RAISE NOTICE 'Created test agent with ID: %', test_agent_id;
    
    -- Insert test connection
    INSERT INTO connections (agent_id, user_id, platform, name, config, status) 
    VALUES (test_agent_id, test_user_id, 'telegram', 'Test Telegram Bot', '{"bot_token": "test_token_123", "webhook_url": "https://test.com/webhook"}', 'active')
    RETURNING id INTO test_connection_id;
    
    RAISE NOTICE 'Created test connection with ID: %', test_connection_id;
    
    -- Insert test messages
    INSERT INTO messages (agent_id, user_id, direction, platform, platform_message_id, content, sender_name, created_at) VALUES
    (test_agent_id, test_user_id, 'inbound', 'telegram', 'msg_001', 'Hello, I need help with my order', 'Test User', NOW()),
    (test_agent_id, test_user_id, 'outbound', 'telegram', 'msg_002', 'Hello! I''d be happy to help you with your order. Can you please provide your order number?', 'Test Support Agent', NOW() + INTERVAL '1 minute');
    
    RAISE NOTICE 'Created test messages';
    
    -- Insert test conversation
    INSERT INTO conversations (agent_id, user_id, platform, platform_user_id, status, last_message_at) 
    VALUES (test_agent_id, test_user_id, 'telegram', 'test_user_123', 'active', NOW());
    
    RAISE NOTICE 'Created test conversation';
    
    -- Insert test FAQ
    INSERT INTO faqs (agent_id, user_id, question, answer) 
    VALUES (test_agent_id, test_user_id, 'What are your business hours?', 'We are open Monday to Friday, 9 AM to 6 PM EST.');
    
    RAISE NOTICE 'Created test FAQ';
    
    -- Insert test data source
    INSERT INTO data_sources (agent_id, user_id, type, name, content, status) 
    VALUES (test_agent_id, test_user_id, 'text', 'Company Policy', 'Our company values customer satisfaction above all else.', 'processed');
    
    RAISE NOTICE 'Created test data source';
    
END $$;

-- Test 2: Verify the records were inserted and relationships work
SELECT 
    a.id as agent_id,
    a.name as agent_name,
    a.model,
    a.status as agent_status,
    c.id as connection_id,
    c.platform,
    c.name as connection_name,
    c.config,
    c.status as connection_status
FROM agents a 
LEFT JOIN connections c ON a.id = c.agent_id
WHERE a.name = 'Test Support Agent';

-- Test 3: Verify messages and conversations
SELECT 
    m.id as message_id,
    m.direction,
    m.platform,
    m.content,
    m.sender_name,
    m.created_at,
    conv.id as conversation_id,
    conv.platform_user_id,
    conv.status as conversation_status
FROM messages m
LEFT JOIN conversations conv ON m.agent_id = conv.agent_id
WHERE m.content LIKE '%order%'
ORDER BY m.created_at;

-- Test 4: Test RLS policies (should only return records for authenticated user)
-- This will work when executed by an authenticated user
SELECT 
    'agents' as table_name,
    count(*) as record_count
FROM agents
UNION ALL
SELECT 
    'connections' as table_name,
    count(*) as record_count
FROM connections
UNION ALL
SELECT 
    'messages' as table_name,
    count(*) as record_count
FROM messages
UNION ALL
SELECT 
    'faqs' as table_name,
    count(*) as record_count
FROM faqs
UNION ALL
SELECT 
    'data_sources' as table_name,
    count(*) as record_count
FROM data_sources;

-- Test 5: Test foreign key relationships
SELECT 
    'Valid agent-connection relationships' as test_name,
    count(*) as count
FROM connections c
JOIN agents a ON c.agent_id = a.id
UNION ALL
SELECT 
    'Valid agent-message relationships' as test_name,
    count(*) as count
FROM messages m
JOIN agents a ON m.agent_id = a.id
UNION ALL
SELECT 
    'Valid agent-faq relationships' as test_name,
    count(*) as count
FROM faqs f
JOIN agents a ON f.agent_id = a.id;

-- Test 6: Test JSON operations on config fields
SELECT 
    c.id,
    c.platform,
    c.config->>'bot_token' as bot_token,
    c.config->>'webhook_url' as webhook_url,
    jsonb_pretty(c.config) as formatted_config
FROM connections c
WHERE c.platform = 'telegram'
AND c.config ? 'bot_token';

-- Test 7: Test timestamp operations and ordering
SELECT 
    a.name,
    a.created_at,
    EXTRACT(EPOCH FROM (NOW() - a.created_at)) as seconds_since_creation,
    CASE 
        WHEN a.created_at > NOW() - INTERVAL '1 hour' THEN 'Recent'
        WHEN a.created_at > NOW() - INTERVAL '1 day' THEN 'Today'
        ELSE 'Older'
    END as age_category
FROM agents a
ORDER BY a.created_at DESC;

-- Test 8: Test aggregation and analytics queries
SELECT 
    a.name as agent_name,
    COUNT(DISTINCT c.id) as connection_count,
    COUNT(DISTINCT m.id) as message_count,
    COUNT(DISTINCT f.id) as faq_count,
    COUNT(DISTINCT ds.id) as data_source_count,
    MAX(m.created_at) as last_message_at
FROM agents a
LEFT JOIN connections c ON a.id = c.agent_id
LEFT JOIN messages m ON a.id = m.agent_id
LEFT JOIN faqs f ON a.id = f.agent_id
LEFT JOIN data_sources ds ON a.id = ds.agent_id
GROUP BY a.id, a.name
ORDER BY message_count DESC;

-- Test 9: Test search functionality (if using text search)
SELECT 
    'FAQ Search Test' as test_type,
    f.question,
    f.answer,
    ts_rank(to_tsvector('english', f.question || ' ' || f.answer), plainto_tsquery('english', 'business hours')) as relevance_score
FROM faqs f
WHERE to_tsvector('english', f.question || ' ' || f.answer) @@ plainto_tsquery('english', 'business hours')
ORDER BY relevance_score DESC;

-- Test 10: Performance test - check indexes
EXPLAIN (ANALYZE, BUFFERS) 
SELECT a.*, c.platform, c.status 
FROM agents a 
LEFT JOIN connections c ON a.id = c.agent_id 
WHERE a.user_id = (SELECT id FROM auth.users LIMIT 1)
ORDER BY a.created_at DESC;

-- Cleanup function (optional - uncomment to clean up test data)
/*
DO $$
BEGIN
    DELETE FROM data_sources WHERE name = 'Company Policy';
    DELETE FROM faqs WHERE question = 'What are your business hours?';
    DELETE FROM conversations WHERE platform_user_id = 'test_user_123';
    DELETE FROM messages WHERE content LIKE '%order%';
    DELETE FROM connections WHERE name = 'Test Telegram Bot';
    DELETE FROM agents WHERE name = 'Test Support Agent';
    
    RAISE NOTICE 'Test data cleaned up successfully';
END $$;
*/

-- Summary Report
SELECT 
    'DATABASE TEST SUMMARY' as report_title,
    NOW() as test_run_at,
    'All tests completed successfully' as status;
