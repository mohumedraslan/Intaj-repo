/**
 * Jest Test Setup
 * Global test configuration and setup
 */

import '@testing-library/jest-dom';
import { server } from './mocks/msw-server';
import { TextEncoder, TextDecoder } from 'util';

// Polyfills for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-testing-purposes';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';

// Mock crypto for Node.js
const crypto = require('crypto');
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: () => crypto.randomUUID(),
    getRandomValues: (arr: any) => crypto.getRandomValues(arr),
  },
});

// Mock fetch for Node.js
import { fetch, Headers, Request, Response } from 'cross-fetch';
global.fetch = fetch;
global.Headers = Headers;
global.Request = Request;
global.Response = Response;

// Setup MSW (Mock Service Worker)
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'warn',
  });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
    route: '/',
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
  }),
}));

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        download: jest.fn(),
        remove: jest.fn(),
        list: jest.fn(),
      })),
    },
  })),
}));

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    keys: jest.fn(),
    ping: jest.fn(),
    quit: jest.fn(),
    disconnect: jest.fn(),
  }));
});

// Mock file system operations
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  mkdir: jest.fn(),
  access: jest.fn(),
  stat: jest.fn(),
}));

// Mock crypto operations
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomBytes: jest.fn(() => Buffer.from('mock-random-bytes')),
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'mock-hash'),
  })),
  createCipher: jest.fn(() => ({
    update: jest.fn(),
    final: jest.fn(),
    setAAD: jest.fn(),
    getAuthTag: jest.fn(() => Buffer.from('mock-auth-tag')),
  })),
  createDecipher: jest.fn(() => ({
    update: jest.fn(),
    final: jest.fn(),
    setAAD: jest.fn(),
    setAuthTag: jest.fn(),
  })),
}));

// Global test utilities
global.testUtils = {
  createMockUser: () => ({
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'user',
    created_at: new Date().toISOString(),
  }),
  createMockAgent: () => ({
    id: 'test-agent-id',
    name: 'Test Agent',
    type: 'customer_support',
    base_prompt: 'You are a helpful assistant',
    model: 'gpt-4o',
    user_id: 'test-user-id',
    created_at: new Date().toISOString(),
  }),
  createMockMessage: () => ({
    id: 'test-message-id',
    agent_id: 'test-agent-id',
    content: 'Test message',
    direction: 'inbound',
    platform: 'telegram',
    created_at: new Date().toISOString(),
  }),
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
};

// Increase timeout for async operations
jest.setTimeout(30000);

// Suppress console logs during tests unless debugging
if (!process.env.DEBUG_TESTS) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

export {};
