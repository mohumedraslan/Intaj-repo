'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type DataSourceType = 'website' | 'file' | 'text'
type DataSourceStatus = 'pending' | 'training' | 'ready' | 'error'

interface CreateDataSourceParams {
  chatbotId: string
  type: DataSourceType
  content: string
}

export async function createDataSource(params: CreateDataSourceParams) {
  const { chatbotId, type, content } = params
  const supabase = createClient()
  
  // Get the current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    console.error('Error getting user:', userError)
    return { success: false, error: 'Authentication error' }
  }
  
  // Create the data source
  const { data, error } = await supabase
    .from('data_sources')
    .insert({
      chatbot_id: chatbotId,
      user_id: user.id,
      type,
      content,
      status: 'pending' as DataSourceStatus
    })
    .select()
  
  if (error) {
    console.error('Error creating data source:', error)
    return { success: false, error: error.message }
  }
  
  // Check if this is the user's first data source and update onboarding steps
  const { data: dataSources, error: dataSourcesError } = await supabase
    .from('data_sources')
    .select('id')
    .eq('user_id', user.id)
  
  if (!dataSourcesError && dataSources && dataSources.length === 1) {
    // This is the user's first data source, update onboarding steps
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('onboarding_steps')
      .eq('id', user.id)
      .single()
      
    if (!profileError && profile) {
      // Get current onboarding steps or use default if not set
      const currentSteps = profile.onboarding_steps || {
        created_first_chatbot: false,
        added_data_source: false,
        connected_channel: false,
        has_dismissed: false
      }
      
      // Update the added_data_source flag
      await supabase
        .from('profiles')
        .update({
          onboarding_steps: {
            ...currentSteps,
            added_data_source: true
          }
        })
        .eq('id', user.id)
    }
  }
  
  // Revalidate the chatbot page to show the new data source
  revalidatePath(`/dashboard/chatbots/${chatbotId}`)
  
  return { success: true, data: data[0] }
}

export async function getDataSources(chatbotId: string) {
  const supabase = createClient()
  
  // Get the current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    console.error('Error getting user:', userError)
    return { success: false, error: 'Authentication error' }
  }
  
  // Get all data sources for this chatbot
  const { data, error } = await supabase
    .from('data_sources')
    .select('*')
    .eq('chatbot_id', chatbotId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error getting data sources:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true, data }
}

export async function deleteDataSource(id: string, chatbotId: string) {
  const supabase = createClient()
  
  // Get the current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    console.error('Error getting user:', userError)
    return { success: false, error: 'Authentication error' }
  }
  
  // Delete the data source
  const { error } = await supabase
    .from('data_sources')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
  
  if (error) {
    console.error('Error deleting data source:', error)
    return { success: false, error: error.message }
  }
  
  // Revalidate the chatbot page to update the data sources list
  revalidatePath(`/dashboard/chatbots/${chatbotId}`)
  
  return { success: true }
}