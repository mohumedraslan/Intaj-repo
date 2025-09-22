/**
 * Mock LLM Provider for Testing
 * Provides mock implementation of LLM service
 */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMRequest {
  messages: LLMMessage[];
  model: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface LLMResponse {
  text: string;
  tokens: {
    input: number;
    output: number;
  };
  model: string;
  finishReason?: string;
}

export interface LLMProvider {
  name: string;
  generateResponse(request: LLMRequest): Promise<LLMResponse>;
}

export class MockLLMProvider implements LLMProvider {
  name = 'mock-llm-provider';
  
  generateResponse = jest.fn<Promise<LLMResponse>, [LLMRequest]>();

  constructor() {
    this.generateResponse.mockImplementation(async (request) => {
      const lastMessage = request.messages[request.messages.length - 1];
      const inputTokens = this.calculateTokens(request.messages.map(m => m.content).join(' '));
      
      // Generate contextual mock responses based on input
      let responseText = this.generateMockResponse(lastMessage.content);
      const outputTokens = this.calculateTokens(responseText);

      return {
        text: responseText,
        tokens: {
          input: inputTokens,
          output: outputTokens
        },
        model: request.model,
        finishReason: 'stop'
      };
    });
  }

  private generateMockResponse(input: string): string {
    const lowerInput = input.toLowerCase();
    
    // Context-aware responses for testing
    if (lowerInput.includes('hello') || lowerInput.includes('hi')) {
      return 'Hello! How can I help you today?';
    }
    
    if (lowerInput.includes('help') || lowerInput.includes('support')) {
      return 'I\'m here to help! What specific issue can I assist you with?';
    }
    
    if (lowerInput.includes('price') || lowerInput.includes('cost')) {
      return 'I\'d be happy to help you with pricing information. What product or service are you interested in?';
    }
    
    if (lowerInput.includes('order') || lowerInput.includes('purchase')) {
      return 'I can help you with your order. Could you please provide your order number or more details?';
    }
    
    if (lowerInput.includes('refund') || lowerInput.includes('return')) {
      return 'I understand you\'d like to process a refund or return. Let me help you with that process.';
    }
    
    if (lowerInput.includes('technical') || lowerInput.includes('bug') || lowerInput.includes('error')) {
      return 'I\'ll help you resolve this technical issue. Can you describe what happened in more detail?';
    }
    
    if (lowerInput.includes('thank')) {
      return 'You\'re welcome! Is there anything else I can help you with?';
    }
    
    if (lowerInput.includes('bye') || lowerInput.includes('goodbye')) {
      return 'Goodbye! Feel free to reach out if you need any further assistance.';
    }
    
    // Default response
    return `I understand you're asking about "${input}". Let me help you with that.`;
  }

  private calculateTokens(text: string): number {
    // Simple token estimation (roughly 4 characters per token)
    return Math.ceil(text.length / 4);
  }

  // Helper methods for testing
  reset() {
    jest.clearAllMocks();
    this.generateResponse.mockImplementation(async (request) => {
      const lastMessage = request.messages[request.messages.length - 1];
      const inputTokens = this.calculateTokens(request.messages.map(m => m.content).join(' '));
      const responseText = this.generateMockResponse(lastMessage.content);
      const outputTokens = this.calculateTokens(responseText);

      return {
        text: responseText,
        tokens: { input: inputTokens, output: outputTokens },
        model: request.model,
        finishReason: 'stop'
      };
    });
  }

  setMockResponse(response: Partial<LLMResponse>) {
    this.generateResponse.mockResolvedValue({
      text: 'Mock response',
      tokens: { input: 10, output: 15 },
      model: 'mock-model',
      finishReason: 'stop',
      ...response
    });
  }

  simulateError(error: Error) {
    this.generateResponse.mockRejectedValue(error);
  }

  simulateDelay(delayMs: number) {
    this.generateResponse.mockImplementation(async (request) => {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      const lastMessage = request.messages[request.messages.length - 1];
      return {
        text: this.generateMockResponse(lastMessage.content),
        tokens: { input: 10, output: 15 },
        model: request.model,
        finishReason: 'stop'
      };
    });
  }

  simulateTokenLimit() {
    this.generateResponse.mockResolvedValue({
      text: 'Response truncated due to token limit',
      tokens: { input: 100, output: 50 },
      model: 'mock-model',
      finishReason: 'length'
    });
  }

  simulateRateLimit() {
    this.generateResponse.mockRejectedValue(new Error('Rate limit exceeded'));
  }

  getCallHistory() {
    return this.generateResponse.mock.calls;
  }

  getLastCall() {
    const calls = this.getCallHistory();
    return calls[calls.length - 1];
  }
}
