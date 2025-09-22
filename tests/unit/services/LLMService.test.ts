/**
 * Unit Tests for LLM Service
 * Tests LLM provider selection, response generation, and RAG integration
 */

import { LLMService } from '@/lib/ai/llm';
import { MockLLMProvider } from '../../mocks/MockLLMProvider';
import { createLogger } from '@/lib/logging/Logger';

// Mock the logger
jest.mock('@/lib/logging/Logger');

// Mock the vector database
const mockVectorSearch = jest.fn();
jest.mock('@/lib/vectordb/client', () => ({
  VectorDBClient: jest.fn().mockImplementation(() => ({
    search: mockVectorSearch
  }))
}));

describe('LLMService', () => {
  let llmService: LLMService;
  let mockOpenRouterProvider: MockLLMProvider;
  let mockOpenAIProvider: MockLLMProvider;

  beforeEach(() => {
    mockOpenRouterProvider = new MockLLMProvider();
    mockOpenAIProvider = new MockLLMProvider();
    
    // Set different names for providers
    mockOpenRouterProvider.name = 'openrouter';
    mockOpenAIProvider.name = 'openai';

    llmService = new LLMService({
      providers: {
        openrouter: mockOpenRouterProvider,
        openai: mockOpenAIProvider
      },
      defaultProvider: 'openrouter'
    });

    // Reset mocks
    mockVectorSearch.mockReset();
  });

  describe('generateResponse', () => {
    const basicRequest = {
      messages: [
        { role: 'system' as const, content: 'You are a helpful assistant' },
        { role: 'user' as const, content: 'Hello, how can you help me?' }
      ],
      model: 'gpt-4o',
      temperature: 0.7,
      max_tokens: 1000
    };

    it('should generate response using default provider', async () => {
      const expectedResponse = {
        text: 'Hello! How can I help you today?',
        tokens: { input: 10, output: 15 },
        model: 'gpt-4o'
      };

      mockOpenRouterProvider.setMockResponse(expectedResponse);

      const result = await llmService.generateResponse(basicRequest);

      expect(result.text).toBe(expectedResponse.text);
      expect(result.tokens).toEqual(expectedResponse.tokens);
      expect(mockOpenRouterProvider.generateResponse).toHaveBeenCalledWith(basicRequest);
    });

    it('should use specified provider when requested', async () => {
      const requestWithProvider = {
        ...basicRequest,
        provider: 'openai' as const
      };

      const expectedResponse = {
        text: 'OpenAI response',
        tokens: { input: 8, output: 12 },
        model: 'gpt-4o'
      };

      mockOpenAIProvider.setMockResponse(expectedResponse);

      const result = await llmService.generateResponse(requestWithProvider);

      expect(result.text).toBe(expectedResponse.text);
      expect(mockOpenAIProvider.generateResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: basicRequest.messages,
          model: basicRequest.model
        })
      );
      expect(mockOpenRouterProvider.generateResponse).not.toHaveBeenCalled();
    });

    it('should fallback to secondary provider on failure', async () => {
      mockOpenRouterProvider.simulateError(new Error('OpenRouter API error'));
      
      const fallbackResponse = {
        text: 'Fallback response from OpenAI',
        tokens: { input: 10, output: 15 },
        model: 'gpt-4o'
      };
      mockOpenAIProvider.setMockResponse(fallbackResponse);

      const result = await llmService.generateResponse(basicRequest);

      expect(result.text).toBe(fallbackResponse.text);
      expect(mockOpenRouterProvider.generateResponse).toHaveBeenCalled();
      expect(mockOpenAIProvider.generateResponse).toHaveBeenCalled();
    });

    it('should throw error when all providers fail', async () => {
      mockOpenRouterProvider.simulateError(new Error('OpenRouter failed'));
      mockOpenAIProvider.simulateError(new Error('OpenAI failed'));

      await expect(
        llmService.generateResponse(basicRequest)
      ).rejects.toThrow('All LLM providers failed');
    });

    it('should handle rate limiting with retry', async () => {
      // First call fails with rate limit
      mockOpenRouterProvider.generateResponse
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockResolvedValueOnce({
          text: 'Success after retry',
          tokens: { input: 10, output: 15 },
          model: 'gpt-4o'
        });

      const result = await llmService.generateResponse(basicRequest);

      expect(result.text).toBe('Success after retry');
      expect(mockOpenRouterProvider.generateResponse).toHaveBeenCalledTimes(2);
    });
  });

  describe('RAG Integration', () => {
    const ragRequest = {
      messages: [
        { role: 'user' as const, content: 'What is our refund policy?' }
      ],
      model: 'gpt-4o',
      enableRAG: true,
      ragConfig: {
        collectionName: 'knowledge_base',
        topK: 3,
        threshold: 0.7
      }
    };

    it('should apply RAG context when enabled', async () => {
      const mockVectorResults = [
        {
          id: 'doc-1',
          score: 0.95,
          payload: {
            content: 'Our refund policy allows returns within 30 days of purchase.',
            metadata: { source: 'policy-doc', section: 'refunds' }
          }
        },
        {
          id: 'doc-2',
          score: 0.88,
          payload: {
            content: 'Refunds are processed within 5-7 business days.',
            metadata: { source: 'policy-doc', section: 'processing' }
          }
        }
      ];

      mockVectorSearch.mockResolvedValue(mockVectorResults);

      const expectedResponse = {
        text: 'Based on our policy, refunds are allowed within 30 days and processed within 5-7 business days.',
        tokens: { input: 25, output: 20 },
        model: 'gpt-4o'
      };

      mockOpenRouterProvider.setMockResponse(expectedResponse);

      const result = await llmService.generateResponse(ragRequest);

      // Verify vector search was called
      expect(mockVectorSearch).toHaveBeenCalledWith(
        'knowledge_base',
        'What is our refund policy?',
        { topK: 3, threshold: 0.7 }
      );

      // Verify context was added to messages
      expect(mockOpenRouterProvider.generateResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('Our refund policy allows returns within 30 days')
            })
          ])
        })
      );

      expect(result.text).toBe(expectedResponse.text);
    });

    it('should handle empty vector search results', async () => {
      mockVectorSearch.mockResolvedValue([]);

      const result = await llmService.generateResponse(ragRequest);

      expect(mockVectorSearch).toHaveBeenCalled();
      expect(mockOpenRouterProvider.generateResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: ragRequest.messages // Original messages without RAG context
        })
      );
    });

    it('should continue without RAG on vector search failure', async () => {
      mockVectorSearch.mockRejectedValue(new Error('Vector DB connection failed'));

      const result = await llmService.generateResponse(ragRequest);

      expect(mockVectorSearch).toHaveBeenCalled();
      expect(mockOpenRouterProvider.generateResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: ragRequest.messages // Original messages without RAG context
        })
      );
    });

    it('should filter results by threshold', async () => {
      const mockVectorResults = [
        {
          id: 'doc-1',
          score: 0.95, // Above threshold
          payload: { content: 'High relevance content' }
        },
        {
          id: 'doc-2',
          score: 0.65, // Below threshold (0.7)
          payload: { content: 'Low relevance content' }
        }
      ];

      mockVectorSearch.mockResolvedValue(mockVectorResults);

      await llmService.generateResponse(ragRequest);

      // Should only include high-relevance content
      expect(mockOpenRouterProvider.generateResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('High relevance content')
            })
          ])
        })
      );

      expect(mockOpenRouterProvider.generateResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.not.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Low relevance content')
            })
          ])
        })
      );
    });
  });

  describe('Streaming Support', () => {
    it('should handle streaming responses', async () => {
      const streamRequest = {
        ...basicRequest,
        stream: true
      };

      // Mock streaming response
      const mockStream = {
        text: 'Streaming response chunk',
        tokens: { input: 10, output: 5 },
        model: 'gpt-4o',
        isComplete: false
      };

      mockOpenRouterProvider.setMockResponse(mockStream);

      const result = await llmService.generateResponse(streamRequest);

      expect(mockOpenRouterProvider.generateResponse).toHaveBeenCalledWith(
        expect.objectContaining({ stream: true })
      );
      expect(result.text).toBe(mockStream.text);
    });
  });

  describe('Token Management', () => {
    it('should track token usage accurately', async () => {
      const response = {
        text: 'Test response',
        tokens: { input: 15, output: 25 },
        model: 'gpt-4o'
      };

      mockOpenRouterProvider.setMockResponse(response);

      const result = await llmService.generateResponse(basicRequest);

      expect(result.tokens.input).toBe(15);
      expect(result.tokens.output).toBe(25);
    });

    it('should handle token limit exceeded', async () => {
      mockOpenRouterProvider.simulateTokenLimit();

      const result = await llmService.generateResponse(basicRequest);

      expect(result.finishReason).toBe('length');
      expect(result.text).toContain('truncated');
    });
  });

  describe('Error Handling', () => {
    it('should handle provider timeout', async () => {
      mockOpenRouterProvider.simulateDelay(10000); // 10 second delay

      const timeoutRequest = {
        ...basicRequest,
        timeout: 5000 // 5 second timeout
      };

      await expect(
        llmService.generateResponse(timeoutRequest)
      ).rejects.toThrow('Request timeout');
    });

    it('should handle malformed responses', async () => {
      mockOpenRouterProvider.generateResponse.mockResolvedValue({
        text: '', // Empty response
        tokens: { input: 0, output: 0 },
        model: 'gpt-4o'
      });

      await expect(
        llmService.generateResponse(basicRequest)
      ).rejects.toThrow('Empty response from LLM provider');
    });

    it('should validate request parameters', async () => {
      const invalidRequest = {
        messages: [], // Empty messages
        model: 'gpt-4o'
      };

      await expect(
        llmService.generateResponse(invalidRequest)
      ).rejects.toThrow('Messages array cannot be empty');
    });
  });

  describe('Provider Selection Logic', () => {
    it('should select provider based on model availability', async () => {
      const claudeRequest = {
        ...basicRequest,
        model: 'claude-3-sonnet'
      };

      // Mock OpenRouter doesn't support Claude, OpenAI does
      mockOpenRouterProvider.simulateError(new Error('Model not supported'));
      mockOpenAIProvider.setMockResponse({
        text: 'Claude response',
        tokens: { input: 10, output: 15 },
        model: 'claude-3-sonnet'
      });

      const result = await llmService.generateResponse(claudeRequest);

      expect(result.text).toBe('Claude response');
      expect(mockOpenAIProvider.generateResponse).toHaveBeenCalled();
    });

    it('should respect provider preferences', async () => {
      const preferenceRequest = {
        ...basicRequest,
        providerPreference: ['openai', 'openrouter']
      };

      mockOpenAIProvider.setMockResponse({
        text: 'Preferred provider response',
        tokens: { input: 10, output: 15 },
        model: 'gpt-4o'
      });

      const result = await llmService.generateResponse(preferenceRequest);

      expect(result.text).toBe('Preferred provider response');
      expect(mockOpenAIProvider.generateResponse).toHaveBeenCalled();
      expect(mockOpenRouterProvider.generateResponse).not.toHaveBeenCalled();
    });
  });
});
