/**
 * Unit Tests for AgentService
 * Tests core business logic for agent management
 */

import { AgentService } from '@/services/agentService';
import { MockAgentRepository } from '../../mocks/MockAgentRepository';
import { MockLLMProvider } from '../../mocks/MockLLMProvider';
import { createLogger } from '@/lib/logging/Logger';

// Mock the logger
jest.mock('@/lib/logging/Logger');

describe('AgentService', () => {
  let agentService: AgentService;
  let mockRepository: MockAgentRepository;
  let mockLLMProvider: MockLLMProvider;

  beforeEach(() => {
    mockRepository = new MockAgentRepository();
    mockLLMProvider = new MockLLMProvider();
    agentService = new AgentService(mockRepository, mockLLMProvider);
  });

  describe('createAgent', () => {
    const validAgentData = {
      name: 'Test Agent',
      type: 'customer_support' as const,
      base_prompt: 'You are a helpful customer support assistant',
      model: 'gpt-4o' as const,
      temperature: 0.7,
      max_tokens: 1000
    };

    it('should create agent with valid data', async () => {
      const userId = 'user-123';
      mockRepository.create.mockResolvedValue({
        id: 'agent-123',
        ...validAgentData,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      const result = await agentService.createAgent(userId, validAgentData);

      expect(result.id).toBe('agent-123');
      expect(result.name).toBe(validAgentData.name);
      expect(result.type).toBe(validAgentData.type);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...validAgentData,
          user_id: userId
        })
      );
    });

    it('should throw validation error for empty name', async () => {
      const invalidData = {
        ...validAgentData,
        name: ''
      };

      await expect(
        agentService.createAgent('user-123', invalidData)
      ).rejects.toThrow('Agent name is required');
    });

    it('should throw validation error for invalid type', async () => {
      const invalidData = {
        ...validAgentData,
        type: 'invalid_type' as any
      };

      await expect(
        agentService.createAgent('user-123', invalidData)
      ).rejects.toThrow('Invalid agent type');
    });

    it('should throw validation error for empty base prompt', async () => {
      const invalidData = {
        ...validAgentData,
        base_prompt: ''
      };

      await expect(
        agentService.createAgent('user-123', invalidData)
      ).rejects.toThrow('Base prompt is required');
    });

    it('should set default values for optional fields', async () => {
      const minimalData = {
        name: 'Test Agent',
        type: 'customer_support' as const,
        base_prompt: 'You are a helpful assistant'
      };

      mockRepository.create.mockResolvedValue({
        id: 'agent-123',
        ...minimalData,
        model: 'gpt-4o',
        temperature: 0.7,
        max_tokens: 1000,
        user_id: 'user-123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      const result = await agentService.createAgent('user-123', minimalData);

      expect(result.model).toBe('gpt-4o');
      expect(result.temperature).toBe(0.7);
      expect(result.max_tokens).toBe(1000);
    });

    it('should handle repository errors', async () => {
      mockRepository.create.mockRejectedValue(new Error('Database error'));

      await expect(
        agentService.createAgent('user-123', validAgentData)
      ).rejects.toThrow('Failed to create agent');
    });
  });

  describe('updateAgent', () => {
    const existingAgent = {
      id: 'agent-123',
      name: 'Existing Agent',
      type: 'customer_support' as const,
      base_prompt: 'Original prompt',
      model: 'gpt-4o' as const,
      user_id: 'user-123',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    it('should update agent with valid data', async () => {
      const updateData = {
        name: 'Updated Agent',
        base_prompt: 'Updated prompt'
      };

      mockRepository.findById.mockResolvedValue(existingAgent);
      mockRepository.update.mockResolvedValue({
        ...existingAgent,
        ...updateData,
        updated_at: new Date().toISOString()
      });

      const result = await agentService.updateAgent('agent-123', 'user-123', updateData);

      expect(result.name).toBe(updateData.name);
      expect(result.base_prompt).toBe(updateData.base_prompt);
      expect(mockRepository.update).toHaveBeenCalledWith('agent-123', updateData);
    });

    it('should throw error if agent not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        agentService.updateAgent('nonexistent-id', 'user-123', { name: 'Updated' })
      ).rejects.toThrow('Agent not found');
    });

    it('should throw error if user does not own agent', async () => {
      mockRepository.findById.mockResolvedValue({
        ...existingAgent,
        user_id: 'other-user'
      });

      await expect(
        agentService.updateAgent('agent-123', 'user-123', { name: 'Updated' })
      ).rejects.toThrow('Access denied');
    });
  });

  describe('deleteAgent', () => {
    const existingAgent = {
      id: 'agent-123',
      name: 'Test Agent',
      type: 'customer_support' as const,
      base_prompt: 'Test prompt',
      model: 'gpt-4o' as const,
      user_id: 'user-123',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    it('should delete agent successfully', async () => {
      mockRepository.findById.mockResolvedValue(existingAgent);
      mockRepository.delete.mockResolvedValue(true);

      const result = await agentService.deleteAgent('agent-123', 'user-123');

      expect(result).toBe(true);
      expect(mockRepository.delete).toHaveBeenCalledWith('agent-123');
    });

    it('should throw error if agent not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        agentService.deleteAgent('nonexistent-id', 'user-123')
      ).rejects.toThrow('Agent not found');
    });

    it('should throw error if user does not own agent', async () => {
      mockRepository.findById.mockResolvedValue({
        ...existingAgent,
        user_id: 'other-user'
      });

      await expect(
        agentService.deleteAgent('agent-123', 'user-123')
      ).rejects.toThrow('Access denied');
    });
  });

  describe('getAgentsByUser', () => {
    it('should return user agents with pagination', async () => {
      const mockAgents = [
        {
          id: 'agent-1',
          name: 'Agent 1',
          type: 'customer_support' as const,
          user_id: 'user-123',
          created_at: new Date().toISOString()
        },
        {
          id: 'agent-2',
          name: 'Agent 2',
          type: 'sales' as const,
          user_id: 'user-123',
          created_at: new Date().toISOString()
        }
      ];

      mockRepository.findByUserId.mockResolvedValue(mockAgents);

      const result = await agentService.getAgentsByUser('user-123', { page: 1, limit: 10 });

      expect(result).toEqual(mockAgents);
      expect(mockRepository.findByUserId).toHaveBeenCalledWith('user-123', { page: 1, limit: 10 });
    });

    it('should handle empty results', async () => {
      mockRepository.findByUserId.mockResolvedValue([]);

      const result = await agentService.getAgentsByUser('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('testAgent', () => {
    const testAgent = {
      id: 'agent-123',
      name: 'Test Agent',
      type: 'customer_support' as const,
      base_prompt: 'You are a helpful assistant',
      model: 'gpt-4o' as const,
      temperature: 0.7,
      max_tokens: 1000,
      user_id: 'user-123',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    it('should generate test response successfully', async () => {
      const testMessage = 'Hello, how can you help me?';
      const expectedResponse = 'I can help you with various tasks. How may I assist you today?';

      mockRepository.findById.mockResolvedValue(testAgent);
      mockLLMProvider.generateResponse.mockResolvedValue({
        text: expectedResponse,
        tokens: { input: 10, output: 15 },
        model: 'gpt-4o'
      });

      const result = await agentService.testAgent('agent-123', 'user-123', testMessage);

      expect(result.response).toBe(expectedResponse);
      expect(result.tokens).toEqual({ input: 10, output: 15 });
      expect(mockLLMProvider.generateResponse).toHaveBeenCalledWith({
        messages: [
          { role: 'system', content: testAgent.base_prompt },
          { role: 'user', content: testMessage }
        ],
        model: testAgent.model,
        temperature: testAgent.temperature,
        max_tokens: testAgent.max_tokens
      });
    });

    it('should throw error if agent not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        agentService.testAgent('nonexistent-id', 'user-123', 'test message')
      ).rejects.toThrow('Agent not found');
    });

    it('should handle LLM provider errors', async () => {
      mockRepository.findById.mockResolvedValue(testAgent);
      mockLLMProvider.generateResponse.mockRejectedValue(new Error('LLM API error'));

      await expect(
        agentService.testAgent('agent-123', 'user-123', 'test message')
      ).rejects.toThrow('Failed to generate test response');
    });
  });

  describe('getAgentStats', () => {
    it('should return agent statistics', async () => {
      const agentId = 'agent-123';
      const mockStats = {
        totalMessages: 150,
        totalConversations: 25,
        averageResponseTime: 1.2,
        successRate: 0.95,
        lastActive: new Date().toISOString()
      };

      mockRepository.getStats.mockResolvedValue(mockStats);

      const result = await agentService.getAgentStats(agentId, 'user-123');

      expect(result).toEqual(mockStats);
      expect(mockRepository.getStats).toHaveBeenCalledWith(agentId);
    });

    it('should return default stats if no data available', async () => {
      mockRepository.getStats.mockResolvedValue(null);

      const result = await agentService.getAgentStats('agent-123', 'user-123');

      expect(result.totalMessages).toBe(0);
      expect(result.totalConversations).toBe(0);
      expect(result.averageResponseTime).toBe(0);
      expect(result.successRate).toBe(0);
    });
  });
});
