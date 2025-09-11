import { createClient } from '@/lib/supabaseClient'

export async function addOnboardingStepsToProfiles() {
  const supabase = createClient()
  
  try {
    // Add onboarding_steps column to profiles table
    const { error } = await supabase.rpc(
      'execute_sql',
      {
        sql: `
          ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_steps JSONB DEFAULT '{
            "created_first_chatbot": false,
            "added_data_source": false,
            "connected_channel": false,
            "has_dismissed": false
          }';
        `
      }
    )
    
    if (error) {
      console.error('Error adding onboarding_steps column:', error)
      return { success: false, error }
    }
    
    return { 
      success: true,
      message: 'Successfully added onboarding_steps column to profiles table'
    }
  } catch (error) {
    console.error('Error adding onboarding_steps column:', error)
    return { success: false, error }
  }
}