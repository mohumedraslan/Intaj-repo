/**
 * RAG (Retrieval Augmented Generation) Service
 * Handles document ingestion, vector search, and context retrieval for LLM enhancement
 */

import { LLMProvider, LLMEmbeddingRequest } from '../base/LLMProvider';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

export interface DocumentMetadata {
  title?: string;
  source?: string;
  author?: string;
  category?: string;
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
  language?: string;
  contentType?: 'text' | 'markdown' | 'html' | 'pdf' | 'docx';
  url?: string;
  fileSize?: number;
}

export interface DocumentChunk {
  id: string;
  agentId: string;
  content: string;
  embedding: number[];
  metadata: DocumentMetadata;
  chunkIndex: number;
  totalChunks: number;
  tokenCount: number;
  createdAt: Date;
}

export interface RetrievedDocument {
  id: string;
  content: string;
  metadata: DocumentMetadata;
  relevanceScore: number;
  chunkIndex: number;
  totalChunks: number;
}

export interface RAGContext {
  query: string;
  retrievedDocuments: RetrievedDocument[];
  totalDocuments: number;
  maxRelevanceScore: number;
  minRelevanceScore: number;
  processingTime: number;
}

export interface IngestionResult {
  success: boolean;
  documentId: string;
  chunksCreated: number;
  tokensProcessed: number;
  embeddingsGenerated: number;
  processingTime: number;
  error?: string;
}

export interface RAGConfig {
  chunkSize: number;
  chunkOverlap: number;
  maxChunks: number;
  embeddingModel: string;
  similarityThreshold: number;
  maxRetrievedDocuments: number;
  enableReranking: boolean;
  enableHybridSearch: boolean;
}

const DEFAULT_RAG_CONFIG: RAGConfig = {
  chunkSize: 1000,
  chunkOverlap: 200,
  maxChunks: 1000,
  embeddingModel: 'text-embedding-3-small',
  similarityThreshold: 0.7,
  maxRetrievedDocuments: 5,
  enableReranking: false,
  enableHybridSearch: false
};

export class RAGService {
  private supabase;
  private embeddingProvider: LLMProvider;
  private config: RAGConfig;
  
  constructor(embeddingProvider: LLMProvider, config: Partial<RAGConfig> = {}) {
    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    this.embeddingProvider = embeddingProvider;
    this.config = { ...DEFAULT_RAG_CONFIG, ...config };
  }
  
  /**
   * Retrieve relevant context for a query
   */
  async retrieveContext(
    query: string,
    agentId: string,
    maxResults: number = this.config.maxRetrievedDocuments
  ): Promise<RAGContext> {
    const startTime = Date.now();
    
    try {
      console.log('Retrieving RAG context:', {
        agentId,
        query: query.substring(0, 100) + '...',
        maxResults
      });
      
      // Generate query embedding
      const queryEmbedding = await this.generateQueryEmbedding(query);
      
      // Perform vector similarity search
      const retrievedDocuments = await this.performVectorSearch(
        agentId,
        queryEmbedding,
        maxResults
      );
      
      // Optional: Perform hybrid search (vector + keyword)
      if (this.config.enableHybridSearch) {
        const keywordResults = await this.performKeywordSearch(agentId, query, maxResults);
        // Merge and rerank results
        // Implementation would combine vector and keyword results
      }
      
      // Optional: Rerank results using a reranking model
      if (this.config.enableReranking && retrievedDocuments.length > 1) {
        // Implementation would use a reranking model to improve result ordering
      }
      
      const processingTime = Date.now() - startTime;
      
      const context: RAGContext = {
        query,
        retrievedDocuments,
        totalDocuments: retrievedDocuments.length,
        maxRelevanceScore: retrievedDocuments.length > 0 ? Math.max(...retrievedDocuments.map(d => d.relevanceScore)) : 0,
        minRelevanceScore: retrievedDocuments.length > 0 ? Math.min(...retrievedDocuments.map(d => d.relevanceScore)) : 0,
        processingTime
      };
      
      console.log('RAG context retrieved:', {
        agentId,
        documentsFound: retrievedDocuments.length,
        maxScore: context.maxRelevanceScore,
        processingTime
      });
      
      return context;
      
    } catch (error) {
      console.error('Failed to retrieve RAG context:', {
        agentId,
        query: query.substring(0, 100) + '...',
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Return empty context on error
      return {
        query,
        retrievedDocuments: [],
        totalDocuments: 0,
        maxRelevanceScore: 0,
        minRelevanceScore: 0,
        processingTime: Date.now() - startTime
      };
    }
  }
  
  /**
   * Ingest a document into the knowledge base
   */
  async ingestDocument(
    agentId: string,
    content: string,
    metadata: DocumentMetadata = {}
  ): Promise<IngestionResult> {
    const startTime = Date.now();
    const documentId = this.generateDocumentId();
    
    try {
      console.log('Ingesting document:', {
        agentId,
        documentId,
        contentLength: content.length,
        metadata: { ...metadata, content: undefined }
      });
      
      // Validate input
      if (!content.trim()) {
        throw new Error('Document content cannot be empty');
      }
      
      if (content.length > 1000000) { // 1MB limit
        throw new Error('Document content exceeds maximum size limit');
      }
      
      // Chunk the document
      const chunks = this.chunkDocument(content, metadata);
      
      if (chunks.length === 0) {
        throw new Error('No valid chunks generated from document');
      }
      
      if (chunks.length > this.config.maxChunks) {
        throw new Error(`Document generates too many chunks (${chunks.length} > ${this.config.maxChunks})`);
      }
      
      // Generate embeddings for all chunks
      const chunksWithEmbeddings = await this.generateChunkEmbeddings(chunks, agentId, documentId);
      
      // Store chunks in database
      await this.storeDocumentChunks(chunksWithEmbeddings);
      
      const processingTime = Date.now() - startTime;
      const totalTokens = chunksWithEmbeddings.reduce((sum, chunk) => sum + chunk.tokenCount, 0);
      
      const result: IngestionResult = {
        success: true,
        documentId,
        chunksCreated: chunksWithEmbeddings.length,
        tokensProcessed: totalTokens,
        embeddingsGenerated: chunksWithEmbeddings.length,
        processingTime
      };
      
      console.log('Document ingestion completed:', result);
      
      return result;
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.error('Document ingestion failed:', {
        agentId,
        documentId,
        error: errorMessage,
        processingTime
      });
      
      return {
        success: false,
        documentId,
        chunksCreated: 0,
        tokensProcessed: 0,
        embeddingsGenerated: 0,
        processingTime,
        error: errorMessage
      };
    }
  }
  
  /**
   * Delete a document from the knowledge base
   */
  async deleteDocument(agentId: string, documentId: string): Promise<boolean> {
    try {
      console.log('Deleting document:', { agentId, documentId });
      
      const { error } = await this.supabase
        .from('document_chunks')
        .delete()
        .eq('agent_id', agentId)
        .eq('document_id', documentId);
      
      if (error) {
        console.error('Failed to delete document:', error);
        return false;
      }
      
      console.log('Document deleted successfully:', { agentId, documentId });
      return true;
      
    } catch (error) {
      console.error('Error deleting document:', {
        agentId,
        documentId,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }
  
  /**
   * Get knowledge base statistics for an agent
   */
  async getKnowledgeBaseStats(agentId: string): Promise<{
    totalDocuments: number;
    totalChunks: number;
    totalTokens: number;
    lastUpdated?: Date;
    categories: string[];
    sources: string[];
  }> {
    try {
      const { data: chunks, error } = await this.supabase
        .from('document_chunks')
        .select('*')
        .eq('agent_id', agentId);
      
      if (error) {
        throw error;
      }
      
      const documentIds = new Set<string>();
      const categories = new Set<string>();
      const sources = new Set<string>();
      let totalTokens = 0;
      let lastUpdated: Date | undefined;
      
      for (const chunk of chunks || []) {
        documentIds.add(chunk.document_id);
        totalTokens += chunk.token_count || 0;
        
        if (chunk.metadata?.category) {
          categories.add(chunk.metadata.category);
        }
        
        if (chunk.metadata?.source) {
          sources.add(chunk.metadata.source);
        }
        
        const chunkDate = new Date(chunk.created_at);
        if (!lastUpdated || chunkDate > lastUpdated) {
          lastUpdated = chunkDate;
        }
      }
      
      return {
        totalDocuments: documentIds.size,
        totalChunks: chunks?.length || 0,
        totalTokens,
        lastUpdated,
        categories: Array.from(categories),
        sources: Array.from(sources)
      };
      
    } catch (error) {
      console.error('Failed to get knowledge base stats:', {
        agentId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        totalDocuments: 0,
        totalChunks: 0,
        totalTokens: 0,
        categories: [],
        sources: []
      };
    }
  }
  
  // Private helper methods
  
  private async generateQueryEmbedding(query: string): Promise<number[]> {
    const embeddingRequest: LLMEmbeddingRequest = {
      input: query,
      model: this.config.embeddingModel
    };
    
    const response = await this.embeddingProvider.getEmbedding(embeddingRequest);
    return response.embeddings[0];
  }
  
  private async performVectorSearch(
    agentId: string,
    queryEmbedding: number[],
    maxResults: number
  ): Promise<RetrievedDocument[]> {
    // Use Supabase's vector similarity search
    // This requires the pgvector extension and proper indexing
    const { data: results, error } = await this.supabase.rpc('match_documents', {
      agent_id: agentId,
      query_embedding: queryEmbedding,
      match_threshold: this.config.similarityThreshold,
      match_count: maxResults
    });
    
    if (error) {
      console.error('Vector search failed:', error);
      return [];
    }
    
    return (results || []).map((result: any) => ({
      id: result.id,
      content: result.content,
      metadata: result.metadata || {},
      relevanceScore: result.similarity,
      chunkIndex: result.chunk_index,
      totalChunks: result.total_chunks
    }));
  }
  
  private async performKeywordSearch(
    agentId: string,
    query: string,
    maxResults: number
  ): Promise<RetrievedDocument[]> {
    // Implement full-text search using PostgreSQL's built-in search
    const { data: results, error } = await this.supabase
      .from('document_chunks')
      .select('*')
      .eq('agent_id', agentId)
      .textSearch('content', query)
      .limit(maxResults);
    
    if (error) {
      console.error('Keyword search failed:', error);
      return [];
    }
    
    return (results || []).map((result: any) => ({
      id: result.id,
      content: result.content,
      metadata: result.metadata || {},
      relevanceScore: 0.5, // Default score for keyword matches
      chunkIndex: result.chunk_index,
      totalChunks: result.total_chunks
    }));
  }
  
  private chunkDocument(content: string, metadata: DocumentMetadata): Array<{
    content: string;
    metadata: DocumentMetadata;
    chunkIndex: number;
  }> {
    const chunks: Array<{ content: string; metadata: DocumentMetadata; chunkIndex: number }> = [];
    
    // Simple text chunking strategy
    // In production, you might want more sophisticated chunking based on content type
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    let currentChunk = '';
    let chunkIndex = 0;
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;
      
      const potentialChunk = currentChunk + (currentChunk ? '. ' : '') + trimmedSentence;
      
      if (potentialChunk.length > this.config.chunkSize && currentChunk.length > 0) {
        // Save current chunk and start a new one
        chunks.push({
          content: currentChunk.trim(),
          metadata: { ...metadata },
          chunkIndex
        });
        
        // Start new chunk with overlap
        const overlapWords = currentChunk.split(' ').slice(-Math.floor(this.config.chunkOverlap / 5));
        currentChunk = overlapWords.join(' ') + (overlapWords.length > 0 ? ' ' : '') + trimmedSentence;
        chunkIndex++;
      } else {
        currentChunk = potentialChunk;
      }
    }
    
    // Add the last chunk if it has content
    if (currentChunk.trim().length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        metadata: { ...metadata },
        chunkIndex
      });
    }
    
    // Update total chunks in metadata
    const totalChunks = chunks.length;
    chunks.forEach(chunk => {
      chunk.metadata = { ...chunk.metadata, totalChunks };
    });
    
    return chunks;
  }
  
  private async generateChunkEmbeddings(
    chunks: Array<{ content: string; metadata: DocumentMetadata; chunkIndex: number }>,
    agentId: string,
    documentId: string
  ): Promise<DocumentChunk[]> {
    const chunksWithEmbeddings: DocumentChunk[] = [];
    
    // Process chunks in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const batchContents = batch.map(chunk => chunk.content);
      
      // Generate embeddings for the batch
      const embeddingRequest: LLMEmbeddingRequest = {
        input: batchContents,
        model: this.config.embeddingModel
      };
      
      const embeddingResponse = await this.embeddingProvider.getEmbedding(embeddingRequest);
      
      // Create document chunks with embeddings
      for (let j = 0; j < batch.length; j++) {
        const chunk = batch[j];
        const embedding = embeddingResponse.embeddings[j];
        const tokenCount = await this.embeddingProvider.getTokenCount(chunk.content, this.config.embeddingModel);
        
        chunksWithEmbeddings.push({
          id: this.generateChunkId(),
          agentId,
          content: chunk.content,
          embedding,
          metadata: chunk.metadata,
          chunkIndex: chunk.chunkIndex,
          totalChunks: chunks.length,
          tokenCount,
          createdAt: new Date()
        });
      }
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < chunks.length) {
        await this.sleep(100);
      }
    }
    
    return chunksWithEmbeddings;
  }
  
  private async storeDocumentChunks(chunks: DocumentChunk[]): Promise<void> {
    const chunkData = chunks.map(chunk => ({
      id: chunk.id,
      agent_id: chunk.agentId,
      document_id: this.extractDocumentId(chunk.id),
      content: chunk.content,
      embedding: chunk.embedding,
      metadata: chunk.metadata,
      chunk_index: chunk.chunkIndex,
      total_chunks: chunk.totalChunks,
      token_count: chunk.tokenCount,
      created_at: chunk.createdAt.toISOString()
    }));
    
    const { error } = await this.supabase
      .from('document_chunks')
      .insert(chunkData);
    
    if (error) {
      throw new Error(`Failed to store document chunks: ${error.message}`);
    }
  }
  
  private generateDocumentId(): string {
    return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private generateChunkId(): string {
    return `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private extractDocumentId(chunkId: string): string {
    // Extract document ID from chunk ID (simple implementation)
    return chunkId.replace('chunk_', 'doc_').split('_').slice(0, 2).join('_');
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export types
export type {
  DocumentMetadata,
  DocumentChunk,
  RetrievedDocument,
  RAGContext,
  IngestionResult,
  RAGConfig
};
