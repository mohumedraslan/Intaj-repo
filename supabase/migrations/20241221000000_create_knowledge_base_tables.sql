-- Knowledge Base Tables Migration
-- Creates tables for document management, vector storage, and knowledge base operations

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Knowledge Base Documents Table
CREATE TABLE IF NOT EXISTS knowledge_base_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed', 'deleted')),
  chunks_count INTEGER DEFAULT 0,
  tokens_count INTEGER DEFAULT 0,
  embeddings_count INTEGER DEFAULT 0,
  processing_time INTEGER, -- in milliseconds
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document Versions Table (for version history)
CREATE TABLE IF NOT EXISTS knowledge_base_document_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES knowledge_base_documents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  chunks_count INTEGER DEFAULT 0,
  tokens_count INTEGER DEFAULT 0,
  processing_result JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(document_id, version)
);

-- Document Chunks Table (for vector storage metadata)
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL, -- References the document processing ID
  kb_document_id UUID REFERENCES knowledge_base_documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding VECTOR(1536), -- OpenAI text-embedding-3-small dimensions
  metadata JSONB DEFAULT '{}',
  chunk_index INTEGER NOT NULL,
  total_chunks INTEGER NOT NULL,
  token_count INTEGER NOT NULL,
  start_offset INTEGER DEFAULT 0,
  end_offset INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LLM Usage Logs Table (for tracking embedding and LLM usage)
CREATE TABLE IF NOT EXISTS llm_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  conversation_id UUID,
  message_id TEXT,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_input INTEGER NOT NULL DEFAULT 0,
  tokens_output INTEGER NOT NULL DEFAULT 0,
  tokens_total INTEGER NOT NULL DEFAULT 0,
  cost_usd DECIMAL(10,6),
  latency_ms INTEGER NOT NULL,
  request_id TEXT,
  response_status TEXT NOT NULL CHECK (response_status IN ('success', 'error', 'timeout')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_kb_documents_agent_id ON knowledge_base_documents(agent_id);
CREATE INDEX IF NOT EXISTS idx_kb_documents_user_id ON knowledge_base_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_kb_documents_status ON knowledge_base_documents(status);
CREATE INDEX IF NOT EXISTS idx_kb_documents_created_at ON knowledge_base_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kb_documents_file_type ON knowledge_base_documents(file_type);

CREATE INDEX IF NOT EXISTS idx_kb_document_versions_document_id ON knowledge_base_document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_kb_document_versions_version ON knowledge_base_document_versions(document_id, version);

CREATE INDEX IF NOT EXISTS idx_document_chunks_agent_id ON document_chunks(agent_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_kb_document_id ON document_chunks(kb_document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_llm_usage_logs_agent_id ON llm_usage_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_llm_usage_logs_created_at ON llm_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_usage_logs_provider ON llm_usage_logs(provider);
CREATE INDEX IF NOT EXISTS idx_llm_usage_logs_model ON llm_usage_logs(model);

-- RLS Policies
ALTER TABLE knowledge_base_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_usage_logs ENABLE ROW LEVEL SECURITY;

-- Knowledge Base Documents Policies
CREATE POLICY "Users can view their own knowledge base documents" ON knowledge_base_documents
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own knowledge base documents" ON knowledge_base_documents
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own knowledge base documents" ON knowledge_base_documents
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own knowledge base documents" ON knowledge_base_documents
  FOR DELETE USING (user_id = auth.uid());

-- Document Versions Policies
CREATE POLICY "Users can view document versions for their documents" ON knowledge_base_document_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM knowledge_base_documents 
      WHERE id = document_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert document versions for their documents" ON knowledge_base_document_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM knowledge_base_documents 
      WHERE id = document_id AND user_id = auth.uid()
    )
  );

-- Document Chunks Policies
CREATE POLICY "Users can view chunks for their agents" ON document_chunks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE id = agent_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert chunks for their agents" ON document_chunks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE id = agent_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update chunks for their agents" ON document_chunks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE id = agent_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete chunks for their agents" ON document_chunks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE id = agent_id AND user_id = auth.uid()
    )
  );

-- LLM Usage Logs Policies
CREATE POLICY "Users can view usage logs for their agents" ON llm_usage_logs
  FOR SELECT USING (
    agent_id IS NULL OR EXISTS (
      SELECT 1 FROM agents 
      WHERE id = agent_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage usage logs" ON llm_usage_logs
  FOR ALL USING (auth.role() = 'service_role');

-- Functions for vector similarity search
CREATE OR REPLACE FUNCTION match_documents(
  agent_id UUID,
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    document_chunks.id,
    document_chunks.content,
    document_chunks.metadata,
    1 - (document_chunks.embedding <=> query_embedding) AS similarity
  FROM document_chunks
  WHERE document_chunks.agent_id = match_documents.agent_id
    AND 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY document_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to get knowledge base statistics
CREATE OR REPLACE FUNCTION get_knowledge_base_stats(agent_id UUID)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  stats JSON;
BEGIN
  SELECT json_build_object(
    'total_documents', COUNT(*),
    'total_chunks', COALESCE(SUM(chunks_count), 0),
    'total_tokens', COALESCE(SUM(tokens_count), 0),
    'total_size', COALESCE(SUM(file_size), 0),
    'documents_by_status', (
      SELECT json_object_agg(status, count)
      FROM (
        SELECT status, COUNT(*) as count
        FROM knowledge_base_documents
        WHERE knowledge_base_documents.agent_id = get_knowledge_base_stats.agent_id
        GROUP BY status
      ) status_counts
    ),
    'documents_by_type', (
      SELECT json_object_agg(file_type, count)
      FROM (
        SELECT file_type, COUNT(*) as count
        FROM knowledge_base_documents
        WHERE knowledge_base_documents.agent_id = get_knowledge_base_stats.agent_id
        GROUP BY file_type
      ) type_counts
    ),
    'last_updated', MAX(updated_at)
  ) INTO stats
  FROM knowledge_base_documents
  WHERE knowledge_base_documents.agent_id = get_knowledge_base_stats.agent_id
    AND status != 'deleted';
  
  RETURN stats;
END;
$$;

-- Function to clean up old usage logs (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_usage_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM llm_usage_logs
  WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_knowledge_base_documents_updated_at
  BEFORE UPDATE ON knowledge_base_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_chunks_updated_at
  BEFORE UPDATE ON document_chunks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE knowledge_base_documents IS 'Stores metadata about documents uploaded to agent knowledge bases';
COMMENT ON TABLE knowledge_base_document_versions IS 'Stores version history for knowledge base documents';
COMMENT ON TABLE document_chunks IS 'Stores processed document chunks with embeddings for vector search';
COMMENT ON TABLE llm_usage_logs IS 'Tracks LLM API usage for billing and analytics';

COMMENT ON FUNCTION match_documents IS 'Performs vector similarity search on document chunks';
COMMENT ON FUNCTION get_knowledge_base_stats IS 'Returns aggregated statistics for an agent knowledge base';
COMMENT ON FUNCTION cleanup_old_usage_logs IS 'Removes old usage logs to manage database size';
