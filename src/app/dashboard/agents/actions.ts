// src/app/dashboard/chatbots/actions.ts
// Server actions for chatbot CRUD (create, update, delete)
import { supabase } from '@/lib/supabaseClient';

// NOTE: Do not import this file into client components. Use API routes instead for client-server communication.

// Types for better type safety
interface CreateAgentParams {
  name: string;
  description?: string;
  model: string;
  base_prompt?: string;
  avatar_url?: string;
  settings: Record<string, unknown>;
  id?: string;
}

interface AgentData {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  model: string;
  base_prompt?: string | null;
  avatar_url?: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Validation functions
function validateAgentName(name: string): void {
  if (!name || typeof name !== 'string') {
    throw new Error('Agent name is required and must be a string');
  }
  if (name.trim().length === 0) {
    throw new Error('Agent name cannot be empty');
  }
  if (name.length > 100) {
    throw new Error('Agent name must be less than 100 characters');
  }
}

function validateModel(model: string): void {
  const validModels = ['gpt-4o', 'claude-3-sonnet', 'llama-3-70b'];
  if (!model || !validModels.includes(model)) {
    throw new Error(`Invalid model. Must be one of: ${validModels.join(', ')}`);
  }
}

function validateSettings(settings: Record<string, unknown>): void {
  if (!settings || typeof settings !== 'object') {
    throw new Error('Settings must be a valid object');
  }
}

// Enhanced error formatting
function formatError(error: any): string {
  if (!error) return 'Unknown error occurred';
  
  // Handle Supabase errors
  if (error.code && error.message) {
    return `Database error (${error.code}): ${error.message}`;
  }
  
  // Handle constraint violations
  if (error.message && error.message.includes('duplicate key')) {
    return 'An agent with this ID already exists';
  }
  
  if (error.message && error.message.includes('foreign key')) {
    return 'Invalid user reference';
  }
  
  // Handle other error types
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return JSON.stringify(error);
}

export async function createAgent(params: CreateAgentParams): Promise<AgentData> {
  const { name, description, model, base_prompt, avatar_url, settings, id } = params;
  
  try {
    // Validate input parameters
    validateAgentName(name);
    validateModel(model);
    validateSettings(settings);
    
    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      throw new Error(`Authentication error: ${formatError(authError)}`);
    }
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Use server-side UUID generation for better consistency
    const insertData: Partial<AgentData> = {
      user_id: user.id,
      name: name.trim(),
      model,
      settings: settings || { status: 'active' }
    };
    
    // Only include optional fields if they have meaningful values
    if (description && description.trim()) {
      insertData.description = description.trim();
    }
    if (base_prompt && base_prompt.trim()) {
      insertData.base_prompt = base_prompt.trim();
    }
    if (avatar_url && avatar_url.trim()) {
      insertData.avatar_url = avatar_url.trim();
    }
    if (id) {
      insertData.id = id;
    }
    
    console.log('Creating agent with data:', {
      ...insertData,
      user_id: '[REDACTED]' // Don't log sensitive data
    });
    
    // Use the correct table name (agents, not chatbots)
    const { data, error } = await supabase
      .from('agents')
      .insert(insertData)
      .select()
      .single();
      
    if (error) {
      const errorMessage = formatError(error);
      console.error('Database error creating agent:', {
        error: errorMessage,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      throw new Error(`Failed to create agent: ${errorMessage}`);
    }
    
    if (!data) {
      throw new Error('Agent created but no data returned from database');
    }
    
    console.log('Agent created successfully:', { id: data.id, name: data.name });
    return data as AgentData;
    
  } catch (err) {
    const errorMessage = formatError(err);
    console.error('Error in createAgent:', {
      error: errorMessage,
      params: {
        name,
        model,
        hasDescription: !!description,
        hasBasePrompt: !!base_prompt,
        hasAvatarUrl: !!avatar_url,
        settingsKeys: Object.keys(settings || {})
      }
    });
    throw new Error(errorMessage);
  }
}

interface UpdateAgentParams {
  name: string;
  description?: string;
  model: string;
  base_prompt?: string;
  avatar_url?: string;
  settings: Record<string, unknown>;
}

function validateUUID(id: string): void {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!id || !uuidRegex.test(id)) {
    throw new Error('Invalid agent ID format');
  }
}

export async function updateAgent(id: string, params: UpdateAgentParams): Promise<AgentData> {
  const { name, description, model, base_prompt, avatar_url, settings } = params;
  
  try {
    // Validate input parameters
    validateUUID(id);
    validateAgentName(name);
    validateModel(model);
    validateSettings(settings);
    
    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      throw new Error(`Authentication error: ${formatError(authError)}`);
    }
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Prepare update data
    const updateData: Partial<AgentData> = {
      name: name.trim(),
      model,
      settings,
      updated_at: new Date().toISOString()
    };
    
    // Handle optional fields properly
    if (description !== undefined) {
      updateData.description = description.trim() || null;
    }
    if (base_prompt !== undefined) {
      updateData.base_prompt = base_prompt.trim() || null;
    }
    if (avatar_url !== undefined) {
      updateData.avatar_url = avatar_url.trim() || null;
    }
    
    console.log('Updating agent:', { id, updateKeys: Object.keys(updateData) });
    
    // Use the correct table name (agents, not chatbots)
    const { data, error } = await supabase
      .from('agents')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
      
    if (error) {
      const errorMessage = formatError(error);
      console.error('Database error updating agent:', {
        error: errorMessage,
        code: error.code,
        agentId: id
      });
      throw new Error(`Failed to update agent: ${errorMessage}`);
    }
    
    if (!data) {
      throw new Error('Agent not found or you do not have permission to update it');
    }
    
    console.log('Agent updated successfully:', { id: data.id, name: data.name });
    return data as AgentData;
    
  } catch (err) {
    const errorMessage = formatError(err);
    console.error('Error in updateAgent:', {
      error: errorMessage,
      agentId: id,
      params: {
        name,
        model,
        hasDescription: !!description,
        hasBasePrompt: !!base_prompt,
        hasAvatarUrl: !!avatar_url
      }
    });
    throw new Error(errorMessage);
  }
}

export async function deleteAgent(id: string): Promise<void> {
  try {
    // Validate input
    validateUUID(id);
    
    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      throw new Error(`Authentication error: ${formatError(authError)}`);
    }
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    console.log('Deleting agent:', { id });
    
    // Use the correct table name (agents, not chatbots)
    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
      
    if (error) {
      const errorMessage = formatError(error);
      console.error('Database error deleting agent:', {
        error: errorMessage,
        code: error.code,
        agentId: id
      });
      throw new Error(`Failed to delete agent: ${errorMessage}`);
    }
    
    console.log('Agent deleted successfully:', { id });
    
  } catch (err) {
    const errorMessage = formatError(err);
    console.error('Error in deleteAgent:', {
      error: errorMessage,
      agentId: id
    });
    throw new Error(errorMessage);
  }
}
