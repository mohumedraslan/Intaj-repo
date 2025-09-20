import { NextRequest, NextResponse } from 'next/server';
import { createClient, createApiClient } from '@/lib/supabase/server';

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
  
  try {
    const requestBody: CreateAgentRequest = await req.json();
    const { name, base_prompt, model, agent_type, description, integrations } = requestBody;
    
    console.log('🚀 Agent Creation Request:', {
      name,
      agent_type: agent_type || 'customer_support',
      hasIntegrations: !!integrations,
      telegramIntegration: !!integrations?.telegramToken,
      timestamp: new Date().toISOString()
    });
    
    if (!name || !base_prompt) {
      return NextResponse.json({ error: 'name and base_prompt are required' }, { status: 400 });
    }

    // Check if we have a Bearer token
    const authHeader = req.headers.get('Authorization');
    const hasBearerToken = authHeader?.startsWith('Bearer ');
    
    console.log('POST /api/agents - Auth Debug:', {
      hasAuthHeader: !!authHeader,
      hasBearerToken,
      authHeaderLength: authHeader?.length
    });
    
    // Use appropriate client based on authentication method
    const supabase = hasBearerToken ? createApiClient(req) : createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('POST /api/agents - User Auth Result:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      authError: authError?.message
    });
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Unauthorized', 
        details: authError?.message,
        debug: {
          hasAuthHeader: !!authHeader,
          hasBearerToken,
          authHeaderPreview: authHeader?.substring(0, 20) + '...'
        }
      }, { status: 401 });
    }

    // Start transaction by creating agent first
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .insert({
        user_id: user.id,
        name,
        base_prompt,
        model: model || 'gpt-4o',
        status: 'active',
        agent_type: agent_type || 'customer_support',
        description: description || `AI agent: ${name}`
      })
      .select()
      .single();

    if (agentError) {
      console.error('❌ Agent creation failed:', {
        error: agentError.message,
        code: agentError.code,
        details: JSON.stringify(agentError, null, 2),
        requestData: { name, base_prompt, model, agent_type }
      });
      return NextResponse.json({ 
        error: 'Failed to create agent', 
        details: agentError.message,
        debug: { code: agentError.code, hint: agentError.hint }
      }, { status: 500 });
    }
    
    console.log('✅ Agent created successfully:', {
      agentId: agent.id,
      name: agent.name,
      agent_type: agent.agent_type
    });

    let connectionId = null;
    let webhookResult = null;

    // Handle Telegram integration if provided
    if (integrations?.telegramToken) {
      const { data: connection, error: connectionError } = await supabase
        .from('connections')
        .insert({
          user_id: user.id,
          agent_id: agent.id,
          platform: 'telegram',
          name: `${name} - Telegram`,
          config: {
            bot_token: integrations.telegramToken
          },
          status: 'pending'
        })
        .select()
        .single();

      if (connectionError) {
        // Rollback agent creation if connection fails
        await supabase.from('agents').delete().eq('id', agent.id);
        return NextResponse.json({ 
          error: 'Failed to create Telegram connection', 
          details: connectionError.message 
        }, { status: 500 });
      }

      connectionId = connection.id;

      // Set up webhook automatically with enhanced error handling
      if (integrations.autoSetupWebhook && integrations.baseUrl) {
        console.log('🔗 Setting up Telegram webhook...', {
          agentId: agent.id,
          connectionId: connection.id,
          baseUrl: integrations.baseUrl
        });
        
        try {
          // Add a small delay to ensure connection is fully committed
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const webhookResponse = await fetch(`${req.url.split('/api/')[0]}/api/integrations/telegram/setupWebhook`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': req.headers.get('Authorization') || ''
            },
            body: JSON.stringify({
              botToken: integrations.telegramToken,
              baseUrl: integrations.baseUrl,
              agentId: agent.id // Pass the actual agent ID
            })
          });

          if (webhookResponse.ok) {
            webhookResult = await webhookResponse.json();
            console.log('✅ Webhook setup successful:', {
              agentId: agent.id,
              webhookUrl: webhookResult.webhookUrl,
              connectionId: webhookResult.connectionId
            });
            
            // Update connection status to active
            await supabase
              .from('connections')
              .update({ status: 'active' })
              .eq('id', connection.id);
              
          } else {
            const webhookError = await webhookResponse.json();
            console.error('❌ Webhook setup failed:', {
              status: webhookResponse.status,
              error: webhookError,
              agentId: agent.id,
              connectionId: connection.id
            });
            
            webhookResult = {
              success: false,
              error: webhookError.error || 'Webhook setup failed',
              agentId: agent.id,
              connectionId: connection.id
            };
          }
        } catch (webhookError) {
          console.error('❌ Webhook setup exception:', {
            error: webhookError instanceof Error ? webhookError.message : String(webhookError),
            stack: webhookError instanceof Error ? webhookError.stack : undefined,
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
      } else {
        console.log('⏭️ Skipping webhook setup:', {
          autoSetupWebhook: integrations.autoSetupWebhook,
          hasBaseUrl: !!integrations.baseUrl,
          agentId: agent.id
        });
      }
    }

    const executionTime = Date.now() - startTime;
    
    console.log('🎉 Agent creation completed:', {
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
        base_prompt: agent.base_prompt,
        model: agent.model,
        status: agent.status,
        agent_type: agent.agent_type
      },
      webhook: webhookResult
    });

  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    
    console.error('💥 Agent creation failed:', {
      error: error.message,
      stack: error.stack,
      executionTimeMs: executionTime,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json({ 
      error: 'Internal server error during agent creation',
      details: error.message,
      debug: { executionTimeMs: executionTime }
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    // Check if we have a Bearer token
    const authHeader = req.headers.get('Authorization');
    const hasBearerToken = authHeader?.startsWith('Bearer ');
    
    // Use appropriate client based on authentication method
    const supabase = hasBearerToken ? createApiClient(req) : createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized', details: authError?.message }, { status: 401 });
    }

    const { data: agents, error } = await supabase
      .from('agents')
      .select(`
        *,
        connections (
          id,
          platform,
          name,
          status,
          config
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
    }

    return NextResponse.json({ agents });

  } catch (error: any) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
