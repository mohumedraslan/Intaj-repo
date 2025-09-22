import { NextRequest, NextResponse } from 'next/server';
import { createClient, createApiClient } from '@/lib/supabase/server';
import { getAgentService, getIntegrationService } from '@/services/ServiceFactory';
import { generateCorrelationId } from '@/lib/logging/Logger';

// Types for better type safety
interface CreateAgentRequest {
  name: string;
  base_prompt: string;
  model?: string;
  agent_type?: string;
  description?: string;
  integrations?: {
    telegramToken?: string;
    autoSetupWebhook?: boolean;
    baseUrl?: string;
  };
}

interface WebhookSetupResult {
  success: boolean;
  webhookUrl?: string;
  error?: string;
  connectionId?: string;
  agentId?: string;
}

interface AgentCreationResponse {
  success: boolean;
  agentId: string;
  connectionId: string | null;
  agent: {
    id: string;
    name: string;
    base_prompt: string;
    model: string;
    status: string;
    agent_type: string;
  };
  webhook: WebhookSetupResult | null;
}

export async function POST(req: NextRequest): Promise<NextResponse<AgentCreationResponse | { error: string; details?: string; debug?: any }>> {
  const startTime = Date.now();
  const correlationId = generateCorrelationId();
  
  try {
    const requestBody = await req.json() as CreateAgentRequest;
    const { name, base_prompt, model, agent_type, description, integrations } = requestBody;
    
    console.log('🚀 Agent Creation Request:', {
      correlationId,
      name,
      agent_type: agent_type || 'customer_support',
      hasIntegrations: !!integrations,
      telegramIntegration: !!integrations?.telegramToken,
      timestamp: new Date().toISOString()
    });
    
    if (!name || !base_prompt) {
      return NextResponse.json({ error: 'name and base_prompt are required' }, { status: 400 });
    }

    // Get user authentication
    const authHeader = req.headers.get('Authorization');
    const hasBearerToken = authHeader?.startsWith('Bearer ');
    const supabase = hasBearerToken ? createApiClient(req) : createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Unauthorized', 
        details: authError?.message,
        debug: {
          hasAuthHeader: !!authHeader,
          hasBearerToken,
          correlationId
        }
      }, { status: 401 });
    }

    // Use service layer to create agent
    const agentService = getAgentService();
    const agent = await agentService.createAgent(user.id, {
      name,
      description: description || `AI agent: ${name}`,
      model: model || 'gpt-4o',
      base_prompt,
      settings: {
        temperature: 0.7,
        max_tokens: 1000,
        timeout_ms: 10000,
        enable_rag: false
      }
    }, correlationId);

    console.log('✅ Agent created successfully:', {
      correlationId,
      agentId: agent.id,
      name: agent.name
    });

    let connectionId: string | null = null;
    let webhookResult: WebhookSetupResult | null = null;

    // Handle Telegram integration if provided
    if (integrations?.telegramToken) {
      try {
        const integrationService = getIntegrationService();
        const connection = await integrationService.createConnection(user.id, {
          agent_id: agent.id,
          platform: 'telegram',
          config: {
            bot_token: integrations.telegramToken
          }
        }, correlationId);

        connectionId = connection.id;

        // Set up webhook automatically
        if (integrations.autoSetupWebhook && integrations.baseUrl) {
          console.log('🔗 Setting up Telegram webhook...', {
            correlationId,
            agentId: agent.id,
            connectionId: connection.id,
            baseUrl: integrations.baseUrl
          });
          
          try {
            const webhookResponse = await fetch(`${req.url.split('/api/')[0]}/api/integrations/telegram/setupWebhook`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': req.headers.get('Authorization') || ''
              },
              body: JSON.stringify({
                botToken: integrations.telegramToken,
                baseUrl: integrations.baseUrl,
                agentId: agent.id
              })
            });

            if (webhookResponse.ok) {
              const webhookData = await webhookResponse.json() as WebhookSetupResult;
              webhookResult = webhookData;
              
              // Update connection status to active
              await integrationService.updateConnectionStatus(
                connection.id,
                user.id,
                'active',
                undefined,
                correlationId
              );
              
            } else {
              const webhookError = await webhookResponse.json() as { error: string };
              webhookResult = {
                success: false,
                error: webhookError.error || 'Webhook setup failed',
                agentId: agent.id,
                connectionId: connection.id
              };
            }
          } catch (webhookError) {
            console.error('❌ Webhook setup exception:', {
              correlationId,
              error: webhookError instanceof Error ? webhookError.message : String(webhookError),
              agentId: agent.id,
              connectionId: connection.id
            });
            
            webhookResult = {
              success: false,
              error: 'Webhook setup failed due to network or server error',
              agentId: agent.id,
              connectionId: connection.id
            };
          }
        }
      } catch (connectionError) {
        console.error('❌ Connection creation failed:', {
          correlationId,
          error: connectionError instanceof Error ? connectionError.message : String(connectionError),
          agentId: agent.id
        });
        
        // Note: We don't rollback agent creation here as the agent is still valid
        // The user can set up integrations later
      }
    }

    const executionTime = Date.now() - startTime;
    
    console.log('🎉 Agent creation completed:', {
      correlationId,
      agentId: agent.id,
      connectionId,
      webhookSuccess: webhookResult?.success || false,
      executionTimeMs: executionTime,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      agentId: agent.id,
      connectionId,
      agent: {
        id: agent.id,
        name: agent.name,
        base_prompt: agent.base_prompt || '',
        model: agent.model,
        status: agent.status,
        agent_type: agent_type || 'customer_support'
      },
      webhook: webhookResult
    });

  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    
    console.error('💥 Agent creation failed:', {
      correlationId,
      error: error.message,
      stack: error.stack,
      executionTimeMs: executionTime,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json({ 
      error: 'Internal server error during agent creation',
      details: error.message,
      debug: { executionTimeMs: executionTime, correlationId }
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const correlationId = generateCorrelationId();
  
  try {
    // Get user authentication
    const authHeader = req.headers.get('Authorization');
    const hasBearerToken = authHeader?.startsWith('Bearer ');
    const supabase = hasBearerToken ? createApiClient(req) : createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Unauthorized', 
        details: authError?.message,
        debug: { correlationId }
      }, { status: 401 });
    }

    // Use service layer to get agents
    const agentService = getAgentService();
    const integrationService = getIntegrationService();
    
    const agents = await agentService.getUserAgents(user.id, correlationId);
    
    // Get connections for each agent
    const agentsWithConnections = await Promise.all(
      agents.map(async (agent) => {
        try {
          const connections = await integrationService.getAgentConnections(
            agent.id,
            user.id,
            correlationId
          );
          return {
            ...agent,
            connections: connections.map(conn => ({
              id: conn.id,
              platform: conn.platform,
              status: conn.status,
              config: conn.config
            }))
          };
        } catch (error) {
          console.error('Failed to get connections for agent:', {
            correlationId,
            agentId: agent.id,
            error: error instanceof Error ? error.message : String(error)
          });
          return {
            ...agent,
            connections: []
          };
        }
      })
    );

    console.log('✅ Agents fetched successfully:', {
      correlationId,
      userId: user.id,
      agentCount: agents.length,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({ 
      agents: agentsWithConnections,
      metadata: {
        correlationId,
        count: agents.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('💥 Failed to fetch agents:', {
      correlationId,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json({ 
      error: 'Internal server error while fetching agents',
      details: error.message,
      debug: { correlationId }
    }, { status: 500 });
  }
}
