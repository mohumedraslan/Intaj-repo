/**
 * Message Processing Workers
 * Background workers for processing inbound/outbound messages with proper error handling
 */

import { getMessageQueue, MessageJob, InboundMessageJob, OutboundMessageJob, ProcessingJob } from '@/lib/queue/MessageQueue';
import { getIntegrationGateway } from '@/services/integrationGateway';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Worker configuration
interface WorkerConfig {
  concurrency: number;
  pollInterval: number;
  maxRetries: number;
  shutdownTimeout: number;
}

const DEFAULT_CONFIG: WorkerConfig = {
  concurrency: 5,
  pollInterval: 1000, // 1 second
  maxRetries: 3,
  shutdownTimeout: 30000 // 30 seconds
};

export class MessageProcessorWorker {
  private messageQueue = getMessageQueue();
  private integrationGateway = getIntegrationGateway();
  private supabase;
  private isShuttingDown = false;
  private activeJobs = new Set<string>();
  
  constructor(private config: WorkerConfig = DEFAULT_CONFIG) {
    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  
  /**
   * Start all message processing workers
   */
  async start(): Promise<void> {
    console.log('Starting message processor workers...');
    
    // Register processors
    this.messageQueue.registerProcessor('inbound', this.processInboundMessage.bind(this));
    this.messageQueue.registerProcessor('processing', this.processLLMGeneration.bind(this));
    this.messageQueue.registerProcessor('outbound', this.processOutboundMessage.bind(this));
    this.messageQueue.registerProcessor('dlq', this.processDLQMessage.bind(this));
    
    // Start processing queues
    await Promise.all([
      this.messageQueue.startProcessing('inbound'),
      this.messageQueue.startProcessing('processing'),
      this.messageQueue.startProcessing('outbound'),
      this.messageQueue.startProcessing('dlq')
    ]);
    
    // Setup graceful shutdown
    process.on('SIGINT', this.shutdown.bind(this));
    process.on('SIGTERM', this.shutdown.bind(this));
    
    console.log('Message processor workers started successfully');
  }
  
  /**
   * Stop all workers gracefully
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }
    
    console.log('Shutting down message processor workers...');
    this.isShuttingDown = true;
    
    // Stop accepting new jobs
    await Promise.all([
      this.messageQueue.stopProcessing('inbound'),
      this.messageQueue.stopProcessing('processing'),
      this.messageQueue.stopProcessing('outbound'),
      this.messageQueue.stopProcessing('dlq')
    ]);
    
    // Wait for active jobs to complete
    const shutdownStart = Date.now();
    while (this.activeJobs.size > 0 && (Date.now() - shutdownStart) < this.config.shutdownTimeout) {
      console.log(`Waiting for ${this.activeJobs.size} active jobs to complete...`);
      await this.sleep(1000);
    }
    
    if (this.activeJobs.size > 0) {
      console.warn(`Forcefully terminating ${this.activeJobs.size} active jobs`);
    }
    
    // Close connections
    await this.messageQueue.close();
    
    console.log('Message processor workers shut down successfully');
    process.exit(0);
  }
  
  /**
   * Process inbound message - convert to processing job
   */
  private async processInboundMessage(job: MessageJob): Promise<void> {
    const inboundJob = job as InboundMessageJob;
    const message = inboundJob.data;
    
    this.activeJobs.add(job.id);
    
    try {
      console.log('Processing inbound message:', {
        jobId: job.id,
        messageId: message.id,
        platform: message.platform,
        agentId: message.agentId,
        correlationId: message.correlationId
      });
      
      // Get agent configuration for LLM processing
      const { data: agent, error: agentError } = await this.supabase
        .from('agents')
        .select('*')
        .eq('id', message.agentId)
        .single();
      
      if (agentError || !agent) {
        throw new Error(`Agent not found: ${message.agentId}`);
      }
      
      // Get conversation context
      const conversationContext = await this.getConversationContext(message.conversationId);
      
      // Create prompt for LLM
      const prompt = this.buildLLMPrompt(message, agent, conversationContext);
      
      // Enqueue for LLM processing
      await this.messageQueue.enqueueProcessing(
        message.id,
        message.agentId,
        message.conversationId,
        prompt,
        {
          correlationId: message.correlationId,
          originalMessage: message,
          agent,
          conversationContext
        }
      );
      
      console.log('Inbound message processed and queued for LLM:', {
        jobId: job.id,
        messageId: message.id,
        correlationId: message.correlationId
      });
      
    } catch (error) {
      console.error('Failed to process inbound message:', {
        jobId: job.id,
        messageId: message.id,
        error: error instanceof Error ? error.message : String(error),
        correlationId: message.correlationId
      });
      
      throw error;
    } finally {
      this.activeJobs.delete(job.id);
    }
  }
  
  /**
   * Process LLM generation job
   */
  private async processLLMGeneration(job: MessageJob): Promise<void> {
    const processingJob = job as ProcessingJob;
    const { messageId, agentId, conversationId, prompt, context } = processingJob.data;
    
    this.activeJobs.add(job.id);
    
    try {
      console.log('Processing LLM generation:', {
        jobId: job.id,
        messageId,
        agentId,
        conversationId,
        correlationId: job.correlationId
      });
      
      // Call LLM service to generate response
      const llmResponse = await this.generateLLMResponse(prompt, context);
      
      if (!llmResponse) {
        throw new Error('LLM service returned empty response');
      }
      
      // Create outbound message
      const outboundMessage = this.createOutboundMessage(
        context.originalMessage,
        llmResponse,
        context.agent
      );
      
      // Store outbound message in database
      await this.storeOutboundMessage(outboundMessage);
      
      // Enqueue for delivery
      await this.messageQueue.enqueueOutbound(outboundMessage);
      
      console.log('LLM processing completed and queued for delivery:', {
        jobId: job.id,
        messageId,
        outboundMessageId: outboundMessage.id,
        correlationId: job.correlationId
      });
      
    } catch (error) {
      console.error('Failed to process LLM generation:', {
        jobId: job.id,
        messageId,
        error: error instanceof Error ? error.message : String(error),
        correlationId: job.correlationId
      });
      
      throw error;
    } finally {
      this.activeJobs.delete(job.id);
    }
  }
  
  /**
   * Process outbound message delivery
   */
  private async processOutboundMessage(job: MessageJob): Promise<void> {
    const outboundJob = job as OutboundMessageJob;
    const message = outboundJob.data;
    
    this.activeJobs.add(job.id);
    
    try {
      console.log('Processing outbound message:', {
        jobId: job.id,
        messageId: message.id,
        platform: message.platform,
        agentId: message.agentId,
        correlationId: message.correlationId
      });
      
      // Send message through integration gateway
      const success = await this.integrationGateway.sendOutboundMessage(
        message,
        message.correlationId
      );
      
      if (!success) {
        throw new Error('Failed to send outbound message');
      }
      
      console.log('Outbound message delivered successfully:', {
        jobId: job.id,
        messageId: message.id,
        correlationId: message.correlationId
      });
      
    } catch (error) {
      console.error('Failed to process outbound message:', {
        jobId: job.id,
        messageId: message.id,
        error: error instanceof Error ? error.message : String(error),
        correlationId: message.correlationId
      });
      
      throw error;
    } finally {
      this.activeJobs.delete(job.id);
    }
  }
  
  /**
   * Process dead letter queue messages
   */
  private async processDLQMessage(job: MessageJob): Promise<void> {
    this.activeJobs.add(job.id);
    
    try {
      console.log('Processing DLQ message:', {
        jobId: job.id,
        jobType: job.type,
        attempts: job.attempts,
        correlationId: job.correlationId,
        lastError: job.metadata?.lastError
      });
      
      // Log failed job for manual inspection
      await this.logFailedJob(job);
      
      // Send alert for critical failures
      if (job.attempts >= job.maxAttempts) {
        await this.sendFailureAlert(job);
      }
      
      console.log('DLQ message processed:', {
        jobId: job.id,
        correlationId: job.correlationId
      });
      
    } catch (error) {
      console.error('Failed to process DLQ message:', {
        jobId: job.id,
        error: error instanceof Error ? error.message : String(error),
        correlationId: job.correlationId
      });
      
      // Don't throw error for DLQ processing to prevent infinite loops
    } finally {
      this.activeJobs.delete(job.id);
    }
  }
  
  // Helper methods
  
  private async getConversationContext(conversationId: string): Promise<any[]> {
    const { data: messages, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(10); // Last 10 messages for context
    
    if (error) {
      console.error('Failed to get conversation context:', error);
      return [];
    }
    
    return messages || [];
  }
  
  private buildLLMPrompt(message: any, agent: any, context: any[]): string {
    // Build context from previous messages
    const contextMessages = context
      .reverse() // Chronological order
      .map(msg => `${msg.direction}: ${msg.content_text}`)
      .join('\n');
    
    // Build the prompt
    const prompt = `
Agent: ${agent.name}
Type: ${agent.agent_type}
Base Prompt: ${agent.base_prompt}

Conversation Context:
${contextMessages}

Current Message: ${message.content.text}
Sender: ${message.senderName || message.senderId}
Platform: ${message.platform}

Please respond as the agent would, following the base prompt and considering the conversation context.
    `.trim();
    
    return prompt;
  }
  
  private async generateLLMResponse(prompt: string, context: any): Promise<string> {
    try {
      // This would integrate with your LLM service
      // For now, return a placeholder response
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/v1/internal/llm-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.INTERNAL_SERVICE_TOKEN}`
        },
        body: JSON.stringify({
          prompt,
          agentId: context.agent.id,
          model: context.agent.settings?.model || 'gpt-4o',
          temperature: context.agent.settings?.temperature || 0.7,
          maxTokens: context.agent.settings?.max_tokens || 1000
        })
      });
      
      if (!response.ok) {
        throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.data?.response || 'I apologize, but I encountered an error processing your message.';
      
    } catch (error) {
      console.error('LLM generation failed:', error);
      return 'I apologize, but I encountered an error processing your message. Please try again.';
    }
  }
  
  private createOutboundMessage(inboundMessage: any, llmResponse: string, agent: any): any {
    return {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      platform: inboundMessage.platform,
      agentId: inboundMessage.agentId,
      conversationId: inboundMessage.conversationId,
      recipientId: inboundMessage.senderId,
      content: {
        type: 'text',
        text: llmResponse
      },
      metadata: {
        replyTo: inboundMessage.id,
        generatedBy: 'llm',
        model: agent.settings?.model || 'gpt-4o'
      },
      replyToMessageId: inboundMessage.platformMessageId,
      correlationId: inboundMessage.correlationId
    };
  }
  
  private async storeOutboundMessage(message: any): Promise<void> {
    const messageData = {
      id: message.id,
      agent_id: message.agentId,
      conversation_id: message.conversationId,
      platform: message.platform,
      recipient_id: message.recipientId,
      content_type: message.content.type,
      content_text: message.content.text,
      content_metadata: message.content,
      message_metadata: message.metadata,
      direction: 'outbound',
      status: 'pending',
      reply_to_message_id: message.replyToMessageId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { error } = await this.supabase
      .from('messages')
      .insert(messageData);
    
    if (error) {
      throw new Error(`Failed to store outbound message: ${error.message}`);
    }
  }
  
  private async logFailedJob(job: MessageJob): Promise<void> {
    try {
      const logData = {
        job_id: job.id,
        job_type: job.type,
        attempts: job.attempts,
        max_attempts: job.maxAttempts,
        correlation_id: job.correlationId,
        error_message: job.metadata?.lastError,
        job_data: job.data,
        failed_at: new Date().toISOString()
      };
      
      // Store in failed jobs table (you might need to create this table)
      console.error('Job failed permanently:', logData);
      
    } catch (error) {
      console.error('Failed to log failed job:', error);
    }
  }
  
  private async sendFailureAlert(job: MessageJob): Promise<void> {
    try {
      // Send alert to monitoring system or admin
      console.error('CRITICAL: Job failed after maximum retries:', {
        jobId: job.id,
        jobType: job.type,
        attempts: job.attempts,
        correlationId: job.correlationId,
        lastError: job.metadata?.lastError
      });
      
      // You could integrate with alerting services like PagerDuty, Slack, etc.
      
    } catch (error) {
      console.error('Failed to send failure alert:', error);
    }
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
let workerInstance: MessageProcessorWorker | null = null;

export function getMessageProcessorWorker(): MessageProcessorWorker {
  if (!workerInstance) {
    workerInstance = new MessageProcessorWorker();
  }
  return workerInstance;
}

// CLI script for running workers
if (require.main === module) {
  const worker = getMessageProcessorWorker();
  
  worker.start().catch(error => {
    console.error('Failed to start message processor workers:', error);
    process.exit(1);
  });
}
