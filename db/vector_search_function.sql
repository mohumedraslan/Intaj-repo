-- Supabase function for vector search (pgvector)
-- Place in db/database_updates.sql or run in SQL editor
CREATE OR REPLACE FUNCTION match_vectors(
  chatbot_id uuid,
  query_embedding vector,
  match_count int DEFAULT 5
)
RETURNS TABLE(
  id uuid,
  source_type text,
  source_id uuid,
  content text,
  embedding vector,
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  SELECT id, source_type, source_id, content, embedding,
    (embedding <#> query_embedding) AS similarity
  FROM vectors
  WHERE chatbot_id = match_vectors.chatbot_id
  ORDER BY embedding <#> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;
