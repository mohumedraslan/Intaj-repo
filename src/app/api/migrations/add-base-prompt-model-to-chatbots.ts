import { createClient } from '@/lib/supabaseClient'

export async function addBasePromptModelToChatbots() {
  const supabase = createClient()
  
  try {
    // Add base_prompt column if it doesn't exist
    const { error: addBasePromptError } = await supabase
      .rpc('execute_sql', {
        sql: 'ALTER TABLE IF EXISTS chatbots ADD COLUMN IF NOT EXISTS base_prompt TEXT'
      })
    
    if (addBasePromptError) {
      console.error('Error adding base_prompt column:', addBasePromptError)
      return { success: false, error: addBasePromptError }
    }
    
    // Add model column if it doesn't exist
    const { error: addModelError } = await supabase
      .rpc('execute_sql', {
        sql: "ALTER TABLE IF EXISTS chatbots ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'gpt-4o'"
      })
    
    if (addModelError) {
      console.error('Error adding model column:', addModelError)
      return { success: false, error: addModelError }
    }
    
    return { success: true, message: 'Added base_prompt and model columns to chatbots table' }
  } catch (error) {
    console.error('Error in addBasePromptModelToChatbots:', error)
    return { success: false, error }
  }
}