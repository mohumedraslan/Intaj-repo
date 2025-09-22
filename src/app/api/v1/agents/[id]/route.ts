/**
 * Individual Agent API v1 - GET/PUT/DELETE /api/v1/agents/[id]
 * Standardized with validation, error handling, and middleware
 */

import { NextRequest } from 'next/server';
import { ApiMiddleware, ApiContext } from '@/middleware/apiMiddleware';
import { ApiResponses } from '@/lib/apiResponse';
import { ErrorFactory } from '@/lib/errors';
import { UpdateAgentSchema, AgentIdSchema } from '@/schemas/agent';
import { PERMISSIONS } from '@/middleware/auth';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Initialize Supabase client
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/v1/agents/[id]
 * Get a specific agent by ID
 */
export const GET = ApiMiddleware.authenticated(
  async (context: ApiContext) => {
    const { user, correlationId, req } = context;
    
    try {
      // Extract agent ID from URL
      const url = new URL(req.url);
      const pathSegments = url.pathname.split('/');
      const agentId = pathSegments[pathSegments.length - 1];

      // Validate agent ID format
      const { id } = AgentIdSchema.parse({ id: agentId });

      // Fetch agent from database
      const { data: agent, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', id)
        .eq('user_id', user!.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw ErrorFactory.notFound('Agent', correlationId);
        }
        throw ErrorFactory.database(`Failed to fetch agent: ${error.message}`, correlationId);
      }

      return ApiResponses.success(agent, correlationId);

    } catch (error) {
      console.error('GET /api/v1/agents/[id] error:', error);
      throw error;
    }
  },
  {
    auth: {
      required: true,
      requiredPermissions: [PERMISSIONS.AGENT_READ]
    },
    rateLimit: {
      windowMs: 60 * 1000,
      maxRequests: 200,
      keyGenerator: (userId: string) => `agents:read:${userId}`
    },
    logging: {
      enabled: true,
      logBody: false,
      logResponse: false
    }
  }
);

/**
 * PUT /api/v1/agents/[id]
 * Update a specific agent
 */
export const PUT = ApiMiddleware.authenticated(
  async (context: ApiContext) => {
    const { user, correlationId, req, data } = context;
    
    try {
      // Extract agent ID from URL
      const url = new URL(req.url);
      const pathSegments = url.pathname.split('/');
      const agentId = pathSegments[pathSegments.length - 1];

      // Validate agent ID format
      const { id } = AgentIdSchema.parse({ id: agentId });

      const updateData = data.body;

      // Check if agent exists and belongs to user
      const { data: existingAgent, error: fetchError } = await supabase
        .from('agents')
        .select('id, user_id, status')
        .eq('id', id)
        .eq('user_id', user!.id)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          throw ErrorFactory.notFound('Agent', correlationId);
        }
        throw ErrorFactory.database(`Failed to fetch agent: ${fetchError.message}`, correlationId);
      }

      // Update agent in database
      const { data: updatedAgent, error: updateError } = await supabase
        .from('agents')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user!.id)
        .select()
        .single();

      if (updateError) {
        throw ErrorFactory.database(`Failed to update agent: ${updateError.message}`, correlationId);
      }

      // Log agent update
      console.log('Agent updated:', {
        correlationId,
        agentId: id,
        userId: user!.id,
        updatedFields: Object.keys(updateData)
      });

      return ApiResponses.success(updatedAgent, correlationId);

    } catch (error) {
      console.error('PUT /api/v1/agents/[id] error:', error);
      throw error;
    }
  },
  {
    auth: {
      required: true,
      requiredPermissions: [PERMISSIONS.AGENT_UPDATE]
    },
    validation: {
      body: UpdateAgentSchema
    },
    rateLimit: {
      windowMs: 60 * 1000,
      maxRequests: 50,
      keyGenerator: (userId: string) => `agents:update:${userId}`
    },
    logging: {
      enabled: true,
      logBody: true,
      logResponse: true
    }
  }
);

/**
 * DELETE /api/v1/agents/[id]
 * Delete a specific agent
 */
export const DELETE = ApiMiddleware.authenticated(
  async (context: ApiContext) => {
    const { user, correlationId, req } = context;
    
    try {
      // Extract agent ID from URL
      const url = new URL(req.url);
      const pathSegments = url.pathname.split('/');
      const agentId = pathSegments[pathSegments.length - 1];

      // Validate agent ID format
      const { id } = AgentIdSchema.parse({ id: agentId });

      // Check if agent exists and belongs to user
      const { data: existingAgent, error: fetchError } = await supabase
        .from('agents')
        .select('id, user_id, name, status')
        .eq('id', id)
        .eq('user_id', user!.id)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          throw ErrorFactory.notFound('Agent', correlationId);
        }
        throw ErrorFactory.database(`Failed to fetch agent: ${fetchError.message}`, correlationId);
      }

      // Check if agent has active integrations
      const { data: integrations, error: integrationsError } = await supabase
        .from('connections')
        .select('id')
        .eq('agent_id', id)
        .eq('status', 'active');

      if (integrationsError) {
        throw ErrorFactory.database(`Failed to check integrations: ${integrationsError.message}`, correlationId);
      }

      if (integrations && integrations.length > 0) {
        throw ErrorFactory.businessLogic(
          'Cannot delete agent with active integrations. Please disconnect all integrations first.',
          { activeIntegrations: integrations.length },
          correlationId
        );
      }

      // Soft delete the agent (mark as inactive)
      const { error: deleteError } = await supabase
        .from('agents')
        .update({
          is_active: false,
          status: 'deleted',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user!.id);

      if (deleteError) {
        throw ErrorFactory.database(`Failed to delete agent: ${deleteError.message}`, correlationId);
      }

      // Log agent deletion
      console.log('Agent deleted:', {
        correlationId,
        agentId: id,
        userId: user!.id,
        agentName: existingAgent.name
      });

      return ApiResponses.noContent(correlationId);

    } catch (error) {
      console.error('DELETE /api/v1/agents/[id] error:', error);
      throw error;
    }
  },
  {
    auth: {
      required: true,
      requiredPermissions: [PERMISSIONS.AGENT_DELETE]
    },
    rateLimit: {
      windowMs: 60 * 1000,
      maxRequests: 20,
      keyGenerator: (userId: string) => `agents:delete:${userId}`
    },
    logging: {
      enabled: true,
      logBody: false,
      logResponse: false
    }
  }
);

/**
 * OpenAPI documentation
 */
export const metadata = {
  openapi: '3.0.0',
  paths: {
    '/api/v1/agents/{id}': {
      get: {
        summary: 'Get agent',
        description: 'Get a specific agent by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        responses: {
          200: {
            description: 'Agent details',
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
          },
          404: {
            description: 'Agent not found'
          }
        }
      },
      put: {
        summary: 'Update agent',
        description: 'Update a specific agent',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateAgent' }
            }
          }
        },
        responses: {
          200: {
            description: 'Agent updated successfully',
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
      },
      delete: {
        summary: 'Delete agent',
        description: 'Delete a specific agent (soft delete)',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        responses: {
          204: {
            description: 'Agent deleted successfully'
          },
          400: {
            description: 'Cannot delete agent with active integrations'
          }
        }
      }
    }
  }
};
