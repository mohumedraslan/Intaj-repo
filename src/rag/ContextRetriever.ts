/**
 * Advanced Context Retrieval System
 * Implements hybrid search with vector similarity and keyword matching
 */

import { VectorDBClient, getVectorDBClient, SearchResult } from '../vectordb/VectorDBClient';
import { EmbeddingService, getEmbeddingService } from '../embeddings/EmbeddingService';
import { ErrorFactory } from '@/lib/errors';

export interface RetrievalOptions {
  maxResults?: number;
  threshold?: number;
  maxTokens?: number;
  includeMetadata?: boolean;
  rerank?: boolean;
  hybridSearch?: boolean;
  boostRecent?: boolean;
  filterBySource?: string[];
  filterByCategory?: string[];
  filterByTags?: string[];
}

export interface RetrievedDocument {
  id: string;
  content: string;
  score: number;
  relevanceScore: number;
  source?: string;
  title?: string;
  category?: string;
  tags?: string[];
  chunkIndex: number;
  totalChunks: number;
  documentId: string;
  createdAt?: string;
  metadata?: Record<string, any>;
}

export interface RetrievedContext {
  documents: RetrievedDocument[];
  totalRelevance: number;
  sources: string[];
  query: string;
  processingTime: number;
  searchMethod: 'vector' | 'hybrid' | 'keyword';
  tokensUsed: number;
}

export interface KeywordSearchResult {
  id: string;
  content: string;
  score: number;
  matches: string[];
  documentId: string;
}

export interface HybridSearchWeights {
  vectorWeight: number;
  keywordWeight: number;
  recencyWeight: number;
  sourceWeight: number;
}

export class ContextRetriever {
  private vectorDB: VectorDBClient;
  private embeddingService: EmbeddingService;
  private readonly defaultWeights: HybridSearchWeights = {
    vectorWeight: 0.7,
    keywordWeight: 0.2,
    recencyWeight: 0.05,
    sourceWeight: 0.05
  };
  
  constructor() {
    this.vectorDB = getVectorDBClient();
    this.embeddingService = getEmbeddingService();
  }
  
  /**
   * Retrieve relevant context for a query
   */
  async retrieveRelevantContext(
    query: string,
    agentId: string,
    options: RetrievalOptions = {}
  ): Promise<RetrievedContext> {
    const startTime = Date.now();
    
    try {
      const {
        maxResults = 5,
        threshold = 0.7,
        maxTokens = 2000,
        includeMetadata = true,
        rerank = true,
        hybridSearch = true,
        boostRecent = false
      } = options;
      
      console.log('Starting context retrieval:', {
        query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
        agentId,
        maxResults,
        threshold,
        hybridSearch,
        rerank
      });
      
      if (!query.trim()) {
        return this.createEmptyContext(query, Date.now() - startTime);
      }
      
      let documents: RetrievedDocument[];
      let searchMethod: RetrievedContext['searchMethod'];
      
      if (hybridSearch) {
        documents = await this.performHybridSearch(query, agentId, maxResults, threshold, options);
        searchMethod = 'hybrid';
      } else {
        documents = await this.performVectorSearch(query, agentId, maxResults, threshold, options);
        searchMethod = 'vector';
      }
      
      // Re-rank results if requested
      if (rerank && documents.length > 1) {
        documents = await this.rerankDocuments(query, documents, options);
      }
      
      // Apply context window optimization
      const optimizedDocuments = this.optimizeContextWindow(documents, maxTokens);
      
      // Calculate total relevance
      const totalRelevance = this.calculateTotalRelevance(optimizedDocuments);
      
      // Extract unique sources
      const sources = this.extractSources(optimizedDocuments);
      
      const context: RetrievedContext = {
        documents: optimizedDocuments,
        totalRelevance,
        sources,
        query,
        processingTime: Date.now() - startTime,
        searchMethod,
        tokensUsed: this.calculateTokensUsed(optimizedDocuments)
      };
      
      console.log('Context retrieval completed:', {
        documentsFound: optimizedDocuments.length,
        totalRelevance,
        sources: sources.length,
        processingTime: context.processingTime,
        searchMethod
      });
      
      return context;
      
    } catch (error) {
      console.error('Context retrieval failed:', {
        query: query.substring(0, 100),
        agentId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Return empty context on error to prevent breaking the flow
      return this.createEmptyContext(query, Date.now() - startTime);
    }
  }
  
  /**
   * Perform vector similarity search
   */
  private async performVectorSearch(
    query: string,
    agentId: string,
    maxResults: number,
    threshold: number,
    options: RetrievalOptions
  ): Promise<RetrievedDocument[]> {
    try {
      // Generate query embedding
      const embeddingResponse = await this.embeddingService.generateEmbedding(
        query,
        'text-embedding-3-small'
      );
      
      // Build filter for vector search
      const filter = this.buildSearchFilter(options);
      
      // Perform vector search
      const searchResults = await this.vectorDB.searchSimilar(
        agentId,
        embeddingResponse.embedding,
        maxResults * 2, // Get more results for reranking
        threshold,
        filter
      );
      
      // Convert to RetrievedDocument format
      return searchResults.map(result => this.convertToRetrievedDocument(result, 'vector'));
      
    } catch (error) {
      console.error('Vector search failed:', error);
      return [];
    }
  }
  
  /**
   * Perform hybrid search combining vector and keyword matching
   */
  private async performHybridSearch(
    query: string,
    agentId: string,
    maxResults: number,
    threshold: number,
    options: RetrievalOptions
  ): Promise<RetrievedDocument[]> {
    try {
      // Perform both vector and keyword searches in parallel
      const [vectorResults, keywordResults] = await Promise.all([
        this.performVectorSearch(query, agentId, maxResults, threshold, options),
        this.performKeywordSearch(query, agentId, maxResults, options)
      ]);
      
      // Combine and score results
      const combinedResults = this.combineSearchResults(
        vectorResults,
        keywordResults,
        query,
        options
      );
      
      // Sort by combined score and take top results
      return combinedResults
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, maxResults);
      
    } catch (error) {
      console.error('Hybrid search failed:', error);
      // Fallback to vector search only
      return this.performVectorSearch(query, agentId, maxResults, threshold, options);
    }
  }
  
  /**
   * Perform keyword-based search
   */
  private async performKeywordSearch(
    query: string,
    agentId: string,
    maxResults: number,
    options: RetrievalOptions
  ): Promise<KeywordSearchResult[]> {
    try {
      // Extract keywords from query
      const keywords = this.extractQueryKeywords(query);
      
      if (keywords.length === 0) {
        return [];
      }
      
      // This would typically use a full-text search engine like Elasticsearch
      // For now, we'll simulate keyword search by scrolling through documents
      const filter = this.buildSearchFilter(options);
      const scrollResult = await this.vectorDB.scrollPoints(agentId, 100, undefined, filter);
      
      const keywordResults: KeywordSearchResult[] = [];
      
      for (const point of scrollResult.points) {
        const content = point.payload?.content as string;
        if (!content) continue;
        
        const matches = this.findKeywordMatches(content, keywords);
        if (matches.length > 0) {
          const score = this.calculateKeywordScore(content, keywords, matches);
          
          keywordResults.push({
            id: point.id,
            content,
            score,
            matches,
            documentId: point.payload?.documentId as string
          });
        }
      }
      
      return keywordResults
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults);
      
    } catch (error) {
      console.error('Keyword search failed:', error);
      return [];
    }
  }
  
  /**
   * Combine vector and keyword search results
   */
  private combineSearchResults(
    vectorResults: RetrievedDocument[],
    keywordResults: KeywordSearchResult[],
    query: string,
    options: RetrievalOptions
  ): RetrievedDocument[] {
    const weights = { ...this.defaultWeights };
    const combinedMap = new Map<string, RetrievedDocument>();
    
    // Add vector results
    for (const doc of vectorResults) {
      const combinedScore = doc.score * weights.vectorWeight;
      combinedMap.set(doc.id, {
        ...doc,
        relevanceScore: combinedScore
      });
    }
    
    // Add keyword results and boost existing documents
    for (const keywordResult of keywordResults) {
      const existing = combinedMap.get(keywordResult.id);
      
      if (existing) {
        // Boost existing document with keyword score
        existing.relevanceScore += keywordResult.score * weights.keywordWeight;
      } else {
        // Add new document from keyword search
        // We need to find the full document info
        const vectorDoc = vectorResults.find(v => v.id === keywordResult.id);
        if (vectorDoc) {
          combinedMap.set(keywordResult.id, {
            ...vectorDoc,
            relevanceScore: keywordResult.score * weights.keywordWeight
          });
        }
      }
    }
    
    // Apply additional scoring factors
    const results = Array.from(combinedMap.values());
    
    for (const doc of results) {
      // Boost recent documents if requested
      if (options.boostRecent && doc.createdAt) {
        const recencyBoost = this.calculateRecencyBoost(doc.createdAt);
        doc.relevanceScore += recencyBoost * weights.recencyWeight;
      }
      
      // Boost preferred sources
      if (options.filterBySource && doc.source && options.filterBySource.includes(doc.source)) {
        doc.relevanceScore += 0.1 * weights.sourceWeight;
      }
    }
    
    return results;
  }
  
  /**
   * Re-rank documents using advanced scoring
   */
  private async rerankDocuments(
    query: string,
    documents: RetrievedDocument[],
    options: RetrievalOptions
  ): Promise<RetrievedDocument[]> {
    try {
      // Implement more sophisticated reranking
      const rerankedDocs = documents.map(doc => {
        let newScore = doc.relevanceScore;
        
        // Boost documents with query terms in title
        if (doc.title && this.containsQueryTerms(doc.title, query)) {
          newScore += 0.2;
        }
        
        // Boost documents with matching categories
        if (options.filterByCategory && doc.category && 
            options.filterByCategory.includes(doc.category)) {
          newScore += 0.1;
        }
        
        // Boost documents with matching tags
        if (options.filterByTags && doc.tags) {
          const matchingTags = doc.tags.filter(tag => 
            options.filterByTags!.includes(tag)
          );
          newScore += matchingTags.length * 0.05;
        }
        
        // Penalize very short documents
        if (doc.content.length < 100) {
          newScore -= 0.1;
        }
        
        return {
          ...doc,
          relevanceScore: Math.max(0, newScore)
        };
      });
      
      return rerankedDocs.sort((a, b) => b.relevanceScore - a.relevanceScore);
      
    } catch (error) {
      console.error('Reranking failed:', error);
      return documents;
    }
  }
  
  /**
   * Optimize context window to fit within token limit
   */
  private optimizeContextWindow(
    documents: RetrievedDocument[],
    maxTokens: number
  ): RetrievedDocument[] {
    const optimized: RetrievedDocument[] = [];
    let totalTokens = 0;
    
    // Sort by relevance score
    const sortedDocs = documents.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    for (const doc of sortedDocs) {
      const docTokens = this.estimateTokenCount(doc.content);
      
      if (totalTokens + docTokens <= maxTokens) {
        optimized.push(doc);
        totalTokens += docTokens;
      } else {
        // Try to fit a truncated version
        const remainingTokens = maxTokens - totalTokens;
        if (remainingTokens > 50) { // Only if we have meaningful space left
          const truncatedContent = this.truncateContent(doc.content, remainingTokens);
          optimized.push({
            ...doc,
            content: truncatedContent
          });
          break;
        }
      }
    }
    
    return optimized;
  }
  
  // Helper methods
  
  private buildSearchFilter(options: RetrievalOptions): Record<string, any> | undefined {
    const conditions: any[] = [];
    
    if (options.filterBySource && options.filterBySource.length > 0) {
      conditions.push({
        key: 'metadata.source',
        match: { any: options.filterBySource }
      });
    }
    
    if (options.filterByCategory && options.filterByCategory.length > 0) {
      conditions.push({
        key: 'metadata.category',
        match: { any: options.filterByCategory }
      });
    }
    
    if (options.filterByTags && options.filterByTags.length > 0) {
      conditions.push({
        key: 'metadata.tags',
        match: { any: options.filterByTags }
      });
    }
    
    if (conditions.length === 0) {
      return undefined;
    }
    
    return conditions.length === 1 ? conditions[0] : { must: conditions };
  }
  
  private convertToRetrievedDocument(
    result: SearchResult,
    searchType: 'vector' | 'keyword'
  ): RetrievedDocument {
    return {
      id: result.id,
      content: result.content,
      score: result.score,
      relevanceScore: result.score,
      source: result.metadata?.source,
      title: result.metadata?.title,
      category: result.metadata?.category,
      tags: result.metadata?.tags,
      chunkIndex: result.chunkIndex,
      totalChunks: result.totalChunks,
      documentId: result.documentId,
      createdAt: result.metadata?.createdAt,
      metadata: result.metadata
    };
  }
  
  private extractQueryKeywords(query: string): string[] {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !this.isStopWord(word));
  }
  
  private findKeywordMatches(content: string, keywords: string[]): string[] {
    const contentLower = content.toLowerCase();
    return keywords.filter(keyword => contentLower.includes(keyword));
  }
  
  private calculateKeywordScore(content: string, keywords: string[], matches: string[]): number {
    const contentLower = content.toLowerCase();
    let score = 0;
    
    for (const keyword of matches) {
      // Count occurrences
      const occurrences = (contentLower.match(new RegExp(keyword, 'g')) || []).length;
      score += occurrences * 0.1;
      
      // Boost if keyword appears in first 100 characters
      if (contentLower.substring(0, 100).includes(keyword)) {
        score += 0.2;
      }
    }
    
    // Normalize by content length
    return score / Math.log(content.length + 1);
  }
  
  private calculateRecencyBoost(createdAt: string): number {
    const now = Date.now();
    const created = new Date(createdAt).getTime();
    const daysSinceCreation = (now - created) / (1000 * 60 * 60 * 24);
    
    // Boost recent documents (within 30 days)
    if (daysSinceCreation <= 30) {
      return (30 - daysSinceCreation) / 30 * 0.2;
    }
    
    return 0;
  }
  
  private containsQueryTerms(text: string, query: string): boolean {
    const queryTerms = this.extractQueryKeywords(query);
    const textLower = text.toLowerCase();
    
    return queryTerms.some(term => textLower.includes(term));
  }
  
  private calculateTotalRelevance(documents: RetrievedDocument[]): number {
    if (documents.length === 0) return 0;
    
    const totalScore = documents.reduce((sum, doc) => sum + doc.relevanceScore, 0);
    return totalScore / documents.length;
  }
  
  private extractSources(documents: RetrievedDocument[]): string[] {
    const sources = new Set<string>();
    
    documents.forEach(doc => {
      if (doc.source) {
        sources.add(doc.source);
      } else if (doc.title) {
        sources.add(doc.title);
      } else {
        sources.add(`Document ${doc.documentId}`);
      }
    });
    
    return Array.from(sources);
  }
  
  private calculateTokensUsed(documents: RetrievedDocument[]): number {
    return documents.reduce((sum, doc) => sum + this.estimateTokenCount(doc.content), 0);
  }
  
  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }
  
  private truncateContent(content: string, maxTokens: number): string {
    const maxChars = maxTokens * 4;
    if (content.length <= maxChars) {
      return content;
    }
    
    // Try to truncate at sentence boundary
    const truncated = content.substring(0, maxChars);
    const lastSentence = truncated.lastIndexOf('.');
    
    if (lastSentence > maxChars * 0.8) {
      return truncated.substring(0, lastSentence + 1);
    }
    
    return truncated + '...';
  }
  
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
      'before', 'after', 'above', 'below', 'between', 'among', 'this', 'that',
      'these', 'those', 'is', 'was', 'are', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'can', 'shall'
    ]);
    
    return stopWords.has(word.toLowerCase());
  }
  
  private createEmptyContext(query: string, processingTime: number): RetrievedContext {
    return {
      documents: [],
      totalRelevance: 0,
      sources: [],
      query,
      processingTime,
      searchMethod: 'vector',
      tokensUsed: 0
    };
  }
}

// Singleton instance
let contextRetrieverInstance: ContextRetriever | null = null;

/**
 * Get or create context retriever singleton
 */
export function getContextRetriever(): ContextRetriever {
  if (!contextRetrieverInstance) {
    contextRetrieverInstance = new ContextRetriever();
  }
  return contextRetrieverInstance;
}

// Export types
export type {
  RetrievalOptions,
  RetrievedDocument,
  RetrievedContext,
  HybridSearchWeights
};
