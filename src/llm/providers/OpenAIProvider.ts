/**
 * OpenAI LLM Provider
 * Direct integration with OpenAI API for GPT models and embeddings
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

export class OpenAIProvider extends BaseLLMProvider {
  readonly name = 'openai';
  readonly version = '1.0.0';
  readonly models = [
    // GPT-4 Models
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-4-turbo-preview',
    'gpt-4',
    'gpt-4-32k',
    
    // GPT-3.5 Models
    'gpt-3.5-turbo',
    'gpt-3.5-turbo-16k',
    'gpt-3.5-turbo-instruct',
    
    // Embedding Models
    'text-embedding-3-large',
    'text-embedding-3-small',
    'text-embedding-ada-002',
    
    // Legacy Models
    'text-davinci-003',
    'text-curie-001',
    'text-babbage-001',
    'text-ada-001'
  ];
  
  private readonly baseUrl = 'https://api.openai.com/v1';
  private readonly apiKey: string;
  private readonly organization?: string;
  private readonly requestTimeout = 120000; // 2 minutes
  
  constructor(correlationId?: string) {
    super(correlationId);
    
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.organization = process.env.OPENAI_ORGANIZATION;
    
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
  }
  
  /**
   * Generate response from OpenAI
   */
  async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    
    try {
      this.validateRequest(request);
      
      this.log('info', 'Generating response via OpenAI', {
        model: request.model,
        messageCount: request.messages.length,
        temperature: request.temperature,
        maxTokens: request.maxTokens
      });
      
      const openAIRequest = this.convertToOpenAIRequest(request);
      
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      };
      
      if (this.organization) {
        headers['OpenAI-Organization'] = this.organization;
      }
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(openAIRequest),
        signal: AbortSignal.timeout(this.requestTimeout)
      });
      
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw this.handleHttpError(response, errorBody);
      }
      
      const responseData = await response.json();
      const processingTime = Date.now() - startTime;
      
      const llmResponse = this.convertFromOpenAIResponse(responseData, processingTime);
      
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
   * Generate streaming response from OpenAI
   */
  async* generateStreamResponse(request: LLMRequest): AsyncIterable<LLMStreamChunk> {
    try {
      this.validateRequest(request);
      
      this.log('info', 'Starting streaming response via OpenAI', {
        model: request.model,
        messageCount: request.messages.length
      });
      
      const openAIRequest = {
        ...this.convertToOpenAIRequest(request),
        stream: true
      };
      
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      };
      
      if (this.organization) {
        headers['OpenAI-Organization'] = this.organization;
      }
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(openAIRequest),
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
                
                const chunk = this.convertFromOpenAIStreamChunk(data);
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
   * Get embeddings from OpenAI
   */
  async getEmbedding(request: LLMEmbeddingRequest): Promise<LLMEmbeddingResponse> {
    const startTime = Date.now();
    
    try {
      this.log('info', 'Generating embeddings via OpenAI', {
        model: request.model,
        inputType: typeof request.input,
        inputLength: Array.isArray(request.input) ? request.input.length : 1
      });
      
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      };
      
      if (this.organization) {
        headers['OpenAI-Organization'] = this.organization;
      }
      
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          input: request.input,
          model: request.model,
          user: request.user
        }),
        signal: AbortSignal.timeout(this.requestTimeout)
      });
      
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw this.handleHttpError(response, errorBody);
      }
      
      const responseData = await response.json();
      const processingTime = Date.now() - startTime;
      
      const embeddings = responseData.data.map((item: any) => item.embedding);
      const usage = responseData.usage || {};
      
      // Calculate cost for embeddings
      const capabilities = this.getModelCapabilities(request.model);
      const cost = capabilities ? (usage.total_tokens / 1000) * capabilities.costPerToken.input : undefined;
      
      const embeddingResponse: LLMEmbeddingResponse = {
        embeddings,
        model: responseData.model,
        usage: {
          promptTokens: usage.prompt_tokens || 0,
          totalTokens: usage.total_tokens || 0
        },
        cost,
        provider: this.name,
        timestamp: new Date()
      };
      
      this.log('info', 'Embeddings generated successfully', {
        model: request.model,
        embeddingCount: embeddings.length,
        tokensUsed: usage.total_tokens,
        cost,
        processingTime
      });
      
      return embeddingResponse;
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      this.log('error', 'Failed to generate embeddings', {
        model: request.model,
        error: error instanceof Error ? error.message : String(error),
        processingTime
      });
      
      throw error;
    }
  }
  
  /**
   * Get token count using OpenAI's tiktoken
   */
  async getTokenCount(text: string, model: string): Promise<number> {
    // For now, use approximation. In production, you'd use tiktoken library
    // 1 token ≈ 4 characters for English text
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
      'gpt-4o': {
        maxTokens: 4096,
        contextWindow: 128000,
        supportsStreaming: true,
        supportsEmbedding: false,
        supportsFunctions: true,
        supportsVision: true,
        costPerToken: { input: 0.005, output: 0.015 },
        rateLimits: { requestsPerMinute: 500, tokensPerMinute: 30000 }
      },
      'gpt-4o-mini': {
        maxTokens: 16384,
        contextWindow: 128000,
        supportsStreaming: true,
        supportsEmbedding: false,
        supportsFunctions: true,
        supportsVision: true,
        costPerToken: { input: 0.00015, output: 0.0006 },
        rateLimits: { requestsPerMinute: 1000, tokensPerMinute: 200000 }
      },
      'gpt-4-turbo': {
        maxTokens: 4096,
        contextWindow: 128000,
        supportsStreaming: true,
        supportsEmbedding: false,
        supportsFunctions: true,
        supportsVision: true,
        costPerToken: { input: 0.01, output: 0.03 },
        rateLimits: { requestsPerMinute: 500, tokensPerMinute: 30000 }
      },
      'gpt-3.5-turbo': {
        maxTokens: 4096,
        contextWindow: 16385,
        supportsStreaming: true,
        supportsEmbedding: false,
        supportsFunctions: true,
        supportsVision: false,
        costPerToken: { input: 0.0005, output: 0.0015 },
        rateLimits: { requestsPerMinute: 3500, tokensPerMinute: 90000 }
      },
      'text-embedding-3-large': {
        maxTokens: 8191,
        contextWindow: 8191,
        supportsStreaming: false,
        supportsEmbedding: true,
        supportsFunctions: false,
        supportsVision: false,
        costPerToken: { input: 0.00013, output: 0 },
        rateLimits: { requestsPerMinute: 3000, tokensPerMinute: 1000000 }
      },
      'text-embedding-3-small': {
        maxTokens: 8191,
        contextWindow: 8191,
        supportsStreaming: false,
        supportsEmbedding: true,
        supportsFunctions: false,
        supportsVision: false,
        costPerToken: { input: 0.00002, output: 0 },
        rateLimits: { requestsPerMinute: 3000, tokensPerMinute: 1000000 }
      },
      'text-embedding-ada-002': {
        maxTokens: 8191,
        contextWindow: 8191,
        supportsStreaming: false,
        supportsEmbedding: true,
        supportsFunctions: false,
        supportsVision: false,
        costPerToken: { input: 0.0001, output: 0 },
        rateLimits: { requestsPerMinute: 3000, tokensPerMinute: 1000000 }
      }
    };
    
    return capabilities[model] || null;
  }
  
  /**
   * Test connection to OpenAI
   */
  async testConnection(): Promise<boolean> {
    try {
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${this.apiKey}`
      };
      
      if (this.organization) {
        headers['OpenAI-Organization'] = this.organization;
      }
      
      const response = await fetch(`${this.baseUrl}/models`, {
        headers,
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
  
  private convertToOpenAIRequest(request: LLMRequest): any {
    const openAIRequest: any = {
      model: request.model,
      messages: request.messages,
      stream: request.stream || false
    };
    
    if (request.temperature !== undefined) {
      openAIRequest.temperature = request.temperature;
    }
    
    if (request.maxTokens !== undefined) {
      openAIRequest.max_tokens = request.maxTokens;
    }
    
    if (request.topP !== undefined) {
      openAIRequest.top_p = request.topP;
    }
    
    if (request.frequencyPenalty !== undefined) {
      openAIRequest.frequency_penalty = request.frequencyPenalty;
    }
    
    if (request.presencePenalty !== undefined) {
      openAIRequest.presence_penalty = request.presencePenalty;
    }
    
    if (request.stop) {
      openAIRequest.stop = request.stop;
    }
    
    if (request.functions) {
      openAIRequest.functions = request.functions;
    }
    
    if (request.functionCall) {
      openAIRequest.function_call = request.functionCall;
    }
    
    if (request.user) {
      openAIRequest.user = request.user;
    }
    
    return openAIRequest;
  }
  
  private convertFromOpenAIResponse(response: any, processingTime: number): LLMResponse {
    const choice = response.choices?.[0];
    if (!choice) {
      throw this.createError('INVALID_RESPONSE', 'No choices in response');
    }
    
    const usage = response.usage || {};
    const cost = this.calculateCost(usage, response.model);
    
    return {
      id: response.id,
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
        openaiId: response.id,
        created: response.created,
        systemFingerprint: response.system_fingerprint
      },
      processingTime,
      provider: this.name,
      timestamp: new Date()
    };
  }
  
  private convertFromOpenAIStreamChunk(chunk: any): LLMStreamChunk | null {
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
