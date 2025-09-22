/**
 * Integration Tests for Agent API
 * Tests complete API workflows with database and authentication
 */

import request from 'supertest';
import { createServer } from 'http';
import { NextApiHandler } from 'next';
import { setupTestDatabase, cleanupTestDatabase, createTestUser, createTestAgent } from '../../helpers/database';
import { generateTestJWT, generateTestAPIKey } from '../../helpers/auth';

// Mock Next.js API handler setup
const createTestApp = (handler: NextApiHandler) => {
  const server = createServer((req, res) => {
    // Parse request body
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      if (body) {
        try {
          (req as any).body = JSON.parse(body);
        } catch {
          (req as any).body = body;
        }
      }
      handler(req as any, res as any);
    });
  });
  return server;
};

describe('Agent API Integration Tests', () => {
  let testUser: any;
  let testAgent: any;
  let validJWT: string;
  let validAPIKey: string;

  beforeAll(async () => {
    await setupTestDatabase();
    
    // Create test user and agent
    testUser = await createTestUser({
      email: 'test@example.com',
      role: 'user'
    });
    
    testAgent = await createTestAgent({
      name: 'Test Agent',
      type: 'customer_support',
      base_prompt: 'You are a helpful assistant',
      user_id: testUser.id
    });

    // Generate authentication tokens
    validJWT = await generateTestJWT(testUser);
    validAPIKey = await generateTestAPIKey(testUser.id);
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('POST /api/v1/agents', () => {
    const validAgentData = {
      name: 'New Test Agent',
      type: 'customer_support',
      base_prompt: 'You are a helpful customer support assistant',
      model: 'gpt-4o',
      temperature: 0.7,
      max_tokens: 1000
    };

    it('should create agent with valid JWT authentication', async () => {
      const { default: handler } = await import('@/app/api/v1/agents/route');
      const app = createTestApp(handler);

      const response = await request(app)
        .post('/api/v1/agents')
        .set('Authorization', `Bearer ${validJWT}`)
        .set('Content-Type', 'application/json')
        .send(validAgentData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        name: validAgentData.name,
        type: validAgentData.type,
        base_prompt: validAgentData.base_prompt,
        model: validAgentData.model
      });
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.user_id).toBe(testUser.id);
    });

    it('should create agent with valid API key authentication', async () => {
      const { default: handler } = await import('@/app/api/v1/agents/route');
      const app = createTestApp(handler);

      const response = await request(app)
        .post('/api/v1/agents')
        .set('X-API-Key', validAPIKey)
        .set('Content-Type', 'application/json')
        .send({
          ...validAgentData,
          name: 'API Key Agent'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('API Key Agent');
    });

    it('should return 401 without authentication', async () => {
      const { default: handler } = await import('@/app/api/v1/agents/route');
      const app = createTestApp(handler);

      const response = await request(app)
        .post('/api/v1/agents')
        .set('Content-Type', 'application/json')
        .send(validAgentData);

      expect(response.status).toBe(401);
      expect(response.body.error).toMatchObject({
        code: 'MISSING_TOKEN',
        message: 'Authentication token required'
      });
    });

    it('should return 400 for invalid agent data', async () => {
      const { default: handler } = await import('@/app/api/v1/agents/route');
      const app = createTestApp(handler);

      const invalidData = {
        name: '', // Invalid: empty name
        type: 'invalid_type', // Invalid type
        base_prompt: '' // Invalid: empty prompt
      };

      const response = await request(app)
        .post('/api/v1/agents')
        .set('Authorization', `Bearer ${validJWT}`)
        .set('Content-Type', 'application/json')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('validation');
    });

    it('should apply rate limiting', async () => {
      const { default: handler } = await import('@/app/api/v1/agents/route');
      const app = createTestApp(handler);

      // Make multiple rapid requests
      const requests = Array.from({ length: 10 }, () =>
        request(app)
          .post('/api/v1/agents')
          .set('Authorization', `Bearer ${validJWT}`)
          .set('Content-Type', 'application/json')
          .send({
            ...validAgentData,
            name: `Rate Limit Test ${Math.random()}`
          })
      );

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      
      // Rate limited responses should have proper headers
      rateLimitedResponses.forEach(response => {
        expect(response.headers['x-ratelimit-limit']).toBeDefined();
        expect(response.headers['retry-after']).toBeDefined();
      });
    });
  });

  describe('GET /api/v1/agents', () => {
    it('should return user agents with pagination', async () => {
      const { default: handler } = await import('@/app/api/v1/agents/route');
      const app = createTestApp(handler);

      const response = await request(app)
        .get('/api/v1/agents?page=1&limit=10')
        .set('Authorization', `Bearer ${validJWT}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: expect.any(Number)
      });
      
      // Should only return user's agents
      response.body.data.forEach((agent: any) => {
        expect(agent.user_id).toBe(testUser.id);
      });
    });

    it('should filter agents by type', async () => {
      const { default: handler } = await import('@/app/api/v1/agents/route');
      const app = createTestApp(handler);

      const response = await request(app)
        .get('/api/v1/agents?type=customer_support')
        .set('Authorization', `Bearer ${validJWT}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((agent: any) => {
        expect(agent.type).toBe('customer_support');
      });
    });

    it('should search agents by name', async () => {
      const { default: handler } = await import('@/app/api/v1/agents/route');
      const app = createTestApp(handler);

      const response = await request(app)
        .get('/api/v1/agents?search=Test')
        .set('Authorization', `Bearer ${validJWT}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((agent: any) => {
        expect(agent.name.toLowerCase()).toContain('test');
      });
    });
  });

  describe('GET /api/v1/agents/:id', () => {
    it('should return specific agent', async () => {
      const { default: handler } = await import('@/app/api/v1/agents/[id]/route');
      const app = createTestApp(handler);

      const response = await request(app)
        .get(`/api/v1/agents/${testAgent.id}`)
        .set('Authorization', `Bearer ${validJWT}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: testAgent.id,
        name: testAgent.name,
        type: testAgent.type,
        user_id: testUser.id
      });
    });

    it('should return 404 for non-existent agent', async () => {
      const { default: handler } = await import('@/app/api/v1/agents/[id]/route');
      const app = createTestApp(handler);

      const response = await request(app)
        .get('/api/v1/agents/non-existent-id')
        .set('Authorization', `Bearer ${validJWT}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('AGENT_NOT_FOUND');
    });

    it('should return 403 for agent owned by another user', async () => {
      // Create another user and agent
      const otherUser = await createTestUser({
        email: 'other@example.com',
        role: 'user'
      });
      
      const otherAgent = await createTestAgent({
        name: 'Other User Agent',
        type: 'sales',
        base_prompt: 'Sales assistant',
        user_id: otherUser.id
      });

      const { default: handler } = await import('@/app/api/v1/agents/[id]/route');
      const app = createTestApp(handler);

      const response = await request(app)
        .get(`/api/v1/agents/${otherAgent.id}`)
        .set('Authorization', `Bearer ${validJWT}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('ACCESS_DENIED');
    });
  });

  describe('PUT /api/v1/agents/:id', () => {
    it('should update agent with valid data', async () => {
      const { default: handler } = await import('@/app/api/v1/agents/[id]/route');
      const app = createTestApp(handler);

      const updateData = {
        name: 'Updated Agent Name',
        base_prompt: 'Updated prompt',
        temperature: 0.8
      };

      const response = await request(app)
        .put(`/api/v1/agents/${testAgent.id}`)
        .set('Authorization', `Bearer ${validJWT}`)
        .set('Content-Type', 'application/json')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject(updateData);
      expect(response.body.data.updated_at).toBeDefined();
    });

    it('should validate update data', async () => {
      const { default: handler } = await import('@/app/api/v1/agents/[id]/route');
      const app = createTestApp(handler);

      const invalidUpdateData = {
        name: '', // Invalid: empty name
        temperature: 2.0 // Invalid: temperature > 1
      };

      const response = await request(app)
        .put(`/api/v1/agents/${testAgent.id}`)
        .set('Authorization', `Bearer ${validJWT}`)
        .set('Content-Type', 'application/json')
        .send(invalidUpdateData);

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('validation');
    });
  });

  describe('DELETE /api/v1/agents/:id', () => {
    it('should delete agent successfully', async () => {
      // Create agent to delete
      const agentToDelete = await createTestAgent({
        name: 'Agent to Delete',
        type: 'general',
        base_prompt: 'Test prompt',
        user_id: testUser.id
      });

      const { default: handler } = await import('@/app/api/v1/agents/[id]/route');
      const app = createTestApp(handler);

      const response = await request(app)
        .delete(`/api/v1/agents/${agentToDelete.id}`)
        .set('Authorization', `Bearer ${validJWT}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify agent is deleted
      const getResponse = await request(app)
        .get(`/api/v1/agents/${agentToDelete.id}`)
        .set('Authorization', `Bearer ${validJWT}`);

      expect(getResponse.status).toBe(404);
    });

    it('should return 404 when deleting non-existent agent', async () => {
      const { default: handler } = await import('@/app/api/v1/agents/[id]/route');
      const app = createTestApp(handler);

      const response = await request(app)
        .delete('/api/v1/agents/non-existent-id')
        .set('Authorization', `Bearer ${validJWT}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/v1/agents/:id/test', () => {
    it('should test agent with message', async () => {
      const { default: handler } = await import('@/app/api/v1/agents/[id]/test/route');
      const app = createTestApp(handler);

      const testMessage = {
        message: 'Hello, how can you help me?'
      };

      const response = await request(app)
        .post(`/api/v1/agents/${testAgent.id}/test`)
        .set('Authorization', `Bearer ${validJWT}`)
        .set('Content-Type', 'application/json')
        .send(testMessage);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        response: expect.any(String),
        tokens: {
          input: expect.any(Number),
          output: expect.any(Number)
        },
        model: expect.any(String)
      });
    });

    it('should validate test message', async () => {
      const { default: handler } = await import('@/app/api/v1/agents/[id]/test/route');
      const app = createTestApp(handler);

      const response = await request(app)
        .post(`/api/v1/agents/${testAgent.id}/test`)
        .set('Authorization', `Bearer ${validJWT}`)
        .set('Content-Type', 'application/json')
        .send({ message: '' }); // Empty message

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('message');
    });
  });

  describe('GET /api/v1/agents/:id/stats', () => {
    it('should return agent statistics', async () => {
      const { default: handler } = await import('@/app/api/v1/agents/[id]/stats/route');
      const app = createTestApp(handler);

      const response = await request(app)
        .get(`/api/v1/agents/${testAgent.id}/stats`)
        .set('Authorization', `Bearer ${validJWT}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        totalMessages: expect.any(Number),
        totalConversations: expect.any(Number),
        averageResponseTime: expect.any(Number),
        successRate: expect.any(Number)
      });
    });

    it('should support date range filtering', async () => {
      const { default: handler } = await import('@/app/api/v1/agents/[id]/stats/route');
      const app = createTestApp(handler);

      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get(`/api/v1/agents/${testAgent.id}/stats?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${validJWT}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      // Simulate database error by using invalid connection
      const originalEnv = process.env.DATABASE_URL;
      process.env.DATABASE_URL = 'postgresql://invalid:invalid@localhost:5432/invalid';

      const { default: handler } = await import('@/app/api/v1/agents/route');
      const app = createTestApp(handler);

      const response = await request(app)
        .get('/api/v1/agents')
        .set('Authorization', `Bearer ${validJWT}`);

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('DATABASE_ERROR');

      // Restore original environment
      process.env.DATABASE_URL = originalEnv;
    });

    it('should handle malformed JSON requests', async () => {
      const { default: handler } = await import('@/app/api/v1/agents/route');
      const app = createTestApp(handler);

      const response = await request(app)
        .post('/api/v1/agents')
        .set('Authorization', `Bearer ${validJWT}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_JSON');
    });

    it('should handle concurrent requests safely', async () => {
      const { default: handler } = await import('@/app/api/v1/agents/route');
      const app = createTestApp(handler);

      // Create multiple concurrent requests
      const concurrentRequests = Array.from({ length: 5 }, (_, i) =>
        request(app)
          .post('/api/v1/agents')
          .set('Authorization', `Bearer ${validJWT}`)
          .set('Content-Type', 'application/json')
          .send({
            name: `Concurrent Agent ${i}`,
            type: 'customer_support',
            base_prompt: 'Test prompt'
          })
      );

      const responses = await Promise.all(concurrentRequests);

      // All requests should succeed or fail gracefully
      responses.forEach(response => {
        expect([200, 201, 400, 429, 500]).toContain(response.status);
      });

      // Successful responses should have unique agent IDs
      const successfulResponses = responses.filter(r => r.status === 201);
      const agentIds = successfulResponses.map(r => r.body.data.id);
      const uniqueIds = new Set(agentIds);
      expect(uniqueIds.size).toBe(agentIds.length);
    });
  });
});
