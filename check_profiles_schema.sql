-- Check profiles table schema to identify any issues
-- Run this in Supabase SQL Editor to diagnose the problem

-- 1. Check current profiles table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'profiles' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if both onboarding_step and onboarding_steps exist
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'profiles' 
            AND column_name = 'onboarding_step'
        ) THEN 'onboarding_step column EXISTS (PROBLEM!)'
        ELSE 'onboarding_step column does not exist (GOOD)'
    END as onboarding_step_status,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'profiles' 
            AND column_name = 'onboarding_steps'
        ) THEN 'onboarding_steps column EXISTS (GOOD)'
        ELSE 'onboarding_steps column does not exist (PROBLEM!)'
    END as onboarding_steps_status;

-- 3. Check sample data in onboarding_steps if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'onboarding_steps'
    ) THEN
        RAISE NOTICE 'Sample onboarding_steps data:';
        PERFORM * FROM profiles LIMIT 3;
    END IF;
END $$;

-- 4. Show any constraints on the profiles table
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    tc.table_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'profiles'
    AND tc.table_schema = 'public';

-- 5. Check for any migration history issues
SELECT 
    version,
    name,
    executed_at
FROM supabase_migrations.schema_migrations 
WHERE name LIKE '%chatbot%' OR name LIKE '%agent%' OR name LIKE '%onboarding%'
ORDER BY executed_at DESC;

-- 6. Quick fix if onboarding_step (singular) exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'onboarding_step'
    ) THEN
        RAISE NOTICE 'FOUND PROBLEM: onboarding_step column exists!';
        RAISE NOTICE 'This will cause migration failures.';
        RAISE NOTICE 'Run the fix migration: 20240701000001_fix_onboarding_step_migration.sql';
    ELSE
        RAISE NOTICE 'Schema looks correct - onboarding_steps (plural) is being used.';
    END IF;
END $$;
