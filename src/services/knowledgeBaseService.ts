/**
 * Knowledge Base Management Service
 * Handles document lifecycle, versioning, and knowledge base operations
 */

import { DocumentProcessor, getDocumentProcessor, ProcessingResult, ProcessingOptions } from '../document/DocumentProcessor';
import { VectorDBClient, getVectorDBClient, DocumentMetadata } from '../vectordb/VectorDBClient';
import { ContextRetriever, getContextRetriever, RetrievalOptions, RetrievedContext } from '../rag/ContextRetriever';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { ErrorFactory } from '@/lib/errors';

export interface Document {
  id: string;
  agentId: string;
  title: string;
  filename: string;
  fileType: string;
  fileSize: number;
  status: 'processing' | 'completed' | 'failed' | 'deleted';
  chunksCount: number;
  tokensCount: number;
  embeddingsCount: number;
  processingTime?: number;
  errorMessage?: string;
  metadata: DocumentMetadata;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  filename: string;
  fileSize: number;
  chunksCount: number;
  tokensCount: number;
  processingResult: ProcessingResult;
  createdAt: Date;
}

export interface KnowledgeBaseStats {
  totalDocuments: number;
  totalChunks: number;
  totalTokens: number;
  totalSize: number;
  documentsByType: Record<string, number>;
  documentsByStatus: Record<string, number>;
  averageProcessingTime: number;
  lastUpdated: Date;
}

export interface SearchResults {
  documents: RetrievedContext;
  query: string;
  totalResults: number;
  searchTime: number;
  suggestions?: string[];
}

export interface UploadProgress {
  documentId: string;
  stage: 'uploading' | 'extracting' | 'chunking' | 'embedding' | 'indexing' | 'completed' | 'failed';
  progress: number;
  message: string;
  error?: string;
}

export class KnowledgeBaseService {
  private supabase;
  private documentProcessor: DocumentProcessor;
  private vectorDB: VectorDBClient;
  private contextRetriever: ContextRetriever;
  
  constructor() {
    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    this.documentProcessor = getDocumentProcessor();
    this.vectorDB = getVectorDBClient();
    this.contextRetriever = getContextRetriever();
  }
  
  /**
   * Add a document to the knowledge base
   */
  async addDocument(
    agentId: string,
    file: File,
    metadata: DocumentMetadata,
    userId: string,
    options: ProcessingOptions = {}
  ): Promise<Document> {
    const documentId = this.generateDocumentId();
    
    try {
      console.log('Adding document to knowledge base:', {
        documentId,
        agentId,
        filename: file.name,
        fileSize: file.size,
        userId
      });
      
      // Validate user permissions
      await this.validateUserAccess(agentId, userId);
      
      // Create document record
      const document = await this.createDocumentRecord(
        documentId,
        agentId,
        file,
        metadata,
        userId
      );
      
      // Process document asynchronously
      this.processDocumentAsync(document, file, options);
      
      return document;
      
    } catch (error) {
      console.error('Failed to add document:', error);
      
      // Update document status to failed
      await this.updateDocumentStatus(documentId, 'failed', {
        errorMessage: error instanceof Error ? error.message : String(error)
      });
      
      throw error;
    }
  }
  
  /**
   * Remove a document from the knowledge base
   */
  async removeDocument(agentId: string, documentId: string, userId: string): Promise<void> {
    try {
      console.log('Removing document from knowledge base:', {
        documentId,
        agentId,
        userId
      });
      
      // Validate user permissions
      await this.validateUserAccess(agentId, userId);
      
      // Get document info
      const document = await this.getDocument(documentId, userId);
      if (!document) {
        throw ErrorFactory.notFound('Document', documentId);
      }
      
      // Remove from vector database
      await this.vectorDB.deleteDocumentsByFilter(agentId, {
        key: 'documentId',
        match: { value: documentId }
      });
      
      // Update document status
      await this.updateDocumentStatus(documentId, 'deleted');
      
      // Update agent's knowledge base stats
      await this.updateKnowledgeBaseStats(agentId);
      
      console.log('Document removed successfully:', documentId);
      
    } catch (error) {
      console.error('Failed to remove document:', error);
      throw error;
    }
  }
  
  /**
   * Update a document (creates new version)
   */
  async updateDocument(
    agentId: string,
    documentId: string,
    file: File,
    userId: string,
    options: ProcessingOptions = {}
  ): Promise<Document> {
    try {
      console.log('Updating document:', {
        documentId,
        agentId,
        filename: file.name,
        userId
      });
      
      // Validate user permissions
      await this.validateUserAccess(agentId, userId);
      
      // Get existing document
      const existingDocument = await this.getDocument(documentId, userId);
      if (!existingDocument) {
        throw ErrorFactory.notFound('Document', documentId);
      }
      
      // Create new version
      const newVersion = existingDocument.version + 1;
      
      // Archive current version
      await this.archiveDocumentVersion(existingDocument);
      
      // Remove old embeddings
      await this.vectorDB.deleteDocumentsByFilter(agentId, {
        key: 'documentId',
        match: { value: documentId }
      });
      
      // Update document record
      const updatedDocument = await this.updateDocumentRecord(
        documentId,
        file,
        newVersion
      );
      
      // Process new version asynchronously
      this.processDocumentAsync(updatedDocument, file, options);
      
      return updatedDocument;
      
    } catch (error) {
      console.error('Failed to update document:', error);
      throw error;
    }
  }
  
  /**
   * Search the knowledge base
   */
  async searchKnowledgeBase(
    agentId: string,
    query: string,
    userId: string,
    options: RetrievalOptions = {}
  ): Promise<SearchResults> {
    const startTime = Date.now();
    
    try {
      console.log('Searching knowledge base:', {
        agentId,
        query: query.substring(0, 100),
        userId
      });
      
      // Validate user permissions
      await this.validateUserAccess(agentId, userId);
      
      // Retrieve relevant context
      const documents = await this.contextRetriever.retrieveRelevantContext(
        query,
        agentId,
        options
      );
      
      // Generate search suggestions
      const suggestions = await this.generateSearchSuggestions(query, agentId);
      
      const results: SearchResults = {
        documents,
        query,
        totalResults: documents.documents.length,
        searchTime: Date.now() - startTime,
        suggestions
      };
      
      console.log('Knowledge base search completed:', {
        totalResults: results.totalResults,
        searchTime: results.searchTime,
        relevanceScore: documents.totalRelevance
      });
      
      return results;
      
    } catch (error) {
      console.error('Knowledge base search failed:', error);
      throw error;
    }
  }
  
  /**
   * Get document by ID
   */
  async getDocument(documentId: string, userId: string): Promise<Document | null> {
    try {
      const { data, error } = await this.supabase
        .from('knowledge_base_documents')
        .select('*')
        .eq('id', documentId)
        .eq('user_id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw ErrorFactory.database(`Failed to get document: ${error.message}`);
      }
      
      return this.mapDatabaseToDocument(data);
      
    } catch (error) {
      console.error('Failed to get document:', error);
      throw error;
    }
  }
  
  /**
   * List documents for an agent
   */
  async listDocuments(
    agentId: string,
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      status?: Document['status'];
      fileType?: string;
    } = {}
  ): Promise<{ documents: Document[]; total: number }> {
    try {
      const { limit = 50, offset = 0, status, fileType } = options;
      
      // Validate user permissions
      await this.validateUserAccess(agentId, userId);
      
      let query = this.supabase
        .from('knowledge_base_documents')
        .select('*', { count: 'exact' })
        .eq('agent_id', agentId)
        .eq('user_id', userId)
        .neq('status', 'deleted')
        .order('created_at', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      if (fileType) {
        query = query.eq('file_type', fileType);
      }
      
      query = query.range(offset, offset + limit - 1);
      
      const { data, error, count } = await query;
      
      if (error) {
        throw ErrorFactory.database(`Failed to list documents: ${error.message}`);
      }
      
      const documents = (data || []).map(this.mapDatabaseToDocument);
      
      return {
        documents,
        total: count || 0
      };
      
    } catch (error) {
      console.error('Failed to list documents:', error);
      throw error;
    }
  }
  
  /**
   * Get knowledge base statistics
   */
  async getKnowledgeBaseStats(agentId: string, userId: string): Promise<KnowledgeBaseStats> {
    try {
      // Validate user permissions
      await this.validateUserAccess(agentId, userId);
      
      const { data, error } = await this.supabase
        .from('knowledge_base_documents')
        .select('file_type, status, chunks_count, tokens_count, file_size, processing_time, created_at')
        .eq('agent_id', agentId)
        .eq('user_id', userId)
        .neq('status', 'deleted');
      
      if (error) {
        throw ErrorFactory.database(`Failed to get stats: ${error.message}`);
      }
      
      const documents = data || [];
      
      const stats: KnowledgeBaseStats = {
        totalDocuments: documents.length,
        totalChunks: documents.reduce((sum, doc) => sum + (doc.chunks_count || 0), 0),
        totalTokens: documents.reduce((sum, doc) => sum + (doc.tokens_count || 0), 0),
        totalSize: documents.reduce((sum, doc) => sum + (doc.file_size || 0), 0),
        documentsByType: {},
        documentsByStatus: {},
        averageProcessingTime: 0,
        lastUpdated: new Date()
      };
      
      // Calculate breakdowns
      documents.forEach(doc => {
        // By type
        stats.documentsByType[doc.file_type] = (stats.documentsByType[doc.file_type] || 0) + 1;
        
        // By status
        stats.documentsByStatus[doc.status] = (stats.documentsByStatus[doc.status] || 0) + 1;
      });
      
      // Calculate average processing time
      const completedDocs = documents.filter(doc => doc.status === 'completed' && doc.processing_time);
      if (completedDocs.length > 0) {
        stats.averageProcessingTime = completedDocs.reduce((sum, doc) => sum + (doc.processing_time || 0), 0) / completedDocs.length;
      }
      
      // Get last updated
      if (documents.length > 0) {
        const lastDoc = documents.reduce((latest, doc) => 
          new Date(doc.created_at) > new Date(latest.created_at) ? doc : latest
        );
        stats.lastUpdated = new Date(lastDoc.created_at);
      }
      
      return stats;
      
    } catch (error) {
      console.error('Failed to get knowledge base stats:', error);
      throw error;
    }
  }
  
  /**
   * Get document versions
   */
  async getDocumentVersions(documentId: string, userId: string): Promise<DocumentVersion[]> {
    try {
      const { data, error } = await this.supabase
        .from('knowledge_base_document_versions')
        .select('*')
        .eq('document_id', documentId)
        .order('version', { ascending: false });
      
      if (error) {
        throw ErrorFactory.database(`Failed to get document versions: ${error.message}`);
      }
      
      return (data || []).map(this.mapDatabaseToDocumentVersion);
      
    } catch (error) {
      console.error('Failed to get document versions:', error);
      throw error;
    }
  }
  
  // Private helper methods
  
  private async processDocumentAsync(
    document: Document,
    file: File,
    options: ProcessingOptions
  ): Promise<void> {
    try {
      // Update status to processing
      await this.updateDocumentStatus(document.id, 'processing');
      
      // Process the document
      const result = await this.documentProcessor.processDocument(
        file,
        document.agentId,
        document.metadata,
        options
      );
      
      if (result.success) {
        // Update document with processing results
        await this.updateDocumentStatus(document.id, 'completed', {
          chunksCount: result.chunksProcessed,
          tokensCount: result.tokensGenerated,
          embeddingsCount: result.embeddingsCreated,
          processingTime: result.processingTime
        });
        
        // Update knowledge base stats
        await this.updateKnowledgeBaseStats(document.agentId);
        
        console.log('Document processing completed:', {
          documentId: document.id,
          chunksProcessed: result.chunksProcessed,
          processingTime: result.processingTime
        });
      } else {
        // Update status to failed
        await this.updateDocumentStatus(document.id, 'failed', {
          errorMessage: result.error
        });
        
        console.error('Document processing failed:', {
          documentId: document.id,
          error: result.error
        });
      }
      
    } catch (error) {
      console.error('Document processing error:', error);
      
      await this.updateDocumentStatus(document.id, 'failed', {
        errorMessage: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  private async validateUserAccess(agentId: string, userId: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('agents')
      .select('user_id')
      .eq('id', agentId)
      .single();
    
    if (error) {
      throw ErrorFactory.database(`Failed to validate access: ${error.message}`);
    }
    
    if (data.user_id !== userId) {
      throw ErrorFactory.forbidden('Access denied to this agent');
    }
  }
  
  private async createDocumentRecord(
    documentId: string,
    agentId: string,
    file: File,
    metadata: DocumentMetadata,
    userId: string
  ): Promise<Document> {
    const document: Partial<Document> = {
      id: documentId,
      agentId,
      title: metadata.title || file.name,
      filename: file.name,
      fileType: file.type,
      fileSize: file.size,
      status: 'processing',
      chunksCount: 0,
      tokensCount: 0,
      embeddingsCount: 0,
      metadata,
      version: 1,
      userId
    };
    
    const { data, error } = await this.supabase
      .from('knowledge_base_documents')
      .insert({
        id: document.id,
        agent_id: document.agentId,
        title: document.title,
        filename: document.filename,
        file_type: document.fileType,
        file_size: document.fileSize,
        status: document.status,
        chunks_count: document.chunksCount,
        tokens_count: document.tokensCount,
        embeddings_count: document.embeddingsCount,
        metadata: document.metadata,
        version: document.version,
        user_id: document.userId
      })
      .select()
      .single();
    
    if (error) {
      throw ErrorFactory.database(`Failed to create document record: ${error.message}`);
    }
    
    return this.mapDatabaseToDocument(data);
  }
  
  private async updateDocumentRecord(
    documentId: string,
    file: File,
    version: number
  ): Promise<Document> {
    const { data, error } = await this.supabase
      .from('knowledge_base_documents')
      .update({
        filename: file.name,
        file_type: file.type,
        file_size: file.size,
        status: 'processing',
        chunks_count: 0,
        tokens_count: 0,
        embeddings_count: 0,
        version,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)
      .select()
      .single();
    
    if (error) {
      throw ErrorFactory.database(`Failed to update document record: ${error.message}`);
    }
    
    return this.mapDatabaseToDocument(data);
  }
  
  private async updateDocumentStatus(
    documentId: string,
    status: Document['status'],
    updates: Partial<{
      chunksCount: number;
      tokensCount: number;
      embeddingsCount: number;
      processingTime: number;
      errorMessage: string;
    }> = {}
  ): Promise<void> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };
    
    if (updates.chunksCount !== undefined) {
      updateData.chunks_count = updates.chunksCount;
    }
    
    if (updates.tokensCount !== undefined) {
      updateData.tokens_count = updates.tokensCount;
    }
    
    if (updates.embeddingsCount !== undefined) {
      updateData.embeddings_count = updates.embeddingsCount;
    }
    
    if (updates.processingTime !== undefined) {
      updateData.processing_time = updates.processingTime;
    }
    
    if (updates.errorMessage !== undefined) {
      updateData.error_message = updates.errorMessage;
    }
    
    const { error } = await this.supabase
      .from('knowledge_base_documents')
      .update(updateData)
      .eq('id', documentId);
    
    if (error) {
      console.error('Failed to update document status:', error);
    }
  }
  
  private async archiveDocumentVersion(document: Document): Promise<void> {
    const { error } = await this.supabase
      .from('knowledge_base_document_versions')
      .insert({
        document_id: document.id,
        version: document.version,
        filename: document.filename,
        file_size: document.fileSize,
        chunks_count: document.chunksCount,
        tokens_count: document.tokensCount,
        processing_result: {
          success: document.status === 'completed',
          documentId: document.id,
          chunksProcessed: document.chunksCount,
          tokensGenerated: document.tokensCount,
          embeddingsCreated: document.embeddingsCount,
          processingTime: document.processingTime || 0,
          fileSize: document.fileSize,
          error: document.errorMessage
        }
      });
    
    if (error) {
      console.error('Failed to archive document version:', error);
    }
  }
  
  private async updateKnowledgeBaseStats(agentId: string): Promise<void> {
    // This would typically update cached statistics
    // For now, we'll just log the update
    console.log('Knowledge base stats updated for agent:', agentId);
  }
  
  private async generateSearchSuggestions(query: string, agentId: string): Promise<string[]> {
    // Simple suggestion generation based on common patterns
    const suggestions: string[] = [];
    
    // Add question variations
    if (!query.endsWith('?')) {
      suggestions.push(`${query}?`);
    }
    
    // Add "how to" variation
    if (!query.toLowerCase().startsWith('how')) {
      suggestions.push(`How to ${query.toLowerCase()}`);
    }
    
    // Add "what is" variation
    if (!query.toLowerCase().startsWith('what')) {
      suggestions.push(`What is ${query.toLowerCase()}`);
    }
    
    return suggestions.slice(0, 3);
  }
  
  private mapDatabaseToDocument(data: any): Document {
    return {
      id: data.id,
      agentId: data.agent_id,
      title: data.title,
      filename: data.filename,
      fileType: data.file_type,
      fileSize: data.file_size,
      status: data.status,
      chunksCount: data.chunks_count || 0,
      tokensCount: data.tokens_count || 0,
      embeddingsCount: data.embeddings_count || 0,
      processingTime: data.processing_time,
      errorMessage: data.error_message,
      metadata: data.metadata || {},
      version: data.version || 1,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      userId: data.user_id
    };
  }
  
  private mapDatabaseToDocumentVersion(data: any): DocumentVersion {
    return {
      id: data.id,
      documentId: data.document_id,
      version: data.version,
      filename: data.filename,
      fileSize: data.file_size,
      chunksCount: data.chunks_count,
      tokensCount: data.tokens_count,
      processingResult: data.processing_result,
      createdAt: new Date(data.created_at)
    };
  }
  
  private generateDocumentId(): string {
    return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
let knowledgeBaseServiceInstance: KnowledgeBaseService | null = null;

/**
 * Get or create knowledge base service singleton
 */
export function getKnowledgeBaseService(): KnowledgeBaseService {
  if (!knowledgeBaseServiceInstance) {
    knowledgeBaseServiceInstance = new KnowledgeBaseService();
  }
  return knowledgeBaseServiceInstance;
}

// Export types
export type {
  Document,
  DocumentVersion,
  KnowledgeBaseStats,
  SearchResults,
  UploadProgress
};
