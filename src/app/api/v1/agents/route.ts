/**
 * Agents API v1 - GET /api/v1/agents, POST /api/v1/agents
 * Standardized with validation, error handling, and middleware
 */

import { NextRequest } from 'next/server';
import { ApiMiddleware, ApiContext } from '@/middleware/apiMiddleware';
import { ApiResponses, createPaginationMeta } from '@/lib/apiResponse';
import { ErrorFactory } from '@/lib/errors';
import { CreateAgentSchema, AgentQuerySchema } from '@/schemas/agent';
import { PERMISSIONS } from '@/middleware/auth';
import { RateLimiters } from '@/lib/rateLimiterV2';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Initialize Supabase client
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/v1/agents
 * List agents with pagination, filtering, and search
 */
export const GET = ApiMiddleware.authenticated(
  async (context: ApiContext) => {
    const { user, correlationId, data } = context;
    
    try {
      const query = data.query || {};
      const {
        page = 1,
        limit = 20,
        type,
        search,
        tags,
        is_active,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = query;

      // Build Supabase query
      let supabaseQuery = supabase
        .from('agents')
        .select('*', { count: 'exact' })
        .eq('user_id', user!.id);

      // Apply filters
      if (type) {
        supabaseQuery = supabaseQuery.eq('agent_type', type);
      }

      if (is_active !== undefined) {
        supabaseQuery = supabaseQuery.eq('is_active', is_active);
      }

      if (search) {
        supabaseQuery = supabaseQuery.or(
          `name.ilike.%${search}%,description.ilike.%${search}%`
        );
      }

      if (tags && tags.length > 0) {
        supabaseQuery = supabaseQuery.contains('tags', tags);
      }

      // Apply sorting
      supabaseQuery = supabaseQuery.order(sort_by, { ascending: sort_order === 'asc' });

      // Apply pagination
      const offset = (page - 1) * limit;
      supabaseQuery = supabaseQuery.range(offset, offset + limit - 1);

      const { data: agents, error, count } = await supabaseQuery;

      if (error) {
        throw ErrorFactory.database(`Failed to fetch agents: ${error.message}`, correlationId);
      }

      // Create pagination metadata
      const pagination = createPaginationMeta(page, limit, count || 0);

      return ApiResponses.paginated(agents || [], pagination, correlationId);

    } catch (error) {
      console.error('GET /api/v1/agents error:', error);
      throw error;
    }
  },
  {
    validation: {
      query: AgentQuerySchema
    },
    rateLimit: {
      windowMs: 60 * 1000,
      maxRequests: 100,
      keyGenerator: (userId: string) => `agents:list:${userId}`
    },
    logging: {
      enabled: true,
      logBody: false,
      logResponse: false
    }
  }
);

/**
 * POST /api/v1/agents
 * Create a new agent
 */
export const POST = ApiMiddleware.authenticated(
  async (context: ApiContext) => {
    const { user, correlationId, data } = context;
    
    try {
      // Apply rate limiting for agent creation
      await RateLimiters.agentCreate(user!.id, correlationId);

      const agentData = data.body;

      // Check subscription limits
      const { data: existingAgents, error: countError } = await supabase
        .from('agents')
        .select('id', { count: 'exact' })
        .eq('user_id', user!.id);

      if (countError) {
        throw ErrorFactory.database(`Failed to check agent count: ${countError.message}`, correlationId);
      }

      // Check agent limits based on subscription tier
      const agentLimits = {
        free: 3,
        pro: 25,
        enterprise: 100
      };

      const currentCount = existingAgents?.length || 0;
      const limit = agentLimits[user!.subscription_tier];

      if (currentCount >= limit) {
        throw ErrorFactory.quotaExceeded(
          'agents',
          limit,
          currentCount,
          correlationId
        );
      }

      // Create agent in database
      const { data: newAgent, error: createError } = await supabase
        .from('agents')
        .insert({
          ...agentData,
          user_id: user!.id,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        throw ErrorFactory.database(`Failed to create agent: ${createError.message}`, correlationId);
      }

      // Log agent creation
      console.log('Agent created:', {
        correlationId,
        agentId: newAgent.id,
        userId: user!.id,
        agentName: newAgent.name,
        agentType: newAgent.agent_type
      });

      return ApiResponses.created(newAgent, correlationId);

    } catch (error) {
      console.error('POST /api/v1/agents error:', error);
      throw error;
    }
  },
  {
    auth: {
      required: true,
      requiredPermissions: [PERMISSIONS.AGENT_CREATE]
    },
    validation: {
      body: CreateAgentSchema
    },
    rateLimit: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 10,
      keyGenerator: (userId: string) => `agents:create:${userId}`
    },
    logging: {
      enabled: true,
      logBody: true,
      logResponse: true
    }
  }
);

/**
 * OpenAPI documentation
 */
export const metadata = {
  openapi: '3.0.0',
  info: {
    title: 'Agents API',
    version: '1.0.0',
    description: 'Manage AI agents'
  },
  paths: {
    '/api/v1/agents': {
      get: {
        summary: 'List agents',
        description: 'Get a paginated list of agents with filtering and search',
        parameters: [
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 }
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
          },
          {
            name: 'type',
            in: 'query',
            schema: { 
              type: 'string',
              enum: ['customer_support', 'sales', 'marketing', 'hr', 'technical_support', 'general']
            }
          },
          {
            name: 'search',
            in: 'query',
            schema: { type: 'string', maxLength: 100 }
          },
          {
            name: 'is_active',
            in: 'query',
            schema: { type: 'boolean' }
          }
        ],
        responses: {
          200: {
            description: 'List of agents',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Agent' }
                    },
                    metadata: {
                      type: 'object',
                      properties: {
                        pagination: { $ref: '#/components/schemas/Pagination' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        summary: 'Create agent',
        description: 'Create a new AI agent',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateAgent' }
            }
          }
        },
        responses: {
          201: {
            description: 'Agent created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Agent' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};
