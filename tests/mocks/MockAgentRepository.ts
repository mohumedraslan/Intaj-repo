/**
 * Mock Agent Repository for Testing
 * Provides mock implementation of agent data access
 */

export interface Agent {
  id: string;
  name: string;
  type: 'customer_support' | 'sales' | 'hr' | 'general';
  base_prompt: string;
  model: string;
  temperature?: number;
  max_tokens?: number;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface AgentStats {
  totalMessages: number;
  totalConversations: number;
  averageResponseTime: number;
  successRate: number;
  lastActive: string | null;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export class MockAgentRepository {
  create = jest.fn<Promise<Agent>, [Omit<Agent, 'id' | 'created_at' | 'updated_at'>]>();
  findById = jest.fn<Promise<Agent | null>, [string]>();
  findByUserId = jest.fn<Promise<Agent[]>, [string, PaginationOptions?]>();
  update = jest.fn<Promise<Agent>, [string, Partial<Agent>]>();
  delete = jest.fn<Promise<boolean>, [string]>();
  getStats = jest.fn<Promise<AgentStats | null>, [string]>();
  findByName = jest.fn<Promise<Agent | null>, [string, string]>();
  count = jest.fn<Promise<number>, [string]>();

  constructor() {
    // Set up default mock implementations
    this.create.mockImplementation(async (data) => ({
      id: `agent-${Date.now()}`,
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    this.findById.mockImplementation(async (id) => {
      if (id === 'existing-agent-id') {
        return {
          id,
          name: 'Test Agent',
          type: 'customer_support',
          base_prompt: 'You are a helpful assistant',
          model: 'gpt-4o',
          temperature: 0.7,
          max_tokens: 1000,
          user_id: 'test-user-id',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }
      return null;
    });

    this.findByUserId.mockImplementation(async (userId, options = {}) => {
      const { page = 1, limit = 10 } = options;
      const mockAgents: Agent[] = [
        {
          id: 'agent-1',
          name: 'Customer Support Agent',
          type: 'customer_support',
          base_prompt: 'You are a helpful customer support assistant',
          model: 'gpt-4o',
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'agent-2',
          name: 'Sales Agent',
          type: 'sales',
          base_prompt: 'You are a sales assistant',
          model: 'gpt-4o',
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      const startIndex = (page - 1) * limit;
      return mockAgents.slice(startIndex, startIndex + limit);
    });

    this.update.mockImplementation(async (id, updateData) => {
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error('Agent not found');
      }
      return {
        ...existing,
        ...updateData,
        updated_at: new Date().toISOString()
      };
    });

    this.delete.mockImplementation(async (id) => {
      const existing = await this.findById(id);
      return !!existing;
    });

    this.getStats.mockImplementation(async (agentId) => ({
      totalMessages: 100,
      totalConversations: 20,
      averageResponseTime: 1.5,
      successRate: 0.95,
      lastActive: new Date().toISOString()
    }));

    this.findByName.mockImplementation(async (name, userId) => {
      if (name === 'Existing Agent') {
        return {
          id: 'existing-agent-by-name',
          name,
          type: 'customer_support',
          base_prompt: 'You are a helpful assistant',
          model: 'gpt-4o',
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }
      return null;
    });

    this.count.mockImplementation(async (userId) => 2);
  }

  // Helper methods for testing
  reset() {
    jest.clearAllMocks();
  }

  setMockAgent(agent: Agent) {
    this.findById.mockImplementation(async (id) => {
      if (id === agent.id) return agent;
      return null;
    });
  }

  setMockAgents(agents: Agent[]) {
    this.findByUserId.mockImplementation(async (userId, options = {}) => {
      const userAgents = agents.filter(agent => agent.user_id === userId);
      const { page = 1, limit = 10 } = options;
      const startIndex = (page - 1) * limit;
      return userAgents.slice(startIndex, startIndex + limit);
    });
  }

  simulateError(method: keyof MockAgentRepository, error: Error) {
    (this[method] as jest.Mock).mockRejectedValue(error);
  }
}
