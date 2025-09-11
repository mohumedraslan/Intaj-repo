import { createClient } from '@/lib/supabaseClient'

export async function createDataSourcesTable() {
  const supabase = createClient()
  
  try {
    // Create table if it doesn't exist
    const { error: createError } = await supabase.rpc(
      'execute_sql',
      {
        sql: `
          CREATE TABLE IF NOT EXISTS data_sources (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            chatbot_id UUID NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            type TEXT NOT NULL CHECK (type IN ('website', 'file', 'text')),
            content TEXT NOT NULL,
            status TEXT NOT NULL CHECK (status IN ('pending', 'training', 'ready', 'error')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          -- Add RLS policies
          ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
          
          CREATE POLICY "Users can view their own data sources"
            ON data_sources
            FOR SELECT
            USING (auth.uid() = user_id);
            
          CREATE POLICY "Users can insert their own data sources"
            ON data_sources
            FOR INSERT
            WITH CHECK (auth.uid() = user_id);
            
          CREATE POLICY "Users can update their own data sources"
            ON data_sources
            FOR UPDATE
            USING (auth.uid() = user_id);
            
          CREATE POLICY "Users can delete their own data sources"
            ON data_sources
            FOR DELETE
            USING (auth.uid() = user_id);
        `
      }
    )
    
    if (createError) {
      console.error('Error creating data_sources table:', createError)
      return { success: false, error: createError }
    }
    
    return { success: true, message: 'Created data_sources table' }
  } catch (error) {
    console.error('Error in createDataSourcesTable:', error)
    return { success: false, error }
  }
}