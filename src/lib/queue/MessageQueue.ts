/**
 * Message Queue System with Redis
 * Handles inbound/outbound message processing with retry logic and DLQ
 */

import { Redis } from 'ioredis';
import { InboundMessage, OutboundMessage } from '@/integrations/base/PlatformAdapter';

// Queue job interfaces
export interface QueueJob<T = any> {
  id: string;
  data: T;
  attempts: number;
  maxAttempts: number;
  delay: number;
  priority: number;
  correlationId: string;
  createdAt: Date;
  processAt: Date;
  metadata?: Record<string, any>;
}

export interface InboundMessageJob extends QueueJob<InboundMessage> {
  type: 'inbound_message';
}

export interface OutboundMessageJob extends QueueJob<OutboundMessage> {
  type: 'outbound_message';
}

export interface ProcessingJob extends QueueJob {
  type: 'processing';
  data: {
    messageId: string;
    agentId: string;
    conversationId: string;
    prompt: string;
    context?: any;
  };
}

export type MessageJob = InboundMessageJob | OutboundMessageJob | ProcessingJob;

// Queue configuration
export interface QueueConfig {
  maxAttempts: number;
  defaultDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  processingTimeout: number;
  batchSize: number;
  concurrency: number;
}

// Queue statistics
export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

// Default queue configurations
const DEFAULT_CONFIGS: Record<string, QueueConfig> = {
  inbound: {
    maxAttempts: 5,
    defaultDelay: 0,
    maxDelay: 300000, // 5 minutes
    backoffMultiplier: 2,
    processingTimeout: 30000, // 30 seconds
    batchSize: 10,
    concurrency: 5
  },
  processing: {
    maxAttempts: 3,
    defaultDelay: 1000, // 1 second
    maxDelay: 60000, // 1 minute
    backoffMultiplier: 2,
    processingTimeout: 120000, // 2 minutes
    batchSize: 5,
    concurrency: 3
  },
  outbound: {
    maxAttempts: 5,
    defaultDelay: 0,
    maxDelay: 300000, // 5 minutes
    backoffMultiplier: 2,
    processingTimeout: 30000, // 30 seconds
    batchSize: 10,
    concurrency: 5
  },
  dlq: {
    maxAttempts: 1,
    defaultDelay: 0,
    maxDelay: 0,
    backoffMultiplier: 1,
    processingTimeout: 60000, // 1 minute
    batchSize: 1,
    concurrency: 1
  }
};

export class MessageQueue {
  private redis: Redis;
  private queues = {
    inbound: 'messages:inbound',
    processing: 'messages:processing',
    outbound: 'messages:outbound',
    dlq: 'messages:failed'
  };
  
  private processors: Map<string, (job: MessageJob) => Promise<void>> = new Map();
  private isProcessing: Map<string, boolean> = new Map();
  private processingIntervals: Map<string, NodeJS.Timeout> = new Map();
  
  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379', {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });
    
    // Initialize processing state
    Object.keys(this.queues).forEach(queueName => {
      this.isProcessing.set(queueName, false);
    });
  }
  
  /**
   * Enqueue inbound message for processing
   */
  async enqueueInbound(
    message: InboundMessage,
    priority: number = 0,
    delay: number = 0
  ): Promise<string> {
    const job: InboundMessageJob = {
      id: this.generateJobId(),
      type: 'inbound_message',
      data: message,
      attempts: 0,
      maxAttempts: DEFAULT_CONFIGS.inbound.maxAttempts,
      delay,
      priority,
      correlationId: message.correlationId,
      createdAt: new Date(),
      processAt: new Date(Date.now() + delay),
      metadata: {
        platform: message.platform,
        agentId: message.agentId,
        messageType: message.content.type
      }
    };
    
    await this.addJob(this.queues.inbound, job);
    
    console.log('Inbound message enqueued:', {
      jobId: job.id,
      messageId: message.id,
      platform: message.platform,
      agentId: message.agentId,
      correlationId: message.correlationId
    });
    
    return job.id;
  }
  
  /**
   * Enqueue processing job for LLM response generation
   */
  async enqueueProcessing(
    messageId: string,
    agentId: string,
    conversationId: string,
    prompt: string,
    context?: any,
    priority: number = 0,
    delay: number = DEFAULT_CONFIGS.processing.defaultDelay
  ): Promise<string> {
    const job: ProcessingJob = {
      id: this.generateJobId(),
      type: 'processing',
      data: {
        messageId,
        agentId,
        conversationId,
        prompt,
        context
      },
      attempts: 0,
      maxAttempts: DEFAULT_CONFIGS.processing.maxAttempts,
      delay,
      priority,
      correlationId: context?.correlationId || this.generateCorrelationId(),
      createdAt: new Date(),
      processAt: new Date(Date.now() + delay),
      metadata: {
        agentId,
        conversationId,
        promptLength: prompt.length
      }
    };
    
    await this.addJob(this.queues.processing, job);
    
    console.log('Processing job enqueued:', {
      jobId: job.id,
      messageId,
      agentId,
      conversationId,
      correlationId: job.correlationId
    });
    
    return job.id;
  }
  
  /**
   * Enqueue outbound message for delivery
   */
  async enqueueOutbound(
    message: OutboundMessage,
    priority: number = 0,
    delay: number = 0
  ): Promise<string> {
    const job: OutboundMessageJob = {
      id: this.generateJobId(),
      type: 'outbound_message',
      data: message,
      attempts: 0,
      maxAttempts: DEFAULT_CONFIGS.outbound.maxAttempts,
      delay,
      priority,
      correlationId: message.correlationId,
      createdAt: new Date(),
      processAt: new Date(Date.now() + delay),
      metadata: {
        platform: message.platform,
        agentId: message.agentId,
        messageType: message.content.type
      }
    };
    
    await this.addJob(this.queues.outbound, job);
    
    console.log('Outbound message enqueued:', {
      jobId: job.id,
      messageId: message.id,
      platform: message.platform,
      agentId: message.agentId,
      correlationId: message.correlationId
    });
    
    return job.id;
  }
  
  /**
   * Register a processor for a specific queue
   */
  registerProcessor(
    queueName: keyof typeof this.queues,
    processor: (job: MessageJob) => Promise<void>
  ): void {
    this.processors.set(queueName, processor);
    console.log(`Processor registered for queue: ${queueName}`);
  }
  
  /**
   * Start processing jobs from a specific queue
   */
  async startProcessing(queueName: keyof typeof this.queues): Promise<void> {
    if (this.isProcessing.get(queueName)) {
      console.log(`Queue ${queueName} is already being processed`);
      return;
    }
    
    const processor = this.processors.get(queueName);
    if (!processor) {
      throw new Error(`No processor registered for queue: ${queueName}`);
    }
    
    this.isProcessing.set(queueName, true);
    
    const config = DEFAULT_CONFIGS[queueName];
    const interval = setInterval(async () => {
      try {
        await this.processJobs(queueName, processor, config);
      } catch (error) {
        console.error(`Error processing queue ${queueName}:`, error);
      }
    }, 1000); // Check every second
    
    this.processingIntervals.set(queueName, interval);
    
    console.log(`Started processing queue: ${queueName}`);
  }
  
  /**
   * Stop processing jobs from a specific queue
   */
  async stopProcessing(queueName: keyof typeof this.queues): Promise<void> {
    this.isProcessing.set(queueName, false);
    
    const interval = this.processingIntervals.get(queueName);
    if (interval) {
      clearInterval(interval);
      this.processingIntervals.delete(queueName);
    }
    
    console.log(`Stopped processing queue: ${queueName}`);
  }
  
  /**
   * Get queue statistics
   */
  async getStats(queueName: keyof typeof this.queues): Promise<QueueStats> {
    const queueKey = this.queues[queueName];
    
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.redis.llen(`${queueKey}:waiting`),
      this.redis.llen(`${queueKey}:active`),
      this.redis.get(`${queueKey}:completed`).then(val => parseInt(val || '0')),
      this.redis.llen(`${queueKey}:failed`),
      this.redis.zcard(`${queueKey}:delayed`)
    ]);
    
    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused: !this.isProcessing.get(queueName)
    };
  }
  
  /**
   * Get failed jobs for manual inspection
   */
  async getFailedJobs(queueName: keyof typeof this.queues, limit: number = 10): Promise<MessageJob[]> {
    const queueKey = this.queues[queueName];
    const failedJobs = await this.redis.lrange(`${queueKey}:failed`, 0, limit - 1);
    
    return failedJobs.map(jobData => JSON.parse(jobData));
  }
  
  /**
   * Retry a failed job
   */
  async retryJob(queueName: keyof typeof this.queues, jobId: string): Promise<boolean> {
    const queueKey = this.queues[queueName];
    
    // Find the job in failed queue
    const failedJobs = await this.redis.lrange(`${queueKey}:failed`, 0, -1);
    const jobIndex = failedJobs.findIndex(jobData => {
      const job = JSON.parse(jobData);
      return job.id === jobId;
    });
    
    if (jobIndex === -1) {
      return false;
    }
    
    // Remove from failed queue and re-enqueue
    const jobData = failedJobs[jobIndex];
    const job: MessageJob = JSON.parse(jobData);
    
    // Reset attempts and update process time
    job.attempts = 0;
    job.processAt = new Date();
    
    await Promise.all([
      this.redis.lrem(`${queueKey}:failed`, 1, jobData),
      this.addJob(queueKey, job)
    ]);
    
    console.log(`Job ${jobId} retried in queue ${queueName}`);
    return true;
  }
  
  /**
   * Clear all jobs from a queue
   */
  async clearQueue(queueName: keyof typeof this.queues): Promise<void> {
    const queueKey = this.queues[queueName];
    
    await Promise.all([
      this.redis.del(`${queueKey}:waiting`),
      this.redis.del(`${queueKey}:active`),
      this.redis.del(`${queueKey}:delayed`),
      this.redis.del(`${queueKey}:failed`),
      this.redis.del(`${queueKey}:completed`)
    ]);
    
    console.log(`Queue ${queueName} cleared`);
  }
  
  /**
   * Close Redis connection and stop all processing
   */
  async close(): Promise<void> {
    // Stop all processing
    for (const queueName of Object.keys(this.queues) as Array<keyof typeof this.queues>) {
      await this.stopProcessing(queueName);
    }
    
    // Close Redis connection
    await this.redis.quit();
    
    console.log('Message queue system closed');
  }
  
  // Private methods
  
  private async addJob(queueKey: string, job: MessageJob): Promise<void> {
    const jobData = JSON.stringify(job);
    
    if (job.delay > 0) {
      // Add to delayed queue
      const score = job.processAt.getTime();
      await this.redis.zadd(`${queueKey}:delayed`, score, jobData);
    } else {
      // Add to waiting queue with priority
      if (job.priority > 0) {
        await this.redis.lpush(`${queueKey}:waiting`, jobData);
      } else {
        await this.redis.rpush(`${queueKey}:waiting`, jobData);
      }
    }
  }
  
  private async processJobs(
    queueName: keyof typeof this.queues,
    processor: (job: MessageJob) => Promise<void>,
    config: QueueConfig
  ): Promise<void> {
    const queueKey = this.queues[queueName];
    
    // Move delayed jobs to waiting queue if ready
    await this.moveDelayedJobs(queueKey);
    
    // Process jobs up to concurrency limit
    const activeCount = await this.redis.llen(`${queueKey}:active`);
    const availableSlots = config.concurrency - activeCount;
    
    if (availableSlots <= 0) {
      return;
    }
    
    // Get jobs from waiting queue
    const jobsData = await this.redis.lrange(`${queueKey}:waiting`, 0, Math.min(availableSlots, config.batchSize) - 1);
    
    if (jobsData.length === 0) {
      return;
    }
    
    // Move jobs to active queue and process
    const pipeline = this.redis.pipeline();
    
    for (const jobData of jobsData) {
      pipeline.lrem(`${queueKey}:waiting`, 1, jobData);
      pipeline.lpush(`${queueKey}:active`, jobData);
    }
    
    await pipeline.exec();
    
    // Process jobs concurrently
    const processingPromises = jobsData.map(async (jobData) => {
      const job: MessageJob = JSON.parse(jobData);
      
      try {
        // Set processing timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Job ${job.id} timed out after ${config.processingTimeout}ms`));
          }, config.processingTimeout);
        });
        
        // Process job with timeout
        await Promise.race([
          processor(job),
          timeoutPromise
        ]);
        
        // Job completed successfully
        await this.completeJob(queueKey, job);
        
      } catch (error) {
        console.error(`Job ${job.id} failed:`, error);
        await this.handleJobFailure(queueKey, job, error, config);
      }
    });
    
    await Promise.allSettled(processingPromises);
  }
  
  private async moveDelayedJobs(queueKey: string): Promise<void> {
    const now = Date.now();
    const readyJobs = await this.redis.zrangebyscore(`${queueKey}:delayed`, 0, now);
    
    if (readyJobs.length === 0) {
      return;
    }
    
    const pipeline = this.redis.pipeline();
    
    for (const jobData of readyJobs) {
      pipeline.zrem(`${queueKey}:delayed`, jobData);
      pipeline.rpush(`${queueKey}:waiting`, jobData);
    }
    
    await pipeline.exec();
  }
  
  private async completeJob(queueKey: string, job: MessageJob): Promise<void> {
    const jobData = JSON.stringify(job);
    
    await Promise.all([
      this.redis.lrem(`${queueKey}:active`, 1, jobData),
      this.redis.incr(`${queueKey}:completed`)
    ]);
    
    console.log(`Job ${job.id} completed successfully`);
  }
  
  private async handleJobFailure(
    queueKey: string,
    job: MessageJob,
    error: any,
    config: QueueConfig
  ): Promise<void> {
    const jobData = JSON.stringify(job);
    
    // Remove from active queue
    await this.redis.lrem(`${queueKey}:active`, 1, jobData);
    
    job.attempts++;
    
    if (job.attempts >= job.maxAttempts) {
      // Move to failed queue or DLQ
      if (queueKey !== this.queues.dlq) {
        // Add error information
        job.metadata = {
          ...job.metadata,
          lastError: error instanceof Error ? error.message : String(error),
          failedAt: new Date().toISOString()
        };
        
        await this.redis.lpush(`${queueKey}:failed`, JSON.stringify(job));
        
        // Also add to DLQ for centralized failed job management
        await this.redis.lpush(this.queues.dlq, JSON.stringify(job));
      } else {
        // Already in DLQ, just mark as failed
        await this.redis.lpush(`${queueKey}:failed`, JSON.stringify(job));
      }
      
      console.error(`Job ${job.id} failed permanently after ${job.attempts} attempts`);
    } else {
      // Retry with exponential backoff
      const delay = Math.min(
        config.defaultDelay * Math.pow(config.backoffMultiplier, job.attempts - 1),
        config.maxDelay
      );
      
      job.delay = delay;
      job.processAt = new Date(Date.now() + delay);
      
      await this.addJob(queueKey, job);
      
      console.log(`Job ${job.id} scheduled for retry ${job.attempts}/${job.maxAttempts} in ${delay}ms`);
    }
  }
  
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
let messageQueueInstance: MessageQueue | null = null;

/**
 * Get or create message queue singleton
 */
export function getMessageQueue(): MessageQueue {
  if (!messageQueueInstance) {
    messageQueueInstance = new MessageQueue();
  }
  return messageQueueInstance;
}

// Export types
export type { QueueJob, InboundMessageJob, OutboundMessageJob, ProcessingJob, MessageJob, QueueConfig, QueueStats };
