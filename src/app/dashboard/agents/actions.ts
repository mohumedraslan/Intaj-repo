// src/app/dashboard/agents/actions.ts
// Server actions for agent CRUD (update, delete)
'use server';

import { supabase } from '@/lib/supabaseClient';
import { revalidatePath } from 'next/cache';
import { createHash, randomBytes } from 'crypto';

// NOTE: Do not import this file into client components. Use API routes instead for client-server communication.

export async function updateAgent({ id, name, description, model, settings }: { id: string; name: string; description?: string; model: string; settings: Record<string, unknown> }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('chatbots')
    .update({ name, description, model, settings })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;

  revalidatePath(`/dashboard/agents/${id}`);
}

export async function deleteAgent(id: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('chatbots')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;

  revalidatePath('/dashboard/agents');
}

export async function updateAgentPublicStatus({ id, is_public }: { id: string; is_public: boolean }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('chatbots')
      .update({ is_public })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
        console.error("Error updating agent public status:", error);
        throw error;
    };

    revalidatePath(`/dashboard/agents/${id}`);
}

export async function createApiKey(name: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const apiKey = `intaj_sk_${randomBytes(16).toString('hex')}`;
    const keyHash = createHash('sha256').update(apiKey).digest('hex');
    const keyPrefix = apiKey.substring(0, 11);

    const { data, error } = await supabase
        .from('api_keys')
        .insert({
            user_id: user.id,
            name,
            key_prefix: keyPrefix,
            key_hash: keyHash,
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating API key:", error);
        throw error;
    }

    revalidatePath('/dashboard/agents');
    return { ...data, apiKey }; // Return the full key this one time
}

export async function deleteApiKey(key_prefix: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('key_prefix', key_prefix)
        .eq('user_id', user.id);

    if (error) {
        console.error("Error deleting API key:", error);
        throw error;
    }

    revalidatePath('/dashboard/agents');
}
