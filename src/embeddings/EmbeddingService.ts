/**
 * Embedding Management Service
 * Handles embedding generation with caching and multiple provider support
 */

import { OpenAIProvider } from '../llm/providers/OpenAIProvider';
import { LLMEmbeddingRequest } from '../llm/base/LLMProvider';
import { ErrorFactory } from '@/lib/errors';
import { createHash } from 'crypto';
import { Redis } from 'ioredis';

export interface EmbeddingProvider {
  name: string;
  models: string[];
  generateEmbedding(text: string, model: string): Promise<number[]>;
  batchGenerateEmbeddings(texts: string[], model: string): Promise<number[][]>;
  getMaxBatchSize(): number;
  getDimensions(model: string): number;
}

export interface EmbeddingCache {
  get(key: string): Promise<number[] | null>;
  set(key: string, embedding: number[], ttl?: number): Promise<void>;
  clear(): Promise<void>;
  getStats(): Promise<{ hits: number; misses: number; size: number }>;
}

export interface EmbeddingRequest {
  text: string;
  model: string;
  user?: string;
  metadata?: Record<string, any>;
}

export interface BatchEmbeddingRequest {
  texts: string[];
  model: string;
  user?: string;
  metadata?: Record<string, any>;
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  provider: string;
  dimensions: number;
  tokenCount: number;
  cached: boolean;
  processingTime: number;
}

export interface BatchEmbeddingResponse {
  embeddings: number[][];
  model: string;
  provider: string;
  dimensions: number;
  totalTokens: number;
  cached: number;
  processingTime: number;
}

export class RedisEmbeddingCache implements EmbeddingCache {
  private redis: Redis;
  private stats = { hits: 0, misses: 0 };
  private readonly keyPrefix = 'embedding:';
  private readonly defaultTTL = 7 * 24 * 60 * 60; // 7 days
  
  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379', {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });
  }
  
  async get(key: string): Promise<number[] | null> {
    try {
      const cacheKey = this.keyPrefix + key;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        this.stats.hits++;
        return JSON.parse(cached);
      }
      
      this.stats.misses++;
      return null;
      
    } catch (error) {
      console.error('Cache get error:', error);
      this.stats.misses++;
      return null;
    }
  }
  
  async set(key: string, embedding: number[], ttl: number = this.defaultTTL): Promise<void> {
    try {
      const cacheKey = this.keyPrefix + key;
      await this.redis.setex(cacheKey, ttl, JSON.stringify(embedding));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }
  
  async clear(): Promise<void> {
    try {
      const keys = await this.redis.keys(this.keyPrefix + '*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }
  
  async getStats(): Promise<{ hits: number; misses: number; size: number }> {
    try {
      const keys = await this.redis.keys(this.keyPrefix + '*');
      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        size: keys.length
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return { hits: this.stats.hits, misses: this.stats.misses, size: 0 };
    }
  }
}

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'openai';
  readonly models = [
    'text-embedding-3-large',
    'text-embedding-3-small',
    'text-embedding-ada-002'
  ];
  
  private provider: OpenAIProvider;
  
  constructor() {
    this.provider = new OpenAIProvider();
  }
  
  async generateEmbedding(text: string, model: string): Promise<number[]> {
    const request: LLMEmbeddingRequest = {
      input: text,
      model
    };
    
    const response = await this.provider.getEmbedding(request);
    return response.embeddings[0];
  }
  
  async batchGenerateEmbeddings(texts: string[], model: string): Promise<number[][]> {
    const request: LLMEmbeddingRequest = {
      input: texts,
      model
    };
    
    const response = await this.provider.getEmbedding(request);
    return response.embeddings;
  }
  
  getMaxBatchSize(): number {
    return 2048; // OpenAI's batch limit
  }
  
  getDimensions(model: string): number {
    const dimensions = {
      'text-embedding-3-large': 3072,
      'text-embedding-3-small': 1536,
      'text-embedding-ada-002': 1536
    };
    
    return dimensions[model as keyof typeof dimensions] || 1536;
  }
}

export class EmbeddingService {
  private providers: Map<string, EmbeddingProvider> = new Map();
  private cache: EmbeddingCache;
  private readonly maxTextLength = 8192; // Max tokens for embeddings
  
  constructor(cacheUrl?: string) {
    this.cache = new RedisEmbeddingCache(cacheUrl);
    
    // Initialize providers
    this.initializeProviders();
  }
  
  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(
    text: string,
    model: string = 'text-embedding-3-small'
  ): Promise<EmbeddingResponse> {
    const startTime = Date.now();
    
    try {
      // Validate input
      this.validateEmbeddingRequest(text, model);
      
      // Check cache first
      const cacheKey = this.generateCacheKey(text, model);
      const cached = await this.cache.get(cacheKey);
      
      if (cached) {
        console.log('Embedding cache hit:', {
          model,
          textLength: text.length,
          dimensions: cached.length
        });
        
        return {
          embedding: cached,
          model,
          provider: this.getProviderForModel(model),
          dimensions: cached.length,
          tokenCount: this.estimateTokenCount(text),
          cached: true,
          processingTime: Date.now() - startTime
        };
      }
      
      // Generate new embedding
      const provider = this.getProvider(model);
      const embedding = await provider.generateEmbedding(text, model);
      
      // Cache result
      await this.cache.set(cacheKey, embedding);
      
      const response: EmbeddingResponse = {
        embedding,
        model,
        provider: provider.name,
        dimensions: embedding.length,
        tokenCount: this.estimateTokenCount(text),
        cached: false,
        processingTime: Date.now() - startTime
      };
      
      console.log('Embedding generated:', {
        model,
        provider: provider.name,
        textLength: text.length,
        dimensions: embedding.length,
        processingTime: response.processingTime
      });
      
      return response;
      
    } catch (error) {
      console.error('Embedding generation failed:', {
        model,
        textLength: text.length,
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw error;
    }
  }
  
  /**
   * Generate embeddings for multiple texts in batch
   */
  async batchGenerateEmbeddings(
    texts: string[],
    model: string = 'text-embedding-3-small'
  ): Promise<BatchEmbeddingResponse> {
    const startTime = Date.now();
    
    try {
      if (texts.length === 0) {
        throw ErrorFactory.validation(new Error('No texts provided for embedding generation') as any);
      }
      
      console.log('Starting batch embedding generation:', {
        model,
        textCount: texts.length,
        totalLength: texts.reduce((sum, text) => sum + text.length, 0)
      });
      
      // Validate all texts
      texts.forEach((text, index) => {
        try {
          this.validateEmbeddingRequest(text, model);
        } catch (error) {
          throw ErrorFactory.validation(new Error(`Text at index ${index}: ${error instanceof Error ? error.message : String(error)}`) as any);
        }
      });
      
      const provider = this.getProvider(model);
      const maxBatchSize = provider.getMaxBatchSize();
      
      // Check cache for all texts
      const cacheKeys = texts.map(text => this.generateCacheKey(text, model));
      const cachedResults = await Promise.all(
        cacheKeys.map(key => this.cache.get(key))
      );
      
      // Separate cached and uncached texts
      const uncachedIndices: number[] = [];
      const uncachedTexts: string[] = [];
      const finalEmbeddings: number[][] = new Array(texts.length);
      let cachedCount = 0;
      
      cachedResults.forEach((cached, index) => {
        if (cached) {
          finalEmbeddings[index] = cached;
          cachedCount++;
        } else {
          uncachedIndices.push(index);
          uncachedTexts.push(texts[index]);
        }
      });
      
      console.log('Cache status:', {
        total: texts.length,
        cached: cachedCount,
        uncached: uncachedTexts.length
      });
      
      // Generate embeddings for uncached texts in batches
      if (uncachedTexts.length > 0) {
        const newEmbeddings: number[][] = [];
        
        for (let i = 0; i < uncachedTexts.length; i += maxBatchSize) {
          const batch = uncachedTexts.slice(i, i + maxBatchSize);
          const batchEmbeddings = await provider.batchGenerateEmbeddings(batch, model);
          newEmbeddings.push(...batchEmbeddings);
          
          console.log(`Processed batch ${Math.floor(i / maxBatchSize) + 1}/${Math.ceil(uncachedTexts.length / maxBatchSize)}`);
          
          // Add delay between batches to respect rate limits
          if (i + maxBatchSize < uncachedTexts.length) {
            await this.sleep(100);
          }
        }
        
        // Cache new embeddings and place them in final results
        const cachePromises: Promise<void>[] = [];
        uncachedIndices.forEach((originalIndex, newIndex) => {
          const embedding = newEmbeddings[newIndex];
          finalEmbeddings[originalIndex] = embedding;
          
          const cacheKey = cacheKeys[originalIndex];
          cachePromises.push(this.cache.set(cacheKey, embedding));
        });
        
        // Cache all new embeddings
        await Promise.all(cachePromises);
      }
      
      const totalTokens = texts.reduce((sum, text) => sum + this.estimateTokenCount(text), 0);
      const dimensions = provider.getDimensions(model);
      
      const response: BatchEmbeddingResponse = {
        embeddings: finalEmbeddings,
        model,
        provider: provider.name,
        dimensions,
        totalTokens,
        cached: cachedCount,
        processingTime: Date.now() - startTime
      };
      
      console.log('Batch embedding generation completed:', {
        model,
        provider: provider.name,
        textCount: texts.length,
        dimensions,
        cachedCount,
        processingTime: response.processingTime
      });
      
      return response;
      
    } catch (error) {
      console.error('Batch embedding generation failed:', {
        model,
        textCount: texts.length,
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw error;
    }
  }
  
  /**
   * Get available models
   */
  getAvailableModels(): Array<{ provider: string; models: string[] }> {
    return Array.from(this.providers.entries()).map(([name, provider]) => ({
      provider: name,
      models: provider.models
    }));
  }
  
  /**
   * Get model dimensions
   */
  getModelDimensions(model: string): number {
    const provider = this.getProvider(model);
    return provider.getDimensions(model);
  }
  
  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{ hits: number; misses: number; size: number }> {
    return this.cache.getStats();
  }
  
  /**
   * Clear embedding cache
   */
  async clearCache(): Promise<void> {
    await this.cache.clear();
  }
  
  // Private helper methods
  
  private initializeProviders(): void {
    // Initialize OpenAI provider
    if (process.env.OPENAI_API_KEY) {
      const openaiProvider = new OpenAIEmbeddingProvider();
      this.providers.set('openai', openaiProvider);
      
      console.log('OpenAI embedding provider initialized');
    }
    
    if (this.providers.size === 0) {
      console.warn('No embedding providers initialized. Please check your API keys.');
    }
  }
  
  private getProvider(model: string): EmbeddingProvider {
    for (const provider of this.providers.values()) {
      if (provider.models.includes(model)) {
        return provider;
      }
    }
    
    throw ErrorFactory.validation(new Error(`No provider found for embedding model: ${model}`) as any);
  }
  
  private getProviderForModel(model: string): string {
    for (const [name, provider] of this.providers.entries()) {
      if (provider.models.includes(model)) {
        return name;
      }
    }
    
    return 'unknown';
  }
  
  private validateEmbeddingRequest(text: string, model: string): void {
    if (!text || typeof text !== 'string') {
      throw ErrorFactory.validation(new Error('Text must be a non-empty string') as any);
    }
    
    if (text.trim().length === 0) {
      throw ErrorFactory.validation(new Error('Text cannot be empty or only whitespace') as any);
    }
    
    if (text.length > this.maxTextLength * 4) { // Rough character limit
      throw ErrorFactory.validation(new Error(`Text too long. Maximum length is approximately ${this.maxTextLength * 4} characters`) as any);
    }
    
    if (!model || typeof model !== 'string') {
      throw ErrorFactory.validation(new Error('Model must be a non-empty string') as any);
    }
    
    // Check if model is supported
    const isSupported = Array.from(this.providers.values()).some(provider => 
      provider.models.includes(model)
    );
    
    if (!isSupported) {
      const availableModels = Array.from(this.providers.values())
        .flatMap(provider => provider.models);
      
      throw ErrorFactory.validation(new Error(`Unsupported model: ${model}. Available models: ${availableModels.join(', ')}`) as any);
    }
  }
  
  private generateCacheKey(text: string, model: string): string {
    const hash = createHash('sha256');
    hash.update(`${model}:${text}`);
    return hash.digest('hex');
  }
  
  private estimateTokenCount(text: string): number {
    // Rough approximation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
let embeddingServiceInstance: EmbeddingService | null = null;

/**
 * Get or create embedding service singleton
 */
export function getEmbeddingService(): EmbeddingService {
  if (!embeddingServiceInstance) {
    embeddingServiceInstance = new EmbeddingService();
  }
  return embeddingServiceInstance;
}

// Export types
export type {
  EmbeddingProvider,
  EmbeddingRequest,
  BatchEmbeddingRequest,
  EmbeddingResponse,
  BatchEmbeddingResponse
};
