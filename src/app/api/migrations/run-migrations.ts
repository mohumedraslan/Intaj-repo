import { createClient } from '@/lib/supabaseClient'
import { addOnboardingStepsToProfiles } from './add-onboarding-steps-to-profiles'

export async function runMigrations() {
  console.log('Running database migrations...')
  
  try {
    // Run migrations
    const onboardingStepsResult = await addOnboardingStepsToProfiles()
    
    // Check database connection
    const supabase = createClient()
    
    // Test connection by querying chatbots table
    const { data, error } = await supabase
      .from('chatbots')
      .select('id')
      .limit(1)
    
    if (error) {
      console.error('Error connecting to database:', error)
      return { 
        success: false, 
        error,
        message: 'Could not connect to database. Please run the following migrations manually in the Supabase SQL editor:\n\n' +
          '1. Add columns to chatbots table:\n' +
          'ALTER TABLE chatbots ADD COLUMN IF NOT EXISTS base_prompt TEXT;\n' +
          'ALTER TABLE chatbots ADD COLUMN IF NOT EXISTS model TEXT DEFAULT \'gpt-4o\';\n\n' +
          '2. Create data_sources table:\n' +
          'CREATE TABLE IF NOT EXISTS data_sources (\n' +
          '  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),\n' +
          '  chatbot_id UUID NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,\n' +
          '  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,\n' +
          '  type TEXT NOT NULL CHECK (type IN (\'website\', \'file\', \'text\')),\n' +
          '  content TEXT NOT NULL,\n' +
          '  status TEXT NOT NULL DEFAULT \'pending\' CHECK (status IN (\'pending\', \'training\', \'ready\', \'error\')),\n' +
          '  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,\n' +
          '  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()\n' +
          ');\n\n' +
          '3. Create embeddings table:\n' +
          'CREATE EXTENSION IF NOT EXISTS vector;\n' +
          'CREATE TABLE IF NOT EXISTS embeddings (\n' +
          '  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),\n' +
          '  data_source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,\n' +
          '  content TEXT NOT NULL,\n' +
          '  embedding vector(1536),\n' +
          '  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL\n' +
          ');'
      }
    }
    
    return { 
      success: true,
      onboardingStepsResult,
      message: 'Database migrations completed successfully.'
    }
  } catch (error) {
    console.error('Error running migrations:', error)
    return { success: false, error }
  }
}