import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface WhatsAppWebhookBody {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          text?: {
            body: string;
          };
          type: string;
        }>;
        statuses?: Array<{
          id: string;
          status: string;
          timestamp: string;
          recipient_id: string;
        }>;
      };
      field: string;
    }>;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe') {
    // Verify the webhook
    const { data: whatsappBot } = await supabase
      .from('whatsapp_bots')
      .select('webhook_verify_token')
      .eq('agent_id', params.agentId)
      .single();

    if (whatsappBot && token === whatsappBot.webhook_verify_token) {
      return new NextResponse(challenge);
    } else {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  return new NextResponse('Method not allowed', { status: 405 });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const body: WhatsAppWebhookBody = await request.json();

    // Verify webhook signature (in production, you should verify the signature)
    
    // Process incoming messages
    for (const entry of body.entry) {
      for (const change of entry.changes) {
        if (change.field === 'messages') {
          const { value } = change;
          
          if (value.messages) {
            for (const message of value.messages) {
              await processIncomingMessage(params.agentId, message, value.contacts?.[0]);
            }
          }
        }
      }
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function processIncomingMessage(
  agentId: string,
  message: any,
  contact?: any
) {
  try {
    // Get WhatsApp bot configuration
    const { data: whatsappBot, error: botError } = await supabase
      .from('whatsapp_bots')
      .select('*')
      .eq('agent_id', agentId)
      .single();

    if (botError || !whatsappBot) {
      console.error('WhatsApp bot not found:', botError);
      return;
    }

    // Get agent configuration
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      console.error('Agent not found:', agentError);
      return;
    }

    const userMessage = message.text?.body;
    if (!userMessage) return;

    const whatsappUserId = message.from;
    const whatsappUserName = contact?.profile?.name || 'User';

    // Log incoming message
    await supabase.from('whatsapp_messages').insert({
      agent_id: agentId,
      user_id: agent.user_id,
      whatsapp_bot_id: whatsappBot.id,
      whatsapp_user_id: whatsappUserId,
      whatsapp_user_name: whatsappUserName,
      message_type: 'text',
      message_content: userMessage,
      direction: 'inbound',
      is_ai_response: false
    });

    // Check business hours
    const isBusinessHours = checkBusinessHours(whatsappBot.business_hours);
    
    let responseMessage = '';
    let shouldRespond = true;

    if (whatsappBot.support_mode === 'manual') {
      // Manual mode - don't auto-respond
      shouldRespond = false;
    } else if (!isBusinessHours && whatsappBot.business_hours.enabled) {
      // Outside business hours
      responseMessage = whatsappBot.auto_responses.business_hours_message;
    } else {
      // Generate AI response
      const startTime = Date.now();
      
      try {
        const completion = await openai.chat.completions.create({
          model: agent.model || 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: agent.base_prompt || 'You are a helpful customer service assistant. Respond professionally and helpfully to customer inquiries.'
            },
            {
              role: 'user',
              content: userMessage
            }
          ],
          max_tokens: 500,
          temperature: 0.7,
        });

        responseMessage = completion.choices[0]?.message?.content || whatsappBot.auto_responses.fallback_message;
        
        const responseTime = (Date.now() - startTime) / 1000;

        // Log AI response time
        await supabase.from('whatsapp_messages').insert({
          agent_id: agentId,
          user_id: agent.user_id,
          whatsapp_bot_id: whatsappBot.id,
          whatsapp_user_id: whatsappUserId,
          whatsapp_user_name: whatsappUserName,
          message_type: 'text',
          message_content: responseMessage,
          direction: 'outbound',
          is_ai_response: true,
          response_time_seconds: responseTime
        });

      } catch (aiError) {
        console.error('AI response error:', aiError);
        responseMessage = whatsappBot.auto_responses.fallback_message;
      }
    }

    // Send response via WhatsApp API
    if (shouldRespond && responseMessage) {
      await sendWhatsAppMessage(
        whatsappBot.phone_number_id,
        whatsappBot.access_token,
        whatsappUserId,
        responseMessage
      );
    }

    // Check for workflow triggers
    await checkWorkflowTriggers(agentId, userMessage, whatsappUserId);

  } catch (error) {
    console.error('Error processing WhatsApp message:', error);
  }
}

function checkBusinessHours(businessHours: any): boolean {
  if (!businessHours.enabled) return true;

  const now = new Date();
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'lowercase' });
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

  const schedule = businessHours.schedule[dayOfWeek];
  if (!schedule || !schedule.enabled) return false;

  return currentTime >= schedule.start && currentTime <= schedule.end;
}

async function sendWhatsAppMessage(
  phoneNumberId: string,
  accessToken: string,
  recipientId: string,
  message: string
) {
  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: recipientId,
        type: 'text',
        text: {
          body: message
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('WhatsApp API error:', errorData);
      throw new Error(`WhatsApp API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    throw error;
  }
}

async function checkWorkflowTriggers(
  agentId: string,
  message: string,
  whatsappUserId: string
) {
  try {
    // Get active workflows for this agent
    const { data: workflows } = await supabase
      .from('agent_workflows')
      .select('*')
      .eq('agent_id', agentId)
      .eq('is_active', true);

    if (!workflows) return;

    for (const workflow of workflows) {
      for (const trigger of workflow.triggers) {
        if (trigger.type === 'keyword_detected') {
          const keywords = trigger.value.toLowerCase().split(',');
          const messageWords = message.toLowerCase();
          
          const hasKeyword = keywords.some(keyword => 
            messageWords.includes(keyword.trim())
          );

          if (hasKeyword) {
            await executeWorkflowActions(workflow.actions, agentId, whatsappUserId);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking workflow triggers:', error);
  }
}

async function executeWorkflowActions(
  actions: any[],
  agentId: string,
  whatsappUserId: string
) {
  for (const action of actions) {
    try {
      switch (action.type) {
        case 'send_message':
          // Get WhatsApp bot for sending
          const { data: whatsappBot } = await supabase
            .from('whatsapp_bots')
            .select('phone_number_id, access_token')
            .eq('agent_id', agentId)
            .single();

          if (whatsappBot) {
            await sendWhatsAppMessage(
              whatsappBot.phone_number_id,
              whatsappBot.access_token,
              whatsappUserId,
              action.config.message
            );
          }
          break;

        case 'transfer_human':
          // Log transfer request (implement human handoff logic)
          console.log(`Transfer to human requested for user ${whatsappUserId}`);
          break;

        case 'api_call':
          // Make external API call
          if (action.config.url) {
            await fetch(action.config.url, {
              method: action.config.method || 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
              body: action.config.method === 'POST' ? JSON.stringify({
                agentId,
                userId: whatsappUserId
              }) : undefined
            });
          }
          break;

        default:
          console.log(`Unknown workflow action type: ${action.type}`);
      }
    } catch (error) {
      console.error(`Error executing workflow action ${action.type}:`, error);
    }
  }
}
