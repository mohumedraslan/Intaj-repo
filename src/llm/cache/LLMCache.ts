/**
 * LLM Response Caching System
 * Redis-based caching with intelligent TTL and cache invalidation strategies
 */

import { Redis } from 'ioredis';
import { LLMResponse } from '../base/LLMProvider';
import { createHash } from 'crypto';

export interface CacheConfig {
  defaultTTL: number;
  maxCacheSize: number;
  enableCompression: boolean;
  keyPrefix: string;
  ttlByModel: Record<string, number>;
  ttlByContentType: Record<string, number>;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalKeys: number;
  memoryUsage: number;
  evictions: number;
}

export interface CacheEntry {
  response: LLMResponse;
  cachedAt: Date;
  accessCount: number;
  lastAccessed: Date;
  ttl: number;
  compressed: boolean;
}

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  defaultTTL: 3600, // 1 hour
  maxCacheSize: 10000, // Maximum number of cached entries
  enableCompression: true,
  keyPrefix: 'llm_cache:',
  ttlByModel: {
    'gpt-4o': 7200, // 2 hours for expensive models
    'gpt-4o-mini': 3600, // 1 hour for cheaper models
    'gpt-3.5-turbo': 1800, // 30 minutes for fast models
    'claude-3-opus': 7200,
    'claude-3-sonnet': 3600,
    'claude-3-haiku': 1800
  },
  ttlByContentType: {
    'creative': 1800, // 30 minutes for creative content
    'factual': 7200, // 2 hours for factual content
    'code': 3600, // 1 hour for code generation
    'analysis': 5400, // 1.5 hours for analysis
    'translation': 86400 // 24 hours for translations
  }
};

export class LLMResponseCache {
  private redis: Redis;
  private config: CacheConfig;
  private stats: CacheStats;
  
  constructor(redisUrl?: string, config: Partial<CacheConfig> = {}) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379', {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });
    
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalKeys: 0,
      memoryUsage: 0,
      evictions: 0
    };
    
    // Initialize stats from Redis
    this.initializeStats();
  }
  
  /**
   * Get cached LLM response
   */
  async get(key: string): Promise<LLMResponse | null> {
    try {
      const cacheKey = this.buildCacheKey(key);
      const cachedData = await this.redis.get(cacheKey);
      
      if (!cachedData) {
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }
      
      const entry: CacheEntry = JSON.parse(cachedData);
      
      // Update access statistics
      entry.accessCount++;
      entry.lastAccessed = new Date();
      
      // Update cache entry with new access stats
      await this.redis.setex(
        cacheKey,
        entry.ttl,
        JSON.stringify(entry)
      );
      
      this.stats.hits++;
      this.updateHitRate();
      
      console.log('Cache hit:', {
        key: key.substring(0, 50) + '...',
        model: entry.response.model,
        accessCount: entry.accessCount,
        cachedAt: entry.cachedAt
      });
      
      return entry.response;
      
    } catch (error) {
      console.error('Cache get error:', {
        key: key.substring(0, 50) + '...',
        error: error instanceof Error ? error.message : String(error)
      });
      
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
  }
  
  /**
   * Set LLM response in cache
   */
  async set(
    key: string,
    response: LLMResponse,
    options: {
      ttl?: number;
      contentType?: string;
      tags?: string[];
    } = {}
  ): Promise<void> {
    try {
      const cacheKey = this.buildCacheKey(key);
      
      // Determine TTL
      const ttl = this.calculateTTL(response, options);
      
      // Create cache entry
      const entry: CacheEntry = {
        response,
        cachedAt: new Date(),
        accessCount: 0,
        lastAccessed: new Date(),
        ttl,
        compressed: this.config.enableCompression
      };
      
      // Check cache size limits
      await this.enforceMaxCacheSize();
      
      // Store in cache
      await this.redis.setex(cacheKey, ttl, JSON.stringify(entry));
      
      // Update tags if provided
      if (options.tags && options.tags.length > 0) {
        await this.setTags(cacheKey, options.tags);
      }
      
      this.stats.totalKeys++;
      
      console.log('Cache set:', {
        key: key.substring(0, 50) + '...',
        model: response.model,
        ttl,
        contentType: options.contentType,
        tags: options.tags
      });
      
    } catch (error) {
      console.error('Cache set error:', {
        key: key.substring(0, 50) + '...',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Delete cached response
   */
  async delete(key: string): Promise<boolean> {
    try {
      const cacheKey = this.buildCacheKey(key);
      const result = await this.redis.del(cacheKey);
      
      if (result > 0) {
        this.stats.totalKeys--;
        await this.removeTags(cacheKey);
        
        console.log('Cache delete:', {
          key: key.substring(0, 50) + '...',
          success: true
        });
        
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('Cache delete error:', {
        key: key.substring(0, 50) + '...',
        error: error instanceof Error ? error.message : String(error)
      });
      
      return false;
    }
  }
  
  /**
   * Clear cache by tags
   */
  async clearByTags(tags: string[]): Promise<number> {
    try {
      let clearedCount = 0;
      
      for (const tag of tags) {
        const tagKey = `${this.config.keyPrefix}tag:${tag}`;
        const keys = await this.redis.smembers(tagKey);
        
        if (keys.length > 0) {
          const pipeline = this.redis.pipeline();
          
          for (const key of keys) {
            pipeline.del(key);
          }
          
          pipeline.del(tagKey);
          await pipeline.exec();
          
          clearedCount += keys.length;
          this.stats.totalKeys -= keys.length;
        }
      }
      
      console.log('Cache cleared by tags:', {
        tags,
        clearedCount
      });
      
      return clearedCount;
      
    } catch (error) {
      console.error('Cache clear by tags error:', {
        tags,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return 0;
    }
  }
  
  /**
   * Clear cache by model
   */
  async clearByModel(model: string): Promise<number> {
    try {
      const pattern = `${this.config.keyPrefix}*`;
      const keys = await this.redis.keys(pattern);
      let clearedCount = 0;
      
      for (const key of keys) {
        const cachedData = await this.redis.get(key);
        if (cachedData) {
          const entry: CacheEntry = JSON.parse(cachedData);
          if (entry.response.model === model) {
            await this.redis.del(key);
            clearedCount++;
          }
        }
      }
      
      this.stats.totalKeys -= clearedCount;
      
      console.log('Cache cleared by model:', {
        model,
        clearedCount
      });
      
      return clearedCount;
      
    } catch (error) {
      console.error('Cache clear by model error:', {
        model,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return 0;
    }
  }
  
  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      const pattern = `${this.config.keyPrefix}*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      
      this.stats.totalKeys = 0;
      this.stats.hits = 0;
      this.stats.misses = 0;
      this.stats.hitRate = 0;
      
      console.log('Cache cleared completely:', {
        keysRemoved: keys.length
      });
      
    } catch (error) {
      console.error('Cache clear error:', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    try {
      // Update memory usage
      const info = await this.redis.memory('usage', `${this.config.keyPrefix}*`);
      this.stats.memoryUsage = info || 0;
      
      // Update total keys count
      const pattern = `${this.config.keyPrefix}*`;
      const keys = await this.redis.keys(pattern);
      this.stats.totalKeys = keys.length;
      
      return { ...this.stats };
      
    } catch (error) {
      console.error('Cache stats error:', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      return { ...this.stats };
    }
  }
  
  /**
   * Generate cache key from prompt and parameters
   */
  generateCacheKey(
    messages: any[],
    model: string,
    temperature?: number,
    maxTokens?: number,
    otherParams?: Record<string, any>
  ): string {
    const keyData = {
      messages,
      model,
      temperature: temperature || 0.7,
      maxTokens: maxTokens || 1000,
      ...otherParams
    };
    
    const keyString = JSON.stringify(keyData);
    return createHash('sha256').update(keyString).digest('hex');
  }
  
  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
  
  // Private helper methods
  
  private buildCacheKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }
  
  private calculateTTL(
    response: LLMResponse,
    options: { ttl?: number; contentType?: string }
  ): number {
    // Use explicit TTL if provided
    if (options.ttl) {
      return options.ttl;
    }
    
    // Use model-specific TTL
    if (this.config.ttlByModel[response.model]) {
      return this.config.ttlByModel[response.model];
    }
    
    // Use content-type specific TTL
    if (options.contentType && this.config.ttlByContentType[options.contentType]) {
      return this.config.ttlByContentType[options.contentType];
    }
    
    // Use default TTL
    return this.config.defaultTTL;
  }
  
  private async enforceMaxCacheSize(): Promise<void> {
    try {
      if (this.stats.totalKeys >= this.config.maxCacheSize) {
        // Remove oldest entries (LRU eviction)
        const pattern = `${this.config.keyPrefix}*`;
        const keys = await this.redis.keys(pattern);
        
        // Get access times for all keys
        const keyAccessTimes: Array<{ key: string; lastAccessed: Date }> = [];
        
        for (const key of keys) {
          const cachedData = await this.redis.get(key);
          if (cachedData) {
            const entry: CacheEntry = JSON.parse(cachedData);
            keyAccessTimes.push({
              key,
              lastAccessed: new Date(entry.lastAccessed)
            });
          }
        }
        
        // Sort by last accessed time (oldest first)
        keyAccessTimes.sort((a, b) => a.lastAccessed.getTime() - b.lastAccessed.getTime());
        
        // Remove oldest 10% of entries
        const toRemove = Math.floor(this.config.maxCacheSize * 0.1);
        const keysToRemove = keyAccessTimes.slice(0, toRemove).map(item => item.key);
        
        if (keysToRemove.length > 0) {
          await this.redis.del(...keysToRemove);
          this.stats.totalKeys -= keysToRemove.length;
          this.stats.evictions += keysToRemove.length;
          
          console.log('Cache eviction:', {
            removedKeys: keysToRemove.length,
            totalKeys: this.stats.totalKeys
          });
        }
      }
    } catch (error) {
      console.error('Cache size enforcement error:', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  private async setTags(cacheKey: string, tags: string[]): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    for (const tag of tags) {
      const tagKey = `${this.config.keyPrefix}tag:${tag}`;
      pipeline.sadd(tagKey, cacheKey);
      pipeline.expire(tagKey, this.config.defaultTTL * 2); // Tags live longer than cache entries
    }
    
    await pipeline.exec();
  }
  
  private async removeTags(cacheKey: string): Promise<void> {
    // This is a simplified implementation
    // In production, you might want to maintain a reverse index
    const tagPattern = `${this.config.keyPrefix}tag:*`;
    const tagKeys = await this.redis.keys(tagPattern);
    
    const pipeline = this.redis.pipeline();
    for (const tagKey of tagKeys) {
      pipeline.srem(tagKey, cacheKey);
    }
    
    await pipeline.exec();
  }
  
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }
  
  private async initializeStats(): Promise<void> {
    try {
      // Initialize stats from Redis if they exist
      const statsKey = `${this.config.keyPrefix}stats`;
      const statsData = await this.redis.get(statsKey);
      
      if (statsData) {
        const savedStats = JSON.parse(statsData);
        this.stats = { ...this.stats, ...savedStats };
      }
      
      // Save stats periodically
      setInterval(async () => {
        await this.redis.setex(statsKey, 86400, JSON.stringify(this.stats)); // Save for 24 hours
      }, 60000); // Save every minute
      
    } catch (error) {
      console.error('Stats initialization error:', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

// Singleton instance
let cacheInstance: LLMResponseCache | null = null;

/**
 * Get or create cache singleton
 */
export function getLLMCache(): LLMResponseCache {
  if (!cacheInstance) {
    cacheInstance = new LLMResponseCache();
  }
  return cacheInstance;
}

// Export types
export type { CacheConfig, CacheStats, CacheEntry };
