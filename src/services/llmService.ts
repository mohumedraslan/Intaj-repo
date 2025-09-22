/**
 * LLM Orchestrator Service
 * Comprehensive service for managing multiple LLM providers, RAG, caching, and usage tracking
 */

import {
  LLMProvider,
  LLMProviderRegistry,
  LLMRequest as BaseLLMRequest,
  LLMResponse as BaseLLMResponse,
  LLMMessage
} from '../llm/base/LLMProvider';
import { OpenRouterProvider } from '../llm/providers/OpenRouterProvider';
import { OpenAIProvider } from '../llm/providers/OpenAIProvider';
import { RAGService, RAGContext } from '../llm/rag/RAGService';
import { LLMResponseCache, getLLMCache } from '../llm/cache/LLMCache';
import { getPromptTemplateForAgentType, initializeAgentPrompts } from '../llm/prompts/AgentPrompts';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { ErrorFactory } from '@/lib/errors';

// Agent message request interface
export interface AgentMessageRequest {
  agentId: string;
  conversationId: string;
  message: string;
  senderId: string;
  senderName?: string;
  platform: string;
  messageId: string;
  correlationId: string;
  metadata?: Record<string, any>;
}

// Agent response interface
export interface AgentResponse {
  id: string;
  agentId: string;
  conversationId: string;
  content: string;
  model: string;
  provider: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost?: {
    input: number;
    output: number;
    total: number;
  };
  ragContext?: RAGContext;
  cached: boolean;
  processingTime: number;
  timestamp: Date;
  correlationId: string;
}

// Circuit breaker state
interface CircuitBreakerState {
  failures: number;
  lastFailure?: Date;
  state: 'closed' | 'open' | 'half-open';
}

// Usage log interface
export interface UsageLog {
  id: string;
  agentId: string;
  conversationId: string;
  messageId: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd?: number;
  latencyMs: number;
  requestId: string;
  responseStatus: 'success' | 'error' | 'timeout';
  errorMessage?: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

export class LLMService {
  private supabase;
  private providers: Map<string, LLMProvider> = new Map();
  private cache: LLMResponseCache;
  private ragService?: RAGService;
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private registry: LLMProviderRegistry;
  
  constructor() {
    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    this.cache = getLLMCache();
    this.registry = LLMProviderRegistry.getInstance();
    
    // Initialize providers
    this.initializeProviders();
    
    // Initialize prompt templates
    initializeAgentPrompts();
    
    // Initialize RAG service with OpenAI for embeddings
    const embeddingProvider = this.providers.get('openai') || this.providers.get('openrouter');
    if (embeddingProvider) {
      this.ragService = new RAGService(embeddingProvider);
    } else {
      console.warn('No embedding provider available for RAG service');
    }
  }
  
  /**
   * Generate agent response with full orchestration
   */
  async generateAgentResponse(request: AgentMessageRequest): Promise<AgentResponse> {
    const startTime = Date.now();
    
    try {
      console.log('Generating agent response:', {
        agentId: request.agentId,
        conversationId: request.conversationId,
        messageId: request.messageId,
        correlationId: request.correlationId
      });
      
      // 1. Get agent configuration
      const agent = await this.getAgent(request.agentId);
      if (!agent) {
        throw ErrorFactory.notFound('Agent', request.correlationId);
      }
      
      // 2. Get conversation history
      const conversationHistory = await this.getConversationHistory(
        request.conversationId,
        10 // Last 10 messages
      );
      
      // 3. Retrieve RAG context if enabled
      let ragContext: RAGContext | undefined;
      if (agent.settings?.enableRAG && this.ragService) {
        ragContext = await this.ragService.retrieveContext(
          request.message,
          request.agentId,
          5 // Max 5 relevant documents
        );
      }
      
      // 4. Build prompt from template
      const prompt = await this.buildPrompt(agent, request, conversationHistory, ragContext);
      
      // 5. Check cache
      const cacheKey = this.cache.generateCacheKey(
        prompt.messages,
        agent.model || 'gpt-4o-mini',
        agent.settings?.temperature,
        agent.settings?.maxTokens
      );
      
      const cachedResponse = await this.cache.get(cacheKey);
      if (cachedResponse) {
        console.log('Cache hit for agent response:', {
          agentId: request.agentId,
          correlationId: request.correlationId
        });
        
        return this.convertToAgentResponse(
          cachedResponse,
          request,
          ragContext,
          true,
          Date.now() - startTime
        );
      }
      
      // 6. Get LLM provider
      const provider = this.getProvider(agent.provider || 'openrouter');
      if (!provider) {
        throw ErrorFactory.businessLogic(
          `Provider ${agent.provider || 'openrouter'} not available`,
          { availableProviders: Array.from(this.providers.keys()) },
          request.correlationId
        );
      }
      
      // 7. Check circuit breaker
      if (!this.isProviderAvailable(provider.name)) {
        throw ErrorFactory.serviceUnavailable(
          `Provider ${provider.name} is currently unavailable`,
          request.correlationId
        );
      }
      
      // 8. Call LLM provider
      const llmRequest: BaseLLMRequest = {
        messages: prompt.messages,
        model: agent.model || 'gpt-4o-mini',
        temperature: agent.settings?.temperature || 0.7,
        maxTokens: agent.settings?.maxTokens || 1000,
        user: request.senderId
      };
      
      const llmResponse = await provider.generateResponse(llmRequest);
      
      // 9. Update circuit breaker on success
      this.recordProviderSuccess(provider.name);
      
      // 10. Log usage and cost
      await this.logUsage(request, llmResponse, provider.name);
      
      // 11. Cache response
      await this.cache.set(cacheKey, llmResponse, {
        contentType: this.determineContentType(agent.agent_type),
        tags: [agent.agent_type, provider.name]
      });
      
      const agentResponse = this.convertToAgentResponse(
        llmResponse,
        request,
        ragContext,
        false,
        Date.now() - startTime
      );
      
      console.log('Agent response generated successfully:', {
        agentId: request.agentId,
        correlationId: request.correlationId,
        tokensUsed: llmResponse.usage.totalTokens,
        cost: llmResponse.cost?.total,
        processingTime: agentResponse.processingTime
      });
      
      return agentResponse;
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      console.error('Failed to generate agent response:', {
        agentId: request.agentId,
        correlationId: request.correlationId,
        error: error instanceof Error ? error.message : String(error),
        processingTime
      });
      
      // Update circuit breaker on failure
      if (error instanceof Error && error.message.includes('Provider')) {
        const providerName = this.extractProviderName(error.message);
        if (providerName) {
          this.recordProviderFailure(providerName);
        }
      }
      
      throw error;
    }
  }
  
  // Private helper methods
  
  private initializeProviders(): void {
    try {
      // Register OpenRouter provider
      if (process.env.OPENROUTER_API_KEY) {
        const openRouterProvider = new OpenRouterProvider();
        this.providers.set('openrouter', openRouterProvider);
        this.registry.register('openrouter', () => new OpenRouterProvider());
      }
      
      // Register OpenAI provider
      if (process.env.OPENAI_API_KEY) {
        const openAIProvider = new OpenAIProvider();
        this.providers.set('openai', openAIProvider);
        this.registry.register('openai', () => new OpenAIProvider());
      }
      
      console.log('LLM providers initialized:', {
        providers: Array.from(this.providers.keys())
      });
      
    } catch (error) {
      console.error('Failed to initialize LLM providers:', error);
    }
  }
  
  private getProvider(name: string): LLMProvider | null {
    return this.providers.get(name) || null;
  }
  
  private async getAgent(agentId: string): Promise<any> {
    const { data: agent, error } = await this.supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();
    
    if (error) {
      console.error('Failed to get agent:', error);
      return null;
    }
    
    return agent;
  }
  
  private async getConversationHistory(conversationId: string, limit: number = 10): Promise<any[]> {
    const { data: messages, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Failed to get conversation history:', error);
      return [];
    }
    
    return (messages || []).reverse(); // Return in chronological order
  }
  
  private async buildPrompt(
    agent: any,
    request: AgentMessageRequest,
    conversationHistory: any[],
    ragContext?: RAGContext
  ): Promise<{ messages: LLMMessage[] }> {
    // Get prompt template for agent type
    const template = getPromptTemplateForAgentType(agent.agent_type);
    
    if (!template) {
      // Fallback to simple prompt
      return {
        messages: [
          {
            role: 'system',
            content: agent.base_prompt || 'You are a helpful AI assistant.'
          },
          {
            role: 'user',
            content: request.message
          }
        ]
      };
    }
    
    // Build conversation history string
    const historyText = conversationHistory
      .map(msg => `${msg.direction === 'inbound' ? 'User' : 'Assistant'}: ${msg.content_text}`)
      .join('\n');
    
    // Build RAG context string
    const knowledgeBase = ragContext?.retrievedDocuments
      .map(doc => `${doc.metadata.title || 'Document'}: ${doc.content}`)
      .join('\n\n') || 'No relevant knowledge base information found.';
    
    // Render template with variables
    const systemPrompt = template.render({
      company_name: agent.company_name || 'Our Company',
      company_info: agent.company_info || 'A modern business focused on customer satisfaction.',
      user_message: request.message,
      conversation_history: historyText || 'No previous conversation.',
      user_name: request.senderName || 'User',
      current_time: new Date().toLocaleString(),
      knowledge_base: knowledgeBase,
      // Add agent-type specific variables
      ...(agent.settings?.templateVariables || {})
    });
    
    return {
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: request.message
        }
      ]
    };
  }
  
  private convertToAgentResponse(
    llmResponse: BaseLLMResponse,
    request: AgentMessageRequest,
    ragContext?: RAGContext,
    cached: boolean = false,
    processingTime: number = 0
  ): AgentResponse {
    return {
      id: this.generateResponseId(),
      agentId: request.agentId,
      conversationId: request.conversationId,
      content: llmResponse.content,
      model: llmResponse.model,
      provider: llmResponse.provider,
      usage: llmResponse.usage,
      cost: llmResponse.cost,
      ragContext,
      cached,
      processingTime,
      timestamp: new Date(),
      correlationId: request.correlationId
    };
  }
  
  private async logUsage(
    request: AgentMessageRequest,
    response: BaseLLMResponse,
    provider: string
  ): Promise<void> {
    try {
      const usageLog: UsageLog = {
        id: this.generateUsageId(),
        agentId: request.agentId,
        conversationId: request.conversationId,
        messageId: request.messageId,
        provider,
        model: response.model,
        promptTokens: response.usage.promptTokens,
        completionTokens: response.usage.completionTokens,
        totalTokens: response.usage.totalTokens,
        costUsd: response.cost?.total,
        latencyMs: response.processingTime,
        requestId: response.id,
        responseStatus: 'success',
        metadata: {
          platform: request.platform,
          senderId: request.senderId,
          correlationId: request.correlationId
        },
        createdAt: new Date()
      };
      
      // Store in database
      await this.supabase
        .from('usage_logs')
        .insert({
          id: usageLog.id,
          agent_id: usageLog.agentId,
          conversation_id: usageLog.conversationId,
          message_id: usageLog.messageId,
          provider: usageLog.provider,
          model: usageLog.model,
          tokens_input: usageLog.promptTokens,
          tokens_output: usageLog.completionTokens,
          tokens_total: usageLog.totalTokens,
          cost_usd: usageLog.costUsd,
          latency_ms: usageLog.latencyMs,
          request_id: usageLog.requestId,
          response_status: usageLog.responseStatus,
          error_message: usageLog.errorMessage,
          metadata: usageLog.metadata,
          created_at: usageLog.createdAt.toISOString()
        });
      
    } catch (error) {
      console.error('Failed to log usage:', error);
    }
  }
  
  private determineContentType(agentType: string): string {
    const contentTypeMap: Record<string, string> = {
      'customer_support': 'factual',
      'sales': 'creative',
      'technical_support': 'factual',
      'marketing': 'creative',
      'hr': 'factual',
      'general': 'factual'
    };
    
    return contentTypeMap[agentType] || 'factual';
  }
  
  // Circuit breaker methods
  
  private isProviderAvailable(providerName: string): boolean {
    const breaker = this.circuitBreakers.get(providerName);
    if (!breaker) {
      return true;
    }
    
    const now = new Date();
    const timeSinceLastFailure = breaker.lastFailure 
      ? now.getTime() - breaker.lastFailure.getTime()
      : Infinity;
    
    switch (breaker.state) {
      case 'closed':
        return true;
      case 'open':
        // Try to recover after 60 seconds
        if (timeSinceLastFailure > 60000) {
          breaker.state = 'half-open';
          return true;
        }
        return false;
      case 'half-open':
        return true;
      default:
        return true;
    }
  }
  
  private recordProviderSuccess(providerName: string): void {
    const breaker = this.circuitBreakers.get(providerName);
    if (breaker) {
      breaker.failures = 0;
      breaker.state = 'closed';
      breaker.lastFailure = undefined;
    }
  }
  
  private recordProviderFailure(providerName: string): void {
    let breaker = this.circuitBreakers.get(providerName);
    if (!breaker) {
      breaker = { failures: 0, state: 'closed' };
      this.circuitBreakers.set(providerName, breaker);
    }
    
    breaker.failures++;
    breaker.lastFailure = new Date();
    
    // Open circuit after 5 failures
    if (breaker.failures >= 5) {
      breaker.state = 'open';
    }
  }
  
  private extractProviderName(errorMessage: string): string | null {
    const providerNames = Array.from(this.providers.keys());
    return providerNames.find(name => errorMessage.toLowerCase().includes(name)) || null;
  }
  
  private generateResponseId(): string {
    return `resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private generateUsageId(): string {
    return `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
let llmServiceInstance: LLMService | null = null;

/**
 * Get or create LLM service singleton
 */
export function getLLMService(): LLMService {
  if (!llmServiceInstance) {
    llmServiceInstance = new LLMService();
  }
  return llmServiceInstance;
}
