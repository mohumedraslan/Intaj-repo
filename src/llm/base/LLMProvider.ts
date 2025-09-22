/**
 * LLM Provider Interface and Base Types
 * Defines the contract for all LLM providers with comprehensive functionality
 */

// Core LLM request/response types
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
}

export interface LLMRequest {
  messages: LLMMessage[];
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  stream?: boolean;
  functions?: LLMFunction[];
  functionCall?: 'none' | 'auto' | { name: string };
  user?: string;
  metadata?: Record<string, any>;
}

export interface LLMFunction {
  name: string;
  description?: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface LLMResponse {
  id: string;
  model: string;
  content: string;
  finishReason: 'stop' | 'length' | 'function_call' | 'content_filter' | 'error';
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
  functionCall?: {
    name: string;
    arguments: string;
  };
  metadata?: Record<string, any>;
  processingTime: number;
  provider: string;
  timestamp: Date;
}

export interface LLMStreamChunk {
  id: string;
  model: string;
  delta: {
    role?: string;
    content?: string;
    function_call?: {
      name?: string;
      arguments?: string;
    };
  };
  finishReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMEmbeddingRequest {
  input: string | string[];
  model: string;
  user?: string;
}

export interface LLMEmbeddingResponse {
  embeddings: number[][];
  model: string;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
  cost?: number;
  provider: string;
  timestamp: Date;
}

export interface ModelCapabilities {
  maxTokens: number;
  supportsStreaming: boolean;
  supportsEmbedding: boolean;
  supportsFunctions: boolean;
  supportsVision: boolean;
  contextWindow: number;
  costPerToken: {
    input: number;
    output: number;
  };
  rateLimits: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
}

export interface ProviderError {
  code: string;
  message: string;
  type: 'rate_limit' | 'invalid_request' | 'authentication' | 'server_error' | 'network_error';
  retryable: boolean;
  retryAfter?: number;
  details?: Record<string, any>;
}

// Main LLM Provider interface
export interface LLMProvider {
  readonly name: string;
  readonly models: string[];
  readonly version: string;
  
  /**
   * Generate a text response from the LLM
   */
  generateResponse(request: LLMRequest): Promise<LLMResponse>;
  
  /**
   * Generate a streaming response from the LLM
   */
  generateStreamResponse(request: LLMRequest): AsyncIterable<LLMStreamChunk>;
  
  /**
   * Get embeddings for text input
   */
  getEmbedding(request: LLMEmbeddingRequest): Promise<LLMEmbeddingResponse>;
  
  /**
   * Count tokens for a given text and model
   */
  getTokenCount(text: string, model: string): Promise<number>;
  
  /**
   * Get model capabilities and pricing
   */
  getModelCapabilities(model: string): ModelCapabilities | null;
  
  /**
   * Check if the provider supports a specific model
   */
  supportsModel(model: string): boolean;
  
  /**
   * Test provider connection and authentication
   */
  testConnection(): Promise<boolean>;
  
  /**
   * Get provider health status
   */
  getHealthStatus(): Promise<ProviderHealthStatus>;
}

export interface ProviderHealthStatus {
  healthy: boolean;
  latency: number;
  errorRate: number;
  lastError?: string;
  timestamp: Date;
}

// Base LLM Provider class with common functionality
export abstract class BaseLLMProvider implements LLMProvider {
  abstract readonly name: string;
  abstract readonly models: string[];
  abstract readonly version: string;
  
  protected logger: Console = console;
  protected correlationId?: string;
  
  constructor(correlationId?: string) {
    this.correlationId = correlationId;
  }
  
  abstract generateResponse(request: LLMRequest): Promise<LLMResponse>;
  abstract generateStreamResponse(request: LLMRequest): AsyncIterable<LLMStreamChunk>;
  abstract getEmbedding(request: LLLEmbeddingRequest): Promise<LLMEmbeddingResponse>;
  abstract getTokenCount(text: string, model: string): Promise<number>;
  abstract getModelCapabilities(model: string): ModelCapabilities | null;
  abstract testConnection(): Promise<boolean>;
  
  /**
   * Check if the provider supports a specific model
   */
  supportsModel(model: string): boolean {
    return this.models.includes(model);
  }
  
  /**
   * Get provider health status with basic implementation
   */
  async getHealthStatus(): Promise<ProviderHealthStatus> {
    const startTime = Date.now();
    
    try {
      const isHealthy = await this.testConnection();
      const latency = Date.now() - startTime;
      
      return {
        healthy: isHealthy,
        latency,
        errorRate: 0, // Override in specific providers
        timestamp: new Date()
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
        errorRate: 1,
        lastError: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      };
    }
  }
  
  /**
   * Validate LLM request
   */
  protected validateRequest(request: LLMRequest): void {
    if (!request.messages || request.messages.length === 0) {
      throw this.createError('INVALID_REQUEST', 'Messages array is required and cannot be empty');
    }
    
    if (!request.model) {
      throw this.createError('INVALID_REQUEST', 'Model is required');
    }
    
    if (!this.supportsModel(request.model)) {
      throw this.createError('INVALID_REQUEST', `Model ${request.model} is not supported by ${this.name}`);
    }
    
    // Validate temperature
    if (request.temperature !== undefined && (request.temperature < 0 || request.temperature > 2)) {
      throw this.createError('INVALID_REQUEST', 'Temperature must be between 0 and 2');
    }
    
    // Validate maxTokens
    const capabilities = this.getModelCapabilities(request.model);
    if (capabilities && request.maxTokens && request.maxTokens > capabilities.maxTokens) {
      throw this.createError('INVALID_REQUEST', `Max tokens ${request.maxTokens} exceeds model limit ${capabilities.maxTokens}`);
    }
  }
  
  /**
   * Calculate cost based on token usage
   */
  protected calculateCost(usage: { promptTokens: number; completionTokens: number }, model: string): { input: number; output: number; total: number } | undefined {
    const capabilities = this.getModelCapabilities(model);
    if (!capabilities) {
      return undefined;
    }
    
    const input = (usage.promptTokens / 1000) * capabilities.costPerToken.input;
    const output = (usage.completionTokens / 1000) * capabilities.costPerToken.output;
    const total = input + output;
    
    return { input, output, total };
  }
  
  /**
   * Create provider-specific error
   */
  protected createError(
    code: string,
    message: string,
    type: ProviderError['type'] = 'invalid_request',
    retryable: boolean = false,
    details?: Record<string, any>
  ): ProviderError {
    return {
      code,
      message,
      type,
      retryable,
      details
    };
  }
  
  /**
   * Handle HTTP response errors
   */
  protected handleHttpError(response: Response, responseBody?: any): ProviderError {
    let type: ProviderError['type'] = 'server_error';
    let retryable = false;
    
    switch (response.status) {
      case 400:
        type = 'invalid_request';
        break;
      case 401:
      case 403:
        type = 'authentication';
        break;
      case 429:
        type = 'rate_limit';
        retryable = true;
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        type = 'server_error';
        retryable = true;
        break;
    }
    
    const retryAfter = response.headers.get('retry-after');
    
    return this.createError(
      `HTTP_${response.status}`,
      responseBody?.error?.message || `HTTP ${response.status}: ${response.statusText}`,
      type,
      retryable,
      {
        status: response.status,
        statusText: response.statusText,
        retryAfter: retryAfter ? parseInt(retryAfter) : undefined,
        responseBody
      }
    );
  }
  
  /**
   * Generate correlation ID for tracking
   */
  protected generateCorrelationId(): string {
    return this.correlationId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Log provider operation
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const logData = {
      provider: this.name,
      correlationId: this.correlationId,
      timestamp: new Date().toISOString(),
      ...data
    };
    
    switch (level) {
      case 'info':
        this.logger.log(message, logData);
        break;
      case 'warn':
        this.logger.warn(message, logData);
        break;
      case 'error':
        this.logger.error(message, logData);
        break;
    }
  }
  
  /**
   * Sanitize sensitive data for logging
   */
  protected sanitizeForLogging(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }
    
    const sensitiveFields = ['api_key', 'token', 'password', 'secret', 'authorization'];
    const sanitized = { ...data };
    
    for (const key in sanitized) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeForLogging(sanitized[key]);
      }
    }
    
    return sanitized;
  }
  
  /**
   * Sleep for specified milliseconds
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Provider registry for managing multiple providers
export class LLMProviderRegistry {
  private static instance: LLMProviderRegistry;
  private providers: Map<string, () => LLMProvider> = new Map();
  
  static getInstance(): LLMProviderRegistry {
    if (!LLMProviderRegistry.instance) {
      LLMProviderRegistry.instance = new LLMProviderRegistry();
    }
    return LLMProviderRegistry.instance;
  }
  
  register(name: string, providerFactory: () => LLMProvider): void {
    this.providers.set(name.toLowerCase(), providerFactory);
  }
  
  get(name: string): LLMProvider | null {
    const factory = this.providers.get(name.toLowerCase());
    return factory ? factory() : null;
  }
  
  getAll(): LLMProvider[] {
    return Array.from(this.providers.values()).map(factory => factory());
  }
  
  getSupportedProviders(): string[] {
    return Array.from(this.providers.keys());
  }
  
  isSupported(name: string): boolean {
    return this.providers.has(name.toLowerCase());
  }
  
  getSupportedModels(): Record<string, string[]> {
    const models: Record<string, string[]> = {};
    
    for (const [name, factory] of this.providers) {
      const provider = factory();
      models[name] = provider.models;
    }
    
    return models;
  }
}

// Export types
export type {
  LLMMessage,
  LLMRequest,
  LLMFunction,
  LLMResponse,
  LLMStreamChunk,
  LLMEmbeddingRequest,
  LLMEmbeddingResponse,
  ModelCapabilities,
  ProviderError,
  ProviderHealthStatus
};
