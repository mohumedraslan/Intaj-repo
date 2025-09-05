// src/app/dashboard/chatbots/actions.ts
// Server actions for chatbot CRUD (create, update, delete)
import { createClient } from '@/lib/supabaseClient';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createChatbot({ name, model, settings }: { name: string; model: string; settings: any }) {
  const supabase = createClient();
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
  revalidatePath('/dashboard/chatbots');
  return data;
}

export async function updateChatbot({ id, name, model, settings }: { id: string; name: string; model: string; settings: any }) {
  const supabase = createClient();
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('chatbots')
    .update({ name, model, settings })
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) throw error;
  revalidatePath(`/dashboard/chatbots/${id}`);
}

export async function deleteChatbot(id: string) {
  const supabase = createClient();
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('chatbots')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) throw error;
  revalidatePath('/dashboard/chatbots');
  redirect('/dashboard/chatbots');
}
