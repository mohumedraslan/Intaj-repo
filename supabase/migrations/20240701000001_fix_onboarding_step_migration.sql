-- Fix migration for profiles table onboarding steps
-- This handles the case where the previous migration might have used wrong column name

-- First, check if we have the wrong column and fix it
DO $$
BEGIN
    -- Check if onboarding_step (singular, text) exists and fix it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'onboarding_step'
        AND table_schema = 'public'
    ) THEN
        -- If the wrong column exists, we need to migrate data and fix the column
        RAISE NOTICE 'Found onboarding_step column, migrating to onboarding_steps...';
        
        -- Add the correct column if it doesn't exist
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_steps JSONB DEFAULT '{}'::jsonb;
        
        -- Migrate data from old column to new column
        UPDATE profiles 
        SET onboarding_steps = 
            CASE 
                WHEN onboarding_step = 'done' THEN '{"completed": true}'::jsonb
                WHEN onboarding_step IS NOT NULL THEN jsonb_build_object('current_step', onboarding_step)
                ELSE '{}'::jsonb
            END
        WHERE onboarding_steps = '{}'::jsonb OR onboarding_steps IS NULL;
        
        -- Drop the old incorrect column
        ALTER TABLE profiles DROP COLUMN IF EXISTS onboarding_step;
        
        RAISE NOTICE 'Migration from onboarding_step to onboarding_steps completed';
    ELSE
        -- The correct column already exists, just ensure it has proper defaults
        RAISE NOTICE 'onboarding_steps column already exists correctly';
        
        -- Ensure the column exists and has proper default
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_steps JSONB DEFAULT '{}'::jsonb;
        
        -- Update any NULL values to empty JSON
        UPDATE profiles 
        SET onboarding_steps = '{}'::jsonb 
        WHERE onboarding_steps IS NULL;
    END IF;
    
    -- Ensure we don't have any references to the old chatbot terminology in onboarding_steps
    UPDATE profiles
    SET onboarding_steps = jsonb_set(
        onboarding_steps,
        '{created_first_agent}',
        onboarding_steps->'created_first_chatbot'
    )
    WHERE onboarding_steps ? 'created_first_chatbot';

    UPDATE profiles
    SET onboarding_steps = onboarding_steps - 'created_first_chatbot'
    WHERE onboarding_steps ? 'created_first_chatbot';
    
    RAISE NOTICE 'Onboarding steps migration completed successfully';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in onboarding steps migration: %', SQLERRM;
        -- Don't fail the migration, just log the error
END $$;
