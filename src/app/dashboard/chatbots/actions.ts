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
