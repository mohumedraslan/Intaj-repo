import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Supabase client with service role for admin access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Interface representing an Agent with its configuration
 */
interface Agent {
  id: string;
  name: string;
  model: string;
  base_prompt: string;
  settings?: Record<string, any>;
}

/**
 * Interface for document chunks returned from vector search
 */
interface DocumentChunk {
  content: string;
  similarity?: number;
}

/**
 * Parameters for generating a response
 */
interface GenerateResponseParams {
  agentId: string;
  message: string;
  userId: string;
}

/**
 * Generates a response from an agent based on user message and relevant context
 * @param params Object containing agentId, message, and userId
 * @returns A string containing the AI-generated response
 */
export async function generateResponse(params: GenerateResponseParams): Promise<string> {
  const { agentId, message, userId } = params;
  
  try {
    // Fetch the agent details
    const { data: agentData, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();
      
    if (agentError || !agentData) {
      console.error('Agent not found:', agentError);
      throw new Error('Agent not found');
    }
    
    const agent: Agent = {
      id: agentData.id,
      name: agentData.name,
      model: agentData.model || 'gpt-3.5-turbo',
      base_prompt: agentData.base_prompt || 'You are a helpful assistant.',
      settings: agentData.settings
    };

    // Step 1: Generate embedding for the user's message
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: message,
    });
    
    const embedding = embeddingResponse.data[0].embedding;
    
    // Step 2: Perform vector search to find relevant context
    const { data: relevantChunks, error } = await supabase.rpc(
      'match_documents',
      {
        query_embedding: embedding,
        agent_id: agent.id,
        match_threshold: 0.7, // Adjust threshold as needed
        match_count: 5, // Number of chunks to retrieve
      }
    ) as { data: DocumentChunk[] | null; error: any };
    
    if (error) {
      console.error('Vector search error:', error);
      throw new Error('Failed to retrieve relevant context');
    }
    
    // Step 3: Get recent conversation history
    const { data: recentMessages } = await supabase
      .from('messages')
      .select('role, content')
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: false })
      .limit(5);
    
    // Format conversation history
    const conversationHistory = recentMessages?.reverse().map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content
    })) || [];
    
    // Add current message to history
    conversationHistory.push({ role: 'user', content: message });
    
    // Step 4: Construct the final prompt with context
    let contextText = '';
    if (relevantChunks && relevantChunks.length > 0) {
      contextText = `Relevant documents:\n${relevantChunks
        .map((chunk: DocumentChunk) => chunk.content)
        .join('\n\n')}`;
    }

    // Step 4a: Check for agent-specific tools
    if (agent.settings?.agent_type === 'mail_manager') {
      const { readEmailsForAgent } = await import('@/lib/agents/tools/emailReader');
      const emailContext = await readEmailsForAgent({ agentId: agent.id, userId });
      contextText = `${emailContext}\n\n${contextText}`;
    }
    
    // Step 5: Call the language model with the combined prompt
    const response = await openai.chat.completions.create({
      model: agent.model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `${agent.base_prompt}\n\nUse the following context to answer the user's question:\n${contextText}`
        },
        ...conversationHistory
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });
    
    // Log usage after successful response generation
    await supabase.from('usage_logs').insert({
      user_id: userId,
      agent_id: agentId,
      type: 'message'
    });
    
    return response.choices[0].message.content || 'I\'m sorry, I couldn\'t generate a response.';
  } catch (error) {
    console.error('Error generating response:', error);
    return 'I\'m sorry, I\'m experiencing technical difficulties. Please try again later.';
  }
}