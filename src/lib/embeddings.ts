// src/lib/embeddings.ts
import { supabase } from './storageClient';

const OPENROUTER_EMBEDDINGS_URL = 'https://openrouter.ai/api/v1/embeddings';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch(OPENROUTER_EMBEDDINGS_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-ada-002',
      input: text,
    }),
  });
  if (!res.ok) throw new Error('Failed to get embedding');
  const data = await res.json();
  return data.data[0].embedding;
}

export async function storeEmbedding({
  chatbot_id,
  source_type,
  source_id,
  content,
  embedding,
}: {
  chatbot_id: string;
  source_type: string;
  source_id?: string;
  content: string;
  embedding: number[];
}) {
  const { error } = await supabase.from('vectors').insert({
    chatbot_id,
    source_type,
    source_id,
    content,
    embedding,
  });
  if (error) throw error;
}

export async function queryVectorStore(chatbot_id: string, queryEmbedding: number[], topK = 5) {
  // pgvector cosine similarity search
  const { data, error } = await supabase.rpc('match_vectors', {
    chatbot_id,
    query_embedding: queryEmbedding,
    match_count: topK,
  });
  if (error) throw error;
  return data;
}
