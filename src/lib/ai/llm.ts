import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { getResponse as openrouterGetResponse, streamResponse as openrouterStream } from '@/lib/openrouter';
import { getEmbedding } from '@/lib/embeddings';

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export interface AgentConfig {
  id: string;
  model?: string | null;
  provider?: 'openai' | 'openrouter' | null;
  base_prompt?: string | null;
}

export interface GenerateParams {
  agent: AgentConfig;
  messages: ChatMessage[]; // conversation history, newest last
  ragContext?: string; // optional precomputed context
  stream?: boolean;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function buildRagContext(agentId: string, userQuery: string): Promise<string> {
  try {
    const embedding = await getEmbedding(userQuery);
    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      agent_id: agentId,
      match_threshold: 0.7,
      match_count: 5,
    });
    if (error) return '';
    if (!data || data.length === 0) return '';
    const text = (data as Array<{ content: string }>).map((d) => d.content).join('\n\n');
    return `Relevant documents:\n${text}`;
  } catch {
    return '';
  }
}

export async function generate({ agent, messages, ragContext, stream }: GenerateParams): Promise<string> {
  const provider = agent.provider || (process.env.OPENROUTER_API_KEY ? 'openrouter' : 'openai');
  const model = agent.model || (provider === 'openrouter' ? 'openai/gpt-4o' : 'gpt-4o');

  // Ensure we have a system prompt
  const system = agent.base_prompt || 'You are a helpful AI assistant.';

  // Compute RAG context if not provided
  let context = ragContext;
  if (!context) {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    context = lastUser ? await buildRagContext(agent.id, lastUser.content) : '';
  }

  const combined: ChatMessage[] = [
    { role: 'system', content: `${system}${context ? `\n\nUse the following context to answer the user's question:\n${context}` : ''}` },
    ...messages,
  ];

  if (provider === 'openrouter') {
    if (stream) {
      // TODO: wire streaming to a caller-provided onToken callback when needed
      const text = await openrouterGetResponse(combined);
      return text;
    }
    const text = await openrouterGetResponse(combined);
    return text;
  } else {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const resp = await openai.chat.completions.create({
      model,
      messages: combined,
      temperature: 0.7,
      max_tokens: 1000,
    });
    return resp.choices?.[0]?.message?.content || '';
  }
}
