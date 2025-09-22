/**
 * Load Testing for API Endpoints
 * Tests API performance, database connections, and system scalability
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const apiSuccessRate = new Rate('api_success_rate');
const dbQueryTime = new Trend('database_query_time');
const authFailures = new Counter('authentication_failures');
const rateLimitHits = new Counter('rate_limit_hits');

export let options = {
  stages: [
    // API warm-up
    { duration: '1m', target: 5 },
    
    // Normal API load
    { duration: '5m', target: 25 },
    
    // Increased load
    { duration: '5m', target: 50 },
    
    // Peak API usage
    { duration: '5m', target: 75 },
    
    // Stress test
    { duration: '3m', target: 100 },
    
    // Cool down
    { duration: '2m', target: 0 },
  ],
  
  thresholds: {
    'http_req_duration': ['p(95)<1500'], // 95% under 1.5s
    'http_req_failed': ['rate<0.02'], // Less than 2% error rate
    'api_success_rate': ['rate>0.98'], // 98% success rate
    'database_query_time': ['p(90)<500'], // 90% of DB queries under 500ms
    'authentication_failures': ['count<5'], // Max 5 auth failures
  }
};

// Test data
const testUsers = [
  { email: 'loadtest1@example.com', token: 'test-token-1' },
  { email: 'loadtest2@example.com', token: 'test-token-2' },
  { email: 'loadtest3@example.com', token: 'test-token-3' },
];

const agentTypes = ['customer_support', 'sales', 'hr', 'general'];
const models = ['gpt-4o', 'gpt-3.5-turbo', 'claude-3-sonnet'];

function generateAgentData() {
  const randomId = Math.floor(Math.random() * 10000);
  return {
    name: `Load Test Agent ${randomId}`,
    type: agentTypes[Math.floor(Math.random() * agentTypes.length)],
    base_prompt: `You are a helpful ${agentTypes[Math.floor(Math.random() * agentTypes.length)]} assistant for load testing.`,
    model: models[Math.floor(Math.random() * models.length)],
    temperature: Math.random() * 0.8 + 0.2, // 0.2 to 1.0
    max_tokens: Math.floor(Math.random() * 1000) + 500 // 500 to 1500
  };
}

function getRandomUser() {
  return testUsers[Math.floor(Math.random() * testUsers.length)];
}

export default function() {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  const user = getRandomUser();
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${user.token}`
  };

  group('Authentication & Authorization', function() {
    // Test token validation
    const authResponse = http.get(`${baseUrl}/api/v1/auth/me`, { headers });
    
    check(authResponse, {
      'auth check status 200': (r) => r.status === 200,
      'auth response time < 200ms': (r) => r.timings.duration < 200
    });

    if (authResponse.status !== 200) {
      authFailures.add(1);
    }
  });

  group('Agent Management API', function() {
    let createdAgentId;

    // Create agent
    group('Create Agent', function() {
      const agentData = generateAgentData();
      const createResponse = http.post(
        `${baseUrl}/api/v1/agents`,
        JSON.stringify(agentData),
        { headers, timeout: '10s' }
      );

      const createSuccess = check(createResponse, {
        'create agent status 201': (r) => r.status === 201,
        'create agent response time < 2s': (r) => r.timings.duration < 2000,
        'create agent returns id': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.data && body.data.id;
          } catch {
            return false;
          }
        }
      });

      if (createSuccess && createResponse.status === 201) {
        try {
          const body = JSON.parse(createResponse.body);
          createdAgentId = body.data.id;
          apiSuccessRate.add(1);
        } catch (e) {
          apiSuccessRate.add(0);
        }
      } else {
        apiSuccessRate.add(0);
      }

      dbQueryTime.add(createResponse.timings.duration);
    });

    // List agents
    group('List Agents', function() {
      const listResponse = http.get(
        `${baseUrl}/api/v1/agents?page=1&limit=10`,
        { headers, timeout: '5s' }
      );

      const listSuccess = check(listResponse, {
        'list agents status 200': (r) => r.status === 200,
        'list agents response time < 1s': (r) => r.timings.duration < 1000,
        'list agents returns array': (r) => {
          try {
            const body = JSON.parse(r.body);
            return Array.isArray(body.data);
          } catch {
            return false;
          }
        }
      });

      apiSuccessRate.add(listSuccess ? 1 : 0);
      dbQueryTime.add(listResponse.timings.duration);
    });

    // Get specific agent
    if (createdAgentId) {
      group('Get Agent', function() {
        const getResponse = http.get(
          `${baseUrl}/api/v1/agents/${createdAgentId}`,
          { headers, timeout: '5s' }
        );

        const getSuccess = check(getResponse, {
          'get agent status 200': (r) => r.status === 200,
          'get agent response time < 500ms': (r) => r.timings.duration < 500,
          'get agent returns correct id': (r) => {
            try {
              const body = JSON.parse(r.body);
              return body.data && body.data.id === createdAgentId;
            } catch {
              return false;
            }
          }
        });

        apiSuccessRate.add(getSuccess ? 1 : 0);
        dbQueryTime.add(getResponse.timings.duration);
      });

      // Update agent
      group('Update Agent', function() {
        const updateData = {
          name: `Updated Agent ${Math.floor(Math.random() * 1000)}`,
          temperature: Math.random()
        };

        const updateResponse = http.put(
          `${baseUrl}/api/v1/agents/${createdAgentId}`,
          JSON.stringify(updateData),
          { headers, timeout: '5s' }
        );

        const updateSuccess = check(updateResponse, {
          'update agent status 200': (r) => r.status === 200,
          'update agent response time < 1s': (r) => r.timings.duration < 1000
        });

        apiSuccessRate.add(updateSuccess ? 1 : 0);
        dbQueryTime.add(updateResponse.timings.duration);
      });

      // Test agent
      group('Test Agent', function() {
        const testData = {
          message: 'Hello, this is a load test message. How can you help me?'
        };

        const testResponse = http.post(
          `${baseUrl}/api/v1/agents/${createdAgentId}/test`,
          JSON.stringify(testData),
          { headers, timeout: '15s' }
        );

        const testSuccess = check(testResponse, {
          'test agent status 200': (r) => r.status === 200,
          'test agent response time < 10s': (r) => r.timings.duration < 10000,
          'test agent returns response': (r) => {
            try {
              const body = JSON.parse(r.body);
              return body.data && body.data.response;
            } catch {
              return false;
            }
          }
        });

        apiSuccessRate.add(testSuccess ? 1 : 0);
      });

      // Get agent stats
      group('Get Agent Stats', function() {
        const statsResponse = http.get(
          `${baseUrl}/api/v1/agents/${createdAgentId}/stats`,
          { headers, timeout: '5s' }
        );

        const statsSuccess = check(statsResponse, {
          'get stats status 200': (r) => r.status === 200,
          'get stats response time < 1s': (r) => r.timings.duration < 1000,
          'get stats returns metrics': (r) => {
            try {
              const body = JSON.parse(r.body);
              return body.data && typeof body.data.totalMessages === 'number';
            } catch {
              return false;
            }
          }
        });

        apiSuccessRate.add(statsSuccess ? 1 : 0);
        dbQueryTime.add(statsResponse.timings.duration);
      });

      // Delete agent (cleanup)
      group('Delete Agent', function() {
        const deleteResponse = http.del(
          `${baseUrl}/api/v1/agents/${createdAgentId}`,
          null,
          { headers, timeout: '5s' }
        );

        const deleteSuccess = check(deleteResponse, {
          'delete agent status 200': (r) => r.status === 200,
          'delete agent response time < 1s': (r) => r.timings.duration < 1000
        });

        apiSuccessRate.add(deleteSuccess ? 1 : 0);
        dbQueryTime.add(deleteResponse.timings.duration);
      });
    }
  });

  group('Integration Management API', function() {
    // Test integration endpoints
    const integrationsResponse = http.get(
      `${baseUrl}/api/v1/integrations`,
      { headers, timeout: '5s' }
    );

    check(integrationsResponse, {
      'list integrations status 200': (r) => r.status === 200,
      'list integrations response time < 500ms': (r) => r.timings.duration < 500
    });

    apiSuccessRate.add(integrationsResponse.status === 200 ? 1 : 0);
  });

  group('Analytics API', function() {
    // Test analytics endpoints
    const analyticsResponse = http.get(
      `${baseUrl}/api/v1/analytics/dashboard`,
      { headers, timeout: '5s' }
    );

    check(analyticsResponse, {
      'analytics status 200': (r) => r.status === 200,
      'analytics response time < 2s': (r) => r.timings.duration < 2000,
      'analytics returns data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data && typeof body.data === 'object';
        } catch {
          return false;
        }
      }
    });

    apiSuccessRate.add(analyticsResponse.status === 200 ? 1 : 0);
    dbQueryTime.add(analyticsResponse.timings.duration);
  });

  group('Rate Limiting Tests', function() {
    // Make rapid requests to test rate limiting
    for (let i = 0; i < 5; i++) {
      const rapidResponse = http.get(
        `${baseUrl}/api/v1/agents`,
        { headers, timeout: '2s' }
      );

      if (rapidResponse.status === 429) {
        rateLimitHits.add(1);
        check(rapidResponse, {
          'rate limit has retry-after header': (r) => r.headers['Retry-After'] !== undefined
        });
        break; // Stop making requests if rate limited
      }

      sleep(0.1); // Very short pause
    }
  });

  // Realistic pause between user actions
  sleep(Math.random() * 2 + 1); // 1-3 seconds
}

// Concurrent user simulation
export function concurrentUsers() {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  const user = getRandomUser();
  
  // Simulate multiple users creating agents simultaneously
  const agentPromises = [];
  
  for (let i = 0; i < 3; i++) {
    const agentData = generateAgentData();
    agentData.name = `Concurrent Agent ${__VU}-${i}`;
    
    const response = http.post(
      `${baseUrl}/api/v1/agents`,
      JSON.stringify(agentData),
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        timeout: '10s'
      }
    );

    check(response, {
      'concurrent creation handled': (r) => r.status === 201 || r.status === 409 // Allow name conflicts
    });
  }
}

// Database stress test
export function databaseStress() {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  const user = getRandomUser();
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${user.token}`
  };

  // Test database with complex queries
  group('Complex Database Operations', function() {
    // Search agents with filters
    const searchResponse = http.get(
      `${baseUrl}/api/v1/agents?search=test&type=customer_support&sortBy=created_at&sortOrder=desc&page=1&limit=50`,
      { headers, timeout: '5s' }
    );

    check(searchResponse, {
      'complex search status 200': (r) => r.status === 200,
      'complex search response time < 2s': (r) => r.timings.duration < 2000
    });

    dbQueryTime.add(searchResponse.timings.duration);

    // Get analytics with date range
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = new Date().toISOString();
    
    const analyticsResponse = http.get(
      `${baseUrl}/api/v1/analytics/agents?startDate=${startDate}&endDate=${endDate}&groupBy=day`,
      { headers, timeout: '10s' }
    );

    check(analyticsResponse, {
      'date range analytics status 200': (r) => r.status === 200,
      'date range analytics response time < 5s': (r) => r.timings.duration < 5000
    });

    dbQueryTime.add(analyticsResponse.timings.duration);
  });
}

export function setup() {
  console.log('Starting API load test...');
  
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  
  // Verify API is accessible
  const healthResponse = http.get(`${baseUrl}/api/v1/health`);
  if (healthResponse.status !== 200) {
    throw new Error(`API health check failed: ${healthResponse.status}`);
  }

  console.log('API load test setup complete');
  return { baseUrl };
}

export function teardown(data) {
  console.log('API load test completed');
  console.log(`Tested API at: ${data.baseUrl}`);
}
