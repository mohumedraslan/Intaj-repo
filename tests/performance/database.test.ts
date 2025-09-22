/**
 * Database Performance Tests
 * Tests database query performance, connection pooling, and concurrent operations
 */

import { createClient } from '@supabase/supabase-js';
import { performance } from 'perf_hooks';
import { setupTestDatabase, cleanupTestDatabase, createTestUser, createTestAgent } from '../helpers/database';

describe('Database Performance Tests', () => {
  let supabase: any;
  let testUsers: any[] = [];
  let testAgents: any[] = [];

  beforeAll(async () => {
    await setupTestDatabase();
    
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Create test data for performance testing
    console.log('Creating test data for performance tests...');
    
    // Create multiple test users
    for (let i = 0; i < 10; i++) {
      const user = await createTestUser({
        email: `perftest${i}@example.com`,
        role: 'user',
        firstName: `PerfTest${i}`,
        lastName: 'User'
      });
      testUsers.push(user);
    }

    // Create multiple test agents for each user
    for (const user of testUsers) {
      for (let j = 0; j < 5; j++) {
        const agent = await createTestAgent({
          name: `Performance Test Agent ${j}`,
          type: 'customer_support',
          base_prompt: `You are performance test agent ${j} for user ${user.id}`,
          user_id: user.id,
          model: 'gpt-4o'
        });
        testAgents.push(agent);
      }
    }

    console.log(`Created ${testUsers.length} users and ${testAgents.length} agents for testing`);
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('Query Performance', () => {
    test('should handle single agent query efficiently', async () => {
      const agent = testAgents[0];
      
      const startTime = performance.now();
      
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agent.id)
        .single();

      const duration = performance.now() - startTime;

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.id).toBe(agent.id);
      expect(duration).toBeLessThan(100); // Should complete in under 100ms
    });

    test('should handle paginated agent queries efficiently', async () => {
      const user = testUsers[0];
      
      const startTime = performance.now();
      
      const { data, error, count } = await supabase
        .from('agents')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(0, 9); // First 10 results

      const duration = performance.now() - startTime;

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
      expect(count).toBeGreaterThan(0);
      expect(duration).toBeLessThan(200); // Should complete in under 200ms
    });

    test('should handle complex filtered queries efficiently', async () => {
      const startTime = performance.now();
      
      const { data, error } = await supabase
        .from('agents')
        .select(`
          *,
          profiles!inner(email, first_name, last_name)
        `)
        .eq('type', 'customer_support')
        .eq('is_active', true)
        .ilike('name', '%Test%')
        .order('created_at', { ascending: false })
        .limit(20);

      const duration = performance.now() - startTime;

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
      expect(duration).toBeLessThan(500); // Complex queries should complete in under 500ms
    });

    test('should handle search queries efficiently', async () => {
      const searchTerm = 'Performance';
      
      const startTime = performance.now();
      
      const { data, error } = await supabase
        .from('agents')
        .select('id, name, type, base_prompt')
        .or(`name.ilike.%${searchTerm}%,base_prompt.ilike.%${searchTerm}%`)
        .limit(50);

      const duration = performance.now() - startTime;

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
      expect(duration).toBeLessThan(300); // Search should complete in under 300ms
    });

    test('should handle aggregation queries efficiently', async () => {
      const startTime = performance.now();
      
      // Count agents by type
      const { data, error } = await supabase
        .rpc('get_agent_stats_by_type');

      const duration = performance.now() - startTime;

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(duration).toBeLessThan(400); // Aggregation should complete in under 400ms
    });
  });

  describe('Concurrent Operations', () => {
    test('should handle concurrent reads efficiently', async () => {
      const concurrentQueries = testAgents.slice(0, 10).map(agent => 
        supabase
          .from('agents')
          .select('*')
          .eq('id', agent.id)
          .single()
      );

      const startTime = performance.now();
      const results = await Promise.all(concurrentQueries);
      const duration = performance.now() - startTime;

      // All queries should succeed
      results.forEach((result, index) => {
        expect(result.error).toBeNull();
        expect(result.data).toBeDefined();
        expect(result.data.id).toBe(testAgents[index].id);
      });

      // Concurrent reads should complete efficiently
      expect(duration).toBeLessThan(1000); // 10 concurrent reads in under 1 second
    });

    test('should handle concurrent writes efficiently', async () => {
      const user = testUsers[0];
      
      const concurrentInserts = Array.from({ length: 5 }, (_, i) => 
        supabase
          .from('agents')
          .insert({
            name: `Concurrent Agent ${i}-${Date.now()}`,
            type: 'general',
            base_prompt: `Concurrent test agent ${i}`,
            model: 'gpt-4o',
            user_id: user.id,
            temperature: 0.7,
            max_tokens: 1000,
            is_active: true
          })
          .select()
          .single()
      );

      const startTime = performance.now();
      const results = await Promise.all(concurrentInserts);
      const duration = performance.now() - startTime;

      // All inserts should succeed
      results.forEach(result => {
        expect(result.error).toBeNull();
        expect(result.data).toBeDefined();
        expect(result.data.id).toBeDefined();
      });

      // Concurrent writes should complete efficiently
      expect(duration).toBeLessThan(2000); // 5 concurrent inserts in under 2 seconds

      // Cleanup created agents
      const createdIds = results.map(r => r.data.id);
      await supabase
        .from('agents')
        .delete()
        .in('id', createdIds);
    });

    test('should handle mixed read/write operations efficiently', async () => {
      const user = testUsers[1];
      
      const mixedOperations = [
        // Reads
        supabase.from('agents').select('*').eq('user_id', user.id),
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        
        // Writes
        supabase.from('agents').insert({
          name: `Mixed Op Agent ${Date.now()}`,
          type: 'sales',
          base_prompt: 'Mixed operation test agent',
          model: 'gpt-4o',
          user_id: user.id,
          is_active: true
        }).select().single(),
        
        // Updates
        supabase.from('profiles').update({
          updated_at: new Date().toISOString()
        }).eq('id', user.id),
        
        // More reads
        supabase.from('agents').select('count').eq('user_id', user.id)
      ];

      const startTime = performance.now();
      const results = await Promise.all(mixedOperations);
      const duration = performance.now() - startTime;

      // Most operations should succeed (some might have minor issues)
      const successCount = results.filter(r => r.error === null).length;
      expect(successCount).toBeGreaterThan(3); // At least 3 out of 5 should succeed

      expect(duration).toBeLessThan(1500); // Mixed operations in under 1.5 seconds

      // Cleanup if agent was created
      const insertResult = results[2];
      if (insertResult.data && insertResult.data.id) {
        await supabase
          .from('agents')
          .delete()
          .eq('id', insertResult.data.id);
      }
    });
  });

  describe('Connection Management', () => {
    test('should handle multiple sequential connections efficiently', async () => {
      const connectionTimes: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        
        const { data, error } = await supabase
          .from('agents')
          .select('id')
          .limit(1);

        const duration = performance.now() - startTime;
        connectionTimes.push(duration);

        expect(error).toBeNull();
        expect(data).toBeDefined();
      }

      // Connection times should be consistent
      const avgConnectionTime = connectionTimes.reduce((a, b) => a + b, 0) / connectionTimes.length;
      const maxConnectionTime = Math.max(...connectionTimes);
      
      expect(avgConnectionTime).toBeLessThan(100); // Average under 100ms
      expect(maxConnectionTime).toBeLessThan(300); // Max under 300ms
    });

    test('should handle connection pooling efficiently', async () => {
      // Create multiple clients to test pooling
      const clients = Array.from({ length: 5 }, () => 
        createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
      );

      const queries = clients.map((client, index) => 
        client
          .from('agents')
          .select('id, name')
          .eq('user_id', testUsers[index % testUsers.length].id)
          .limit(5)
      );

      const startTime = performance.now();
      const results = await Promise.all(queries);
      const duration = performance.now() - startTime;

      // All queries should succeed
      results.forEach(result => {
        expect(result.error).toBeNull();
        expect(result.data).toBeDefined();
      });

      // Multiple clients should work efficiently
      expect(duration).toBeLessThan(800); // 5 clients in under 800ms
    });
  });

  describe('Large Dataset Performance', () => {
    test('should handle large result sets efficiently', async () => {
      // Query all test agents (should be 50 total)
      const startTime = performance.now();
      
      const { data, error } = await supabase
        .from('agents')
        .select(`
          id,
          name,
          type,
          base_prompt,
          model,
          created_at,
          profiles!inner(email, first_name, last_name)
        `)
        .in('user_id', testUsers.map(u => u.id))
        .order('created_at', { ascending: false });

      const duration = performance.now() - startTime;

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.length).toBeGreaterThan(30); // Should have many results
      expect(duration).toBeLessThan(600); // Large dataset query in under 600ms
    });

    test('should handle pagination efficiently', async () => {
      const pageSize = 10;
      const pages = 3;
      const pageTimes: number[] = [];

      for (let page = 0; page < pages; page++) {
        const startTime = performance.now();
        
        const { data, error } = await supabase
          .from('agents')
          .select('id, name, type, created_at')
          .in('user_id', testUsers.map(u => u.id))
          .order('created_at', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        const duration = performance.now() - startTime;
        pageTimes.push(duration);

        expect(error).toBeNull();
        expect(data).toBeDefined();
        expect(data.length).toBeLessThanOrEqual(pageSize);
      }

      // All pages should load efficiently
      const avgPageTime = pageTimes.reduce((a, b) => a + b, 0) / pageTimes.length;
      expect(avgPageTime).toBeLessThan(200); // Average page load under 200ms
    });
  });

  describe('Database Stress Tests', () => {
    test('should maintain performance under rapid sequential operations', async () => {
      const user = testUsers[2];
      const operations = 20;
      const operationTimes: number[] = [];

      for (let i = 0; i < operations; i++) {
        const startTime = performance.now();
        
        // Alternate between different types of operations
        if (i % 3 === 0) {
          // Read operation
          await supabase
            .from('agents')
            .select('id, name')
            .eq('user_id', user.id)
            .limit(5);
        } else if (i % 3 === 1) {
          // Count operation
          await supabase
            .from('agents')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);
        } else {
          // Update operation
          await supabase
            .from('profiles')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', user.id);
        }

        const duration = performance.now() - startTime;
        operationTimes.push(duration);
      }

      // Performance should remain consistent
      const avgTime = operationTimes.reduce((a, b) => a + b, 0) / operationTimes.length;
      const maxTime = Math.max(...operationTimes);
      
      expect(avgTime).toBeLessThan(150); // Average under 150ms
      expect(maxTime).toBeLessThan(500); // No single operation over 500ms
    });

    test('should handle transaction-like operations efficiently', async () => {
      const user = testUsers[3];
      
      const startTime = performance.now();
      
      // Simulate a complex operation that might be wrapped in a transaction
      try {
        // Create agent
        const { data: newAgent, error: createError } = await supabase
          .from('agents')
          .insert({
            name: `Transaction Test Agent ${Date.now()}`,
            type: 'hr',
            base_prompt: 'Transaction test agent',
            model: 'gpt-4o',
            user_id: user.id,
            is_active: true
          })
          .select()
          .single();

        expect(createError).toBeNull();
        expect(newAgent).toBeDefined();

        // Update user's updated_at
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', user.id);

        expect(updateError).toBeNull();

        // Query to verify
        const { data: verification, error: verifyError } = await supabase
          .from('agents')
          .select('id, name, user_id')
          .eq('id', newAgent.id)
          .single();

        expect(verifyError).toBeNull();
        expect(verification.user_id).toBe(user.id);

        // Cleanup
        await supabase
          .from('agents')
          .delete()
          .eq('id', newAgent.id);

      } catch (error) {
        fail(`Transaction-like operation failed: ${error}`);
      }

      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(1000); // Complex operation in under 1 second
    });
  });

  describe('Memory and Resource Usage', () => {
    test('should not leak memory during repeated operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform many operations
      for (let i = 0; i < 100; i++) {
        await supabase
          .from('agents')
          .select('id')
          .limit(1);
      }

      const finalMemory = process.memoryUsage();
      
      // Memory usage should not increase dramatically
      const heapIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const heapIncreasePercent = (heapIncrease / initialMemory.heapUsed) * 100;
      
      expect(heapIncreasePercent).toBeLessThan(50); // Less than 50% increase
    });

    test('should handle cleanup efficiently', async () => {
      const user = testUsers[4];
      const agentsToCreate = 10;
      const createdIds: string[] = [];

      // Create multiple agents
      const startTime = performance.now();
      
      for (let i = 0; i < agentsToCreate; i++) {
        const { data, error } = await supabase
          .from('agents')
          .insert({
            name: `Cleanup Test Agent ${i}`,
            type: 'general',
            base_prompt: 'Cleanup test',
            model: 'gpt-4o',
            user_id: user.id,
            is_active: true
          })
          .select('id')
          .single();

        expect(error).toBeNull();
        createdIds.push(data.id);
      }

      // Bulk delete
      const { error: deleteError } = await supabase
        .from('agents')
        .delete()
        .in('id', createdIds);

      const duration = performance.now() - startTime;

      expect(deleteError).toBeNull();
      expect(duration).toBeLessThan(2000); // Create and delete 10 agents in under 2 seconds

      // Verify cleanup
      const { data: remainingAgents } = await supabase
        .from('agents')
        .select('id')
        .in('id', createdIds);

      expect(remainingAgents).toHaveLength(0);
    });
  });
});
