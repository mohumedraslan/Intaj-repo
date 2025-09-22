/**
 * Vector Database Client
 * Production-grade Qdrant integration for vector storage and similarity search
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import { ErrorFactory } from '@/lib/errors';

export interface VectorDocument {
  id: string;
  vector: number[];
  payload: {
    agentId: string;
    documentId: string;
    chunkIndex: number;
    totalChunks: number;
    content: string;
    metadata: DocumentMetadata;
    tokenCount: number;
    createdAt: string;
    updatedAt: string;
  };
}

export interface DocumentMetadata {
  title?: string;
  source?: string;
  author?: string;
  category?: string;
  tags?: string[];
  fileType?: string;
  fileSize?: number;
  language?: string;
  url?: string;
  lastModified?: Date;
  version?: number;
}

export interface SearchResult {
  id: string;
  score: number;
  content: string;
  metadata: DocumentMetadata;
  chunkIndex: number;
  totalChunks: number;
  documentId: string;
}

export interface CollectionInfo {
  name: string;
  vectorsCount: number;
  indexedVectorsCount: number;
  pointsCount: number;
  segmentsCount: number;
  config: {
    params: {
      vectorSize: number;
      distance: string;
    };
  };
}

export interface VectorDBStats {
  collections: number;
  totalVectors: number;
  totalSize: number;
  memoryUsage: number;
}

export class VectorDBClient {
  private client: QdrantClient;
  private readonly vectorDimension = 1536; // OpenAI text-embedding-3-small
  private readonly batchSize = 100;
  
  constructor() {
    const host = process.env.QDRANT_HOST || 'localhost';
    const port = parseInt(process.env.QDRANT_PORT || '6333');
    const apiKey = process.env.QDRANT_API_KEY;
    
    this.client = new QdrantClient({
      host,
      port,
      apiKey
    });
    
    console.log('Vector DB client initialized:', { host, port, hasApiKey: !!apiKey });
  }
  
  /**
   * Create a collection for an agent's knowledge base
   */
  async createCollection(agentId: string): Promise<void> {
    const collectionName = this.getCollectionName(agentId);
    
    try {
      // Check if collection already exists
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(c => c.name === collectionName);
      
      if (exists) {
        console.log('Collection already exists:', collectionName);
        return;
      }
      
      // Create collection with optimized configuration
      await this.client.createCollection(collectionName, {
        vectors: {
          size: this.vectorDimension,
          distance: 'Cosine', // Cosine similarity for text embeddings
          on_disk: true // Store vectors on disk for better memory efficiency
        },
        optimizers_config: {
          deleted_threshold: 0.2,
          vacuum_min_vector_number: 1000,
          default_segment_number: 0,
          max_segment_size: 20000,
          memmap_threshold: 50000,
          indexing_threshold: 20000,
          flush_interval_sec: 5,
          max_optimization_threads: 2
        },
        replication_factor: 1,
        write_consistency_factor: 1,
        on_disk_payload: true,
        hnsw_config: {
          m: 16,
          ef_construct: 100,
          full_scan_threshold: 10000,
          max_indexing_threads: 2,
          on_disk: true
        }
      });
      
      console.log('Collection created successfully:', collectionName);
      
    } catch (error) {
      console.error('Failed to create collection:', error);
      throw ErrorFactory.externalService(
        'Qdrant',
        `Failed to create collection: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  /**
   * Delete a collection
   */
  async deleteCollection(agentId: string): Promise<void> {
    const collectionName = this.getCollectionName(agentId);
    
    try {
      await this.client.deleteCollection(collectionName);
      console.log('Collection deleted successfully:', collectionName);
      
    } catch (error) {
      console.error('Failed to delete collection:', error);
      throw ErrorFactory.externalService(
        'Qdrant',
        `Failed to delete collection: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  /**
   * Upsert documents with embeddings
   */
  async upsertDocuments(
    agentId: string,
    documents: VectorDocument[]
  ): Promise<void> {
    if (documents.length === 0) {
      return;
    }
    
    const collectionName = this.getCollectionName(agentId);
    
    try {
      // Ensure collection exists
      await this.createCollection(agentId);
      
      // Process documents in batches
      for (let i = 0; i < documents.length; i += this.batchSize) {
        const batch = documents.slice(i, i + this.batchSize);
        
        const points = batch.map(doc => ({
          id: doc.id,
          vector: doc.vector,
          payload: doc.payload
        }));
        
        await this.client.upsert(collectionName, {
          wait: true,
          points
        });
        
        console.log(`Upserted batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(documents.length / this.batchSize)}:`, {
          collectionName,
          batchSize: batch.length,
          totalDocuments: documents.length
        });
      }
      
      console.log('All documents upserted successfully:', {
        collectionName,
        totalDocuments: documents.length
      });
      
    } catch (error) {
      console.error('Failed to upsert documents:', error);
      throw ErrorFactory.externalService(
        'Qdrant',
        `Failed to upsert documents: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  /**
   * Search for similar vectors
   */
  async searchSimilar(
    agentId: string,
    queryVector: number[],
    limit: number = 10,
    threshold: number = 0.7,
    filter?: Record<string, any>
  ): Promise<SearchResult[]> {
    const collectionName = this.getCollectionName(agentId);
    
    try {
      // Validate query vector dimension
      if (queryVector.length !== this.vectorDimension) {
        throw ErrorFactory.validation(
          new Error(`Query vector dimension ${queryVector.length} does not match expected ${this.vectorDimension}`) as any
        );
      }
      
      const searchRequest: any = {
        vector: queryVector,
        limit,
        score_threshold: threshold,
        with_payload: true,
        with_vector: false
      };
      
      // Add filter if provided
      if (filter) {
        searchRequest.filter = filter;
      }
      
      const searchResult = await this.client.search(collectionName, searchRequest);
      
      const results: SearchResult[] = searchResult.map(point => ({
        id: point.id as string,
        score: point.score,
        content: point.payload?.content as string,
        metadata: point.payload?.metadata as DocumentMetadata,
        chunkIndex: point.payload?.chunkIndex as number,
        totalChunks: point.payload?.totalChunks as number,
        documentId: point.payload?.documentId as string
      }));
      
      console.log('Vector search completed:', {
        collectionName,
        queryDimension: queryVector.length,
        resultsFound: results.length,
        threshold,
        limit
      });
      
      return results;
      
    } catch (error) {
      console.error('Vector search failed:', error);
      
      // Return empty results on error to prevent breaking the flow
      if (error instanceof Error && error.message.includes('Collection not found')) {
        console.warn('Collection not found, returning empty results:', collectionName);
        return [];
      }
      
      throw ErrorFactory.externalService(
        'Qdrant',
        `Vector search failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  /**
   * Delete documents by IDs
   */
  async deleteDocuments(agentId: string, documentIds: string[]): Promise<void> {
    if (documentIds.length === 0) {
      return;
    }
    
    const collectionName = this.getCollectionName(agentId);
    
    try {
      await this.client.delete(collectionName, {
        wait: true,
        points: documentIds
      });
      
      console.log('Documents deleted successfully:', {
        collectionName,
        deletedCount: documentIds.length
      });
      
    } catch (error) {
      console.error('Failed to delete documents:', error);
      throw ErrorFactory.externalService(
        'Qdrant',
        `Failed to delete documents: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  /**
   * Delete documents by filter
   */
  async deleteDocumentsByFilter(
    agentId: string,
    filter: Record<string, any>
  ): Promise<void> {
    const collectionName = this.getCollectionName(agentId);
    
    try {
      await this.client.delete(collectionName, {
        wait: true,
        filter
      });
      
      console.log('Documents deleted by filter:', {
        collectionName,
        filter
      });
      
    } catch (error) {
      console.error('Failed to delete documents by filter:', error);
      throw ErrorFactory.externalService(
        'Qdrant',
        `Failed to delete documents by filter: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  /**
   * Get collection information
   */
  async getCollectionInfo(agentId: string): Promise<CollectionInfo | null> {
    const collectionName = this.getCollectionName(agentId);
    
    try {
      const info = await this.client.getCollection(collectionName);
      
      return {
        name: collectionName,
        vectorsCount: info.vectors_count || 0,
        indexedVectorsCount: info.indexed_vectors_count || 0,
        pointsCount: info.points_count || 0,
        segmentsCount: info.segments_count || 0,
        config: {
          params: {
            vectorSize: info.config?.params?.vectors?.size || this.vectorDimension,
            distance: info.config?.params?.vectors?.distance || 'Cosine'
          }
        }
      };
      
    } catch (error) {
      if (error instanceof Error && error.message.includes('Not found')) {
        return null;
      }
      
      console.error('Failed to get collection info:', error);
      throw ErrorFactory.externalService(
        'Qdrant',
        `Failed to get collection info: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  /**
   * Get database statistics
   */
  async getStats(): Promise<VectorDBStats> {
    try {
      const collections = await this.client.getCollections();
      
      let totalVectors = 0;
      let totalSize = 0;
      
      for (const collection of collections.collections) {
        try {
          const info = await this.client.getCollection(collection.name);
          totalVectors += info.vectors_count || 0;
          // Estimate size based on vector count and dimension
          totalSize += (info.vectors_count || 0) * this.vectorDimension * 4; // 4 bytes per float
        } catch (error) {
          console.warn('Failed to get collection stats:', collection.name, error);
        }
      }
      
      return {
        collections: collections.collections.length,
        totalVectors,
        totalSize,
        memoryUsage: totalSize // Approximate
      };
      
    } catch (error) {
      console.error('Failed to get database stats:', error);
      throw ErrorFactory.externalService(
        'Qdrant',
        `Failed to get database stats: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.getCollections();
      return true;
    } catch (error) {
      console.error('Vector DB connection test failed:', error);
      return false;
    }
  }
  
  /**
   * Scroll through points in a collection
   */
  async scrollPoints(
    agentId: string,
    limit: number = 100,
    offset?: string,
    filter?: Record<string, any>
  ): Promise<{
    points: Array<{
      id: string;
      payload: any;
    }>;
    nextOffset?: string;
  }> {
    const collectionName = this.getCollectionName(agentId);
    
    try {
      const scrollRequest: any = {
        limit,
        with_payload: true,
        with_vector: false
      };
      
      if (offset) {
        scrollRequest.offset = offset;
      }
      
      if (filter) {
        scrollRequest.filter = filter;
      }
      
      const result = await this.client.scroll(collectionName, scrollRequest);
      
      return {
        points: result.points.map(point => ({
          id: point.id as string,
          payload: point.payload
        })),
        nextOffset: result.next_page_offset
      };
      
    } catch (error) {
      console.error('Failed to scroll points:', error);
      throw ErrorFactory.externalService(
        'Qdrant',
        `Failed to scroll points: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  // Private helper methods
  
  private getCollectionName(agentId: string): string {
    return `agent_${agentId.replace(/-/g, '_')}`;
  }
}

// Singleton instance
let vectorDBInstance: VectorDBClient | null = null;

/**
 * Get or create vector database client singleton
 */
export function getVectorDBClient(): VectorDBClient {
  if (!vectorDBInstance) {
    vectorDBInstance = new VectorDBClient();
  }
  return vectorDBInstance;
}

// Export types
export type {
  VectorDocument,
  DocumentMetadata,
  SearchResult,
  CollectionInfo,
  VectorDBStats
};
