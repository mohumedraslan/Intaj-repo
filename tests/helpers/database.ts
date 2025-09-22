/**
 * Test Database Helper Functions
 * Provides utilities for setting up and managing test database
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient;

export async function setupTestDatabase(): Promise<void> {
  // Initialize Supabase client for testing
  supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Clean existing test data
  await cleanupTestDatabase();

  // Run any necessary setup
  await seedTestData();
}

export async function cleanupTestDatabase(): Promise<void> {
  if (!supabase) return;

  try {
    // Clean up in reverse dependency order
    await supabase.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('conversations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('telegram_bots').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('whatsapp_bots').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('api_keys').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('agents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Clean up auth users (if using test instance)
    if (process.env.NODE_ENV === 'test') {
      // Note: In a real test environment, you'd use a separate test database
      // This is just for demonstration
    }
  } catch (error) {
    console.warn('Error during test cleanup:', error);
  }
}

export async function seedTestData(): Promise<void> {
  // Add any default test data here if needed
  // For now, we'll create data on-demand in tests
}

export async function createTestUser(userData: {
  email: string;
  role?: string;
  firstName?: string;
  lastName?: string;
}): Promise<any> {
  const user = {
    id: generateTestId(),
    email: userData.email,
    role: userData.role || 'user',
    first_name: userData.firstName || 'Test',
    last_name: userData.lastName || 'User',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: 'active'
  };

  const { data, error } = await supabase
    .from('profiles')
    .insert(user)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }

  return data;
}

export async function createTestAgent(agentData: {
  name: string;
  type: string;
  base_prompt: string;
  user_id: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}): Promise<any> {
  const agent = {
    id: generateTestId(),
    name: agentData.name,
    type: agentData.type,
    base_prompt: agentData.base_prompt,
    model: agentData.model || 'gpt-4o',
    temperature: agentData.temperature || 0.7,
    max_tokens: agentData.max_tokens || 1000,
    user_id: agentData.user_id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_active: true
  };

  const { data, error } = await supabase
    .from('agents')
    .insert(agent)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test agent: ${error.message}`);
  }

  return data;
}

export async function createTestConversation(conversationData: {
  agent_id: string;
  platform: string;
  platform_user_id: string;
  platform_username?: string;
}): Promise<any> {
  const conversation = {
    id: generateTestId(),
    agent_id: conversationData.agent_id,
    platform: conversationData.platform,
    platform_user_id: conversationData.platform_user_id,
    platform_username: conversationData.platform_username,
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('conversations')
    .insert(conversation)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test conversation: ${error.message}`);
  }

  return data;
}

export async function createTestMessage(messageData: {
  conversation_id: string;
  agent_id: string;
  content: string;
  direction: 'inbound' | 'outbound';
  platform: string;
  platform_message_id?: string;
  platform_user_id?: string;
  metadata?: any;
}): Promise<any> {
  const message = {
    id: generateTestId(),
    conversation_id: messageData.conversation_id,
    agent_id: messageData.agent_id,
    content: messageData.content,
    direction: messageData.direction,
    platform: messageData.platform,
    platform_message_id: messageData.platform_message_id,
    platform_user_id: messageData.platform_user_id,
    metadata: messageData.metadata || {},
    created_at: new Date().toISOString(),
    processed_at: messageData.direction === 'outbound' ? new Date().toISOString() : null
  };

  const { data, error } = await supabase
    .from('messages')
    .insert(message)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test message: ${error.message}`);
  }

  return data;
}

export async function createTestAPIKey(userId: string, keyData?: {
  name?: string;
  permissions?: string[];
  expiresAt?: Date;
}): Promise<any> {
  const crypto = require('crypto');
  const apiKey = `intaj_test_${crypto.randomBytes(16).toString('hex')}`;
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

  const apiKeyRecord = {
    id: generateTestId(),
    user_id: userId,
    name: keyData?.name || 'Test API Key',
    key_hash: keyHash,
    permissions: keyData?.permissions || ['agent:read', 'agent:create'],
    expires_at: keyData?.expiresAt?.toISOString(),
    is_active: true,
    created_at: new Date().toISOString(),
    last_used_at: null,
    rate_limit: {
      requestsPerMinute: 60,
      requestsPerHour: 1000
    }
  };

  const { data, error } = await supabase
    .from('api_keys')
    .insert(apiKeyRecord)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test API key: ${error.message}`);
  }

  // Return both the API key and the record
  return {
    ...data,
    apiKey // The actual key for testing
  };
}

export async function createTelegramBot(botData: {
  agent_id: string;
  bot_token: string;
  bot_username: string;
  webhook_url?: string;
  is_active?: boolean;
}): Promise<any> {
  const bot = {
    id: generateTestId(),
    agent_id: botData.agent_id,
    bot_token: botData.bot_token,
    bot_username: botData.bot_username,
    webhook_url: botData.webhook_url,
    is_active: botData.is_active !== false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('telegram_bots')
    .insert(bot)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create telegram bot: ${error.message}`);
  }

  return data;
}

export async function createWhatsAppBot(botData: {
  agent_id: string;
  phone_number_id: string;
  access_token: string;
  webhook_verify_token: string;
  is_active?: boolean;
}): Promise<any> {
  const bot = {
    id: generateTestId(),
    agent_id: botData.agent_id,
    phone_number_id: botData.phone_number_id,
    access_token: botData.access_token,
    webhook_verify_token: botData.webhook_verify_token,
    is_active: botData.is_active !== false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('whatsapp_bots')
    .insert(bot)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create whatsapp bot: ${error.message}`);
  }

  return data;
}

export async function getTestUser(userId: string): Promise<any> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    throw new Error(`Failed to get test user: ${error.message}`);
  }

  return data;
}

export async function getTestAgent(agentId: string): Promise<any> {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .single();

  if (error) {
    throw new Error(`Failed to get test agent: ${error.message}`);
  }

  return data;
}

export async function getTestMessages(conversationId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to get test messages: ${error.message}`);
  }

  return data || [];
}

export async function waitForMessage(
  conversationId: string,
  direction: 'inbound' | 'outbound',
  timeoutMs: number = 5000
): Promise<any> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const messages = await getTestMessages(conversationId);
    const message = messages.find(m => m.direction === direction);
    
    if (message) {
      return message;
    }
    
    // Wait 100ms before checking again
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  throw new Error(`Timeout waiting for ${direction} message`);
}

export async function runMigrations(): Promise<void> {
  // In a real test environment, you would run database migrations here
  // For this example, we assume the database schema is already set up
  console.log('Running test database migrations...');
}

export function generateTestId(): string {
  // Generate a UUID-like string for testing
  return 'test-' + Math.random().toString(36).substring(2) + '-' + Date.now().toString(36);
}

export async function truncateTable(tableName: string): Promise<void> {
  try {
    await supabase.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  } catch (error) {
    console.warn(`Failed to truncate table ${tableName}:`, error);
  }
}

export async function getTableCount(tableName: string): Promise<number> {
  const { count, error } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true });

  if (error) {
    throw new Error(`Failed to get count for table ${tableName}: ${error.message}`);
  }

  return count || 0;
}

// Test data factories
export const TestDataFactory = {
  user: (overrides: any = {}) => ({
    email: 'test@example.com',
    role: 'user',
    firstName: 'Test',
    lastName: 'User',
    ...overrides
  }),

  agent: (userId: string, overrides: any = {}) => ({
    name: 'Test Agent',
    type: 'customer_support',
    base_prompt: 'You are a helpful assistant',
    user_id: userId,
    model: 'gpt-4o',
    temperature: 0.7,
    max_tokens: 1000,
    ...overrides
  }),

  message: (conversationId: string, agentId: string, overrides: any = {}) => ({
    conversation_id: conversationId,
    agent_id: agentId,
    content: 'Test message',
    direction: 'inbound' as const,
    platform: 'telegram',
    ...overrides
  }),

  telegramUpdate: (overrides: any = {}) => ({
    update_id: Math.floor(Math.random() * 1000000),
    message: {
      message_id: Math.floor(Math.random() * 10000),
      from: {
        id: 123456789,
        is_bot: false,
        first_name: 'Test',
        username: 'testuser'
      },
      chat: {
        id: 987654321,
        type: 'private'
      },
      date: Math.floor(Date.now() / 1000),
      text: 'Test message'
    },
    ...overrides
  })
};

export { supabase as testSupabase };
