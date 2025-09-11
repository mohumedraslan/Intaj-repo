import { createClient } from '@/lib/supabaseClient'

export async function createEmbeddingsTable() {
  const supabase = createClient()
  
  try {
    // Create table if it doesn't exist
    const { error: createError } = await supabase.rpc(
      'execute_sql',
      {
        sql: `
          CREATE TABLE IF NOT EXISTS embeddings (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            data_source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            embedding VECTOR(1536),
            metadata JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          )
        `
      }
    )
    
    if (createError) {
      console.error('Error creating embeddings table:', createError)
      return { success: false, error: createError }
    }
    
    return { success: true, message: 'Created embeddings table' }
  } catch (error) {
    console.error('Error in createEmbeddingsTable:', error)
    return { success: false, error }
  }
}