/**
 * Zod validation schemas for agent-related API endpoints
 */

import { z } from 'zod';

// Agent types enum
export const AgentTypeSchema = z.enum([
  'customer_support',
  'sales', 
  'marketing',
  'hr',
  'technical_support',
  'general'
]);

// Agent settings schema
export const AgentSettingsSchema = z.object({
  temperature: z.number().min(0).max(2).default(0.7),
  max_tokens: z.number().min(100).max(4000).default(1000),
  timeout_ms: z.number().min(5000).max(30000).default(10000),
  model: z.string().default('gpt-4o'),
  system_prompt: z.string().optional(),
  tools_enabled: z.array(z.string()).default([]),
  knowledge_base_enabled: z.boolean().default(true),
  conversation_memory: z.boolean().default(true),
  response_format: z.enum(['text', 'markdown', 'json']).default('text')
});

// Create agent schema
export const CreateAgentSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Name can only contain letters, numbers, spaces, hyphens, and underscores'),
  
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  
  type: AgentTypeSchema,
  
  base_prompt: z.string()
    .min(10, 'Base prompt must be at least 10 characters')
    .max(4000, 'Base prompt must be less than 4000 characters'),
  
  settings: AgentSettingsSchema.optional(),
  
  template_id: z.string().uuid().optional(),
  
  tags: z.array(z.string().max(50)).max(10).default([]),
  
  is_active: z.boolean().default(true),
  
  avatar_url: z.string().url().optional()
});

// Update agent schema
export const UpdateAgentSchema = CreateAgentSchema.partial().omit({
  type: true // Type cannot be changed after creation
});

// Agent query parameters
export const AgentQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  type: AgentTypeSchema.optional(),
  search: z.string().max(100).optional(),
  tags: z.string().transform(str => str.split(',').filter(Boolean)).optional(),
  is_active: z.coerce.boolean().optional(),
  sort_by: z.enum(['created_at', 'updated_at', 'name']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

// Agent ID parameter
export const AgentIdSchema = z.object({
  id: z.string().uuid('Invalid agent ID format')
});

// Bulk operations
export const BulkAgentActionSchema = z.object({
  agent_ids: z.array(z.string().uuid()).min(1, 'At least one agent ID required').max(50, 'Maximum 50 agents allowed'),
  action: z.enum(['activate', 'deactivate', 'delete', 'archive']),
  confirm: z.boolean().refine(val => val === true, 'Confirmation required for bulk operations')
});

// Agent deployment schema
export const DeployAgentSchema = z.object({
  agent_id: z.string().uuid(),
  deployment_type: z.enum(['manual', 'auto', 'rollback']).default('manual'),
  notes: z.string().max(500).optional(),
  config_overrides: z.record(z.any()).optional()
});

// Agent analytics query
export const AgentAnalyticsSchema = z.object({
  agent_id: z.string().uuid(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  metrics: z.array(z.enum([
    'conversations',
    'messages', 
    'response_time',
    'user_satisfaction',
    'token_usage',
    'cost'
  ])).default(['conversations', 'messages', 'response_time']),
  granularity: z.enum(['hour', 'day', 'week', 'month']).default('day')
});

// Export types
export type CreateAgentInput = z.infer<typeof CreateAgentSchema>;
export type UpdateAgentInput = z.infer<typeof UpdateAgentSchema>;
export type AgentQuery = z.infer<typeof AgentQuerySchema>;
export type AgentId = z.infer<typeof AgentIdSchema>;
export type BulkAgentAction = z.infer<typeof BulkAgentActionSchema>;
export type DeployAgent = z.infer<typeof DeployAgentSchema>;
export type AgentAnalytics = z.infer<typeof AgentAnalyticsSchema>;
export type AgentType = z.infer<typeof AgentTypeSchema>;
export type AgentSettings = z.infer<typeof AgentSettingsSchema>;
