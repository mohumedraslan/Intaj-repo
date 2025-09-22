/**
 * OpenRouter LLM Provider
 * Provides access to multiple LLM models through OpenRouter API
 */

import {
  BaseLLMProvider,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
  LLMEmbeddingRequest,
  LLMEmbeddingResponse,
  ModelCapabilities,
  ProviderError
} from '../base/LLMProvider';

export class OpenRouterProvider extends BaseLLMProvider {
  readonly name = 'openrouter';
  readonly version = '1.0.0';
  readonly models = [
    // OpenAI Models
    'openai/gpt-4o',
    'openai/gpt-4o-mini',
    'openai/gpt-4-turbo',
    'openai/gpt-3.5-turbo',
    
    // Anthropic Models
    'anthropic/claude-3-opus',
    'anthropic/claude-3-sonnet',
    'anthropic/claude-3-haiku',
    'anthropic/claude-2',
    
    // Meta Models
    'meta-llama/llama-3-70b-instruct',
    'meta-llama/llama-3-8b-instruct',
    'meta-llama/codellama-34b-instruct',
    
    // Google Models
    'google/gemini-pro',
    'google/gemini-pro-vision',
    'google/palm-2-chat-bison',
    
    // Mistral Models
    'mistralai/mistral-7b-instruct',
    'mistralai/mixtral-8x7b-instruct',
    'mistralai/mixtral-8x22b-instruct',
    
    // Other Popular Models
    'cohere/command-r-plus',
    'perplexity/llama-3-sonar-large-32k-online',
    'microsoft/wizardlm-2-8x22b'
  ];
  
  private readonly baseUrl = 'https://openrouter.ai/api/v1';
  private readonly apiKey: string;
  private readonly appName: string;
  private readonly requestTimeout = 120000; // 2 minutes for LLM requests
  
  constructor(correlationId?: string) {
    super(correlationId);
    
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    this.appName = process.env.OPENROUTER_APP_NAME || 'Intaj';
    
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY environment variable is required');
    }
  }
  
  /**
   * Generate response from OpenRouter
   */
  async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    
    try {
      this.validateRequest(request);
      
      this.log('info', 'Generating response via OpenRouter', {
        model: request.model,
        messageCount: request.messages.length,
        temperature: request.temperature,
        maxTokens: request.maxTokens
      });
      
      const openRouterRequest = this.convertToOpenRouterRequest(request);
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': this.appName
        },
        body: JSON.stringify(openRouterRequest),
        signal: AbortSignal.timeout(this.requestTimeout)
      });
      
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw this.handleHttpError(response, errorBody);
      }
      
      const responseData = await response.json();
      const processingTime = Date.now() - startTime;
      
      const llmResponse = this.convertFromOpenRouterResponse(responseData, processingTime);
      
      this.log('info', 'Response generated successfully', {
        model: request.model,
        tokensUsed: llmResponse.usage.totalTokens,
        cost: llmResponse.cost?.total,
        processingTime
      });
      
      return llmResponse;
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      this.log('error', 'Failed to generate response', {
        model: request.model,
        error: error instanceof Error ? error.message : String(error),
        processingTime
      });
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw this.createError(
          'TIMEOUT',
          `Request timed out after ${this.requestTimeout}ms`,
          'server_error',
          true
        );
      }
      
      throw error;
    }
  }
  
  /**
   * Generate streaming response from OpenRouter
   */
  async* generateStreamResponse(request: LLMRequest): AsyncIterable<LLMStreamChunk> {
    try {
      this.validateRequest(request);
      
      this.log('info', 'Starting streaming response via OpenRouter', {
        model: request.model,
        messageCount: request.messages.length
      });
      
      const openRouterRequest = {
        ...this.convertToOpenRouterRequest(request),
        stream: true
      };
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': this.appName
        },
        body: JSON.stringify(openRouterRequest),
        signal: AbortSignal.timeout(this.requestTimeout)
      });
      
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw this.handleHttpError(response, errorBody);
      }
      
      if (!response.body) {
        throw this.createError('STREAM_ERROR', 'No response body for streaming');
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            const trimmed = line.trim();
            
            if (trimmed === '' || trimmed === 'data: [DONE]') {
              continue;
            }
            
            if (trimmed.startsWith('data: ')) {
              try {
                const jsonStr = trimmed.slice(6);
                const data = JSON.parse(jsonStr);
                
                const chunk = this.convertFromOpenRouterStreamChunk(data);
                if (chunk) {
                  yield chunk;
                }
              } catch (parseError) {
                this.log('warn', 'Failed to parse stream chunk', {
                  line: trimmed,
                  error: parseError instanceof Error ? parseError.message : String(parseError)
                });
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
      
      this.log('info', 'Streaming response completed');
      
    } catch (error) {
      this.log('error', 'Streaming response failed', {
        model: request.model,
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw error;
    }
  }
  
  /**
   * Get embeddings (not directly supported by OpenRouter, fallback to OpenAI)
   */
  async getEmbedding(request: LLMEmbeddingRequest): Promise<LLMEmbeddingResponse> {
    throw this.createError(
      'NOT_SUPPORTED',
      'Embeddings are not directly supported by OpenRouter. Use OpenAI provider for embeddings.',
      'invalid_request',
      false
    );
  }
  
  /**
   * Get token count for text
   */
  async getTokenCount(text: string, model: string): Promise<number> {
    // Approximate token count (OpenRouter doesn't provide a direct API for this)
    // Use a rough approximation: 1 token ≈ 4 characters for English text
    const approximateTokens = Math.ceil(text.length / 4);
    
    this.log('info', 'Estimated token count', {
      model,
      textLength: text.length,
      estimatedTokens: approximateTokens
    });
    
    return approximateTokens;
  }
  
  /**
   * Get model capabilities
   */
  getModelCapabilities(model: string): ModelCapabilities | null {
    const capabilities: Record<string, ModelCapabilities> = {
      'openai/gpt-4o': {
        maxTokens: 4096,
        contextWindow: 128000,
        supportsStreaming: true,
        supportsEmbedding: false,
        supportsFunctions: true,
        supportsVision: true,
        costPerToken: { input: 0.005, output: 0.015 },
        rateLimits: { requestsPerMinute: 500, tokensPerMinute: 30000 }
      },
      'openai/gpt-4o-mini': {
        maxTokens: 16384,
        contextWindow: 128000,
        supportsStreaming: true,
        supportsEmbedding: false,
        supportsFunctions: true,
        supportsVision: true,
        costPerToken: { input: 0.00015, output: 0.0006 },
        rateLimits: { requestsPerMinute: 1000, tokensPerMinute: 200000 }
      },
      'anthropic/claude-3-opus': {
        maxTokens: 4096,
        contextWindow: 200000,
        supportsStreaming: true,
        supportsEmbedding: false,
        supportsFunctions: false,
        supportsVision: true,
        costPerToken: { input: 0.015, output: 0.075 },
        rateLimits: { requestsPerMinute: 100, tokensPerMinute: 10000 }
      },
      'anthropic/claude-3-sonnet': {
        maxTokens: 4096,
        contextWindow: 200000,
        supportsStreaming: true,
        supportsEmbedding: false,
        supportsFunctions: false,
        supportsVision: true,
        costPerToken: { input: 0.003, output: 0.015 },
        rateLimits: { requestsPerMinute: 200, tokensPerMinute: 20000 }
      },
      'meta-llama/llama-3-70b-instruct': {
        maxTokens: 4096,
        contextWindow: 8192,
        supportsStreaming: true,
        supportsEmbedding: false,
        supportsFunctions: false,
        supportsVision: false,
        costPerToken: { input: 0.0009, output: 0.0009 },
        rateLimits: { requestsPerMinute: 300, tokensPerMinute: 50000 }
      }
    };
    
    return capabilities[model] || null;
  }
  
  /**
   * Test connection to OpenRouter
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        },
        signal: AbortSignal.timeout(10000)
      });
      
      return response.ok;
    } catch (error) {
      this.log('error', 'Connection test failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }
  
  // Private helper methods
  
  private convertToOpenRouterRequest(request: LLMRequest): any {
    const openRouterRequest: any = {
      model: request.model,
      messages: request.messages,
      stream: request.stream || false
    };
    
    if (request.temperature !== undefined) {
      openRouterRequest.temperature = request.temperature;
    }
    
    if (request.maxTokens !== undefined) {
      openRouterRequest.max_tokens = request.maxTokens;
    }
    
    if (request.topP !== undefined) {
      openRouterRequest.top_p = request.topP;
    }
    
    if (request.frequencyPenalty !== undefined) {
      openRouterRequest.frequency_penalty = request.frequencyPenalty;
    }
    
    if (request.presencePenalty !== undefined) {
      openRouterRequest.presence_penalty = request.presencePenalty;
    }
    
    if (request.stop) {
      openRouterRequest.stop = request.stop;
    }
    
    if (request.functions) {
      openRouterRequest.functions = request.functions;
    }
    
    if (request.functionCall) {
      openRouterRequest.function_call = request.functionCall;
    }
    
    if (request.user) {
      openRouterRequest.user = request.user;
    }
    
    return openRouterRequest;
  }
  
  private convertFromOpenRouterResponse(response: any, processingTime: number): LLMResponse {
    const choice = response.choices?.[0];
    if (!choice) {
      throw this.createError('INVALID_RESPONSE', 'No choices in response');
    }
    
    const usage = response.usage || {};
    const cost = this.calculateCost(usage, response.model);
    
    return {
      id: response.id || this.generateCorrelationId(),
      model: response.model,
      content: choice.message?.content || '',
      finishReason: this.mapFinishReason(choice.finish_reason),
      usage: {
        promptTokens: usage.prompt_tokens || 0,
        completionTokens: usage.completion_tokens || 0,
        totalTokens: usage.total_tokens || 0
      },
      cost,
      functionCall: choice.message?.function_call ? {
        name: choice.message.function_call.name,
        arguments: choice.message.function_call.arguments
      } : undefined,
      metadata: {
        openrouterId: response.id,
        created: response.created
      },
      processingTime,
      provider: this.name,
      timestamp: new Date()
    };
  }
  
  private convertFromOpenRouterStreamChunk(chunk: any): LLMStreamChunk | null {
    const choice = chunk.choices?.[0];
    if (!choice) {
      return null;
    }
    
    return {
      id: chunk.id,
      model: chunk.model,
      delta: {
        role: choice.delta?.role,
        content: choice.delta?.content,
        function_call: choice.delta?.function_call
      },
      finishReason: choice.finish_reason,
      usage: chunk.usage ? {
        promptTokens: chunk.usage.prompt_tokens || 0,
        completionTokens: chunk.usage.completion_tokens || 0,
        totalTokens: chunk.usage.total_tokens || 0
      } : undefined
    };
  }
  
  private mapFinishReason(reason: string): LLMResponse['finishReason'] {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'function_call':
        return 'function_call';
      case 'content_filter':
        return 'content_filter';
      default:
        return 'stop';
    }
  }
}
