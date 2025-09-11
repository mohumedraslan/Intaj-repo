<<<<<<< Updated upstream
// src/app/dashboard/chatbots/actions.ts
// Server actions for chatbot CRUD (create, update, delete)
import { supabase } from '@/lib/supabaseClient';

// NOTE: Do not import this file into client components. Use API routes instead for client-server communication.

export async function createChatbot({ name, model, settings }: { name: string; model: string; settings: Record<string, unknown> }) {
  // supabase is already imported and ready to use
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('chatbots')
    .insert({
      user_id: user.id,
      name,
      model,
      settings,
    })
    .select()
    .single();
  if (error) throw error;
  // Optionally trigger revalidation here if called from a server component
  return data;
}

export async function updateChatbot({ id, name, model, settings }: { id: string; name: string; model: string; settings: Record<string, unknown> }) {
  // supabase is already imported and ready to use
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('chatbots')
    .update({ name, model, settings })
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) throw error;
  // Optionally trigger revalidation here if called from a server component
}

export async function deleteChatbot(id: string) {
  // supabase is already imported and ready to use
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('chatbots')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) throw error;
  // Optionally trigger revalidation here if called from a server component
}
=======
<<<<<<< Updated upstream
// src/app/dashboard/chatbots/actions.ts
// Server actions for chatbot CRUD (create, update, delete)
import { supabase } from '@/lib/supabaseClient';

// NOTE: Do not import this file into client components. Use API routes instead for client-server communication.

export async function createChatbot({
  name,
  model,
  settings,
}: {
  name: string;
  model: string;
  settings: Record<string, unknown>;
}) {
  // supabase is already imported and ready to use
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('chatbots')
    .insert({
      user_id: user.id,
      name,
      model,
      settings,
    })
    .select()
    .single();
  if (error) throw error;
  // Optionally trigger revalidation here if called from a server component
  return data;
}

export async function updateChatbot({
  id,
  name,
  model,
  settings,
}: {
  id: string;
  name: string;
  model: string;
  settings: Record<string, unknown>;
}) {
  // supabase is already imported and ready to use
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('chatbots')
    .update({ name, model, settings })
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) throw error;
  // Optionally trigger revalidation here if called from a server component
}

export async function deleteChatbot(id: string) {
  // supabase is already imported and ready to use
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase.from('chatbots').delete().eq('id', id).eq('user_id', user.id);
  if (error) throw error;
  // Optionally trigger revalidation here if called from a server component
}
=======
// src/app/dashboard/chatbots/actions.ts
// Server actions for chatbot CRUD (create, update, delete)
import { supabase } from '@/lib/supabaseClient';

// NOTE: Do not import this file into client components. Use API routes instead for client-server communication.

export async function createChatbot({ 
  name, 
  description, 
  model, 
  avatar_url, 
  settings,
  id
}: { 
  name: string; 
  description?: string; 
  model: string; 
  avatar_url?: string; 
  settings: Record<string, unknown>;
  id?: string;
}) {
  // supabase is already imported and ready to use
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');
  
  // Generate a UUID if not provided
  const chatbotId = id || crypto.randomUUID();
  
  // Prepare insert data with proper handling of null/undefined values
  const insertData: Record<string, any> = {
    id: chatbotId,
    user_id: user.id,
    name,
    model,
    settings: settings || {}
  };
  
  // Only include these fields if they have values
  if (description !== undefined) insertData.description = description;
  if (avatar_url !== undefined) insertData.avatar_url = avatar_url;
  
  try {
    const { data, error } = await supabase
      .from('chatbots')
      .insert(insertData)
      .select()
      .single();
      
    if (error) {
      console.error('Error creating chatbot:', error);
      throw error;
    }
    
    // Optionally trigger revalidation here if called from a server component
    return data;
  } catch (err) {
    console.error('Error in createChatbot:', err);
    throw err;
  }
}

export async function updateChatbot(
  id: string, 
  { 
    name, 
    description, 
    model, 
    avatar_url, 
    settings 
  }: { 
    name: string; 
    description?: string; 
    model: string; 
    avatar_url?: string; 
    settings: Record<string, unknown> 
  }
) {
  // supabase is already imported and ready to use
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');
  
  // Validate UUID before updating
  if (!id || id === 'undefined' || id === 'null' || id === 'new') {
    throw new Error('Invalid chatbot ID');
  }
  
  // Prepare update data with proper handling of null/undefined values
  const updateData: Record<string, any> = {
    name,
    model,
    settings
  };
  
  // Only include these fields if they have values
  if (description !== undefined) updateData.description = description;
  if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
  
  const { error } = await supabase
    .from('chatbots')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id);
    
  if (error) {
    console.error('Error updating chatbot:', error);
    throw error;
  }
  // Optionally trigger revalidation here if called from a server component
}

export async function deleteChatbot(id: string) {
  // supabase is already imported and ready to use
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('chatbots')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) throw error;
  // Optionally trigger revalidation here if called from a server component
}
>>>>>>> Stashed changes
>>>>>>> Stashed changes
