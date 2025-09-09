import { createWorkflowService } from 'n8n-core';
import { IN8n } from 'n8n-workflow';

export interface ChannelConfig {
  whatsapp?: {
    accessToken: string;
    phoneNumberId: string;
  };
  facebook?: {
    accessToken: string;
    pageId: string;
  };
  instagram?: {
    accessToken: string;
    accountId: string;
  };
}

export class MessageRouter {
  private static instance: MessageRouter;
  private workflow: IN8n;

  private constructor() {
    // Initialize n8n workflow
    this.workflow = createWorkflowService({
      nodes: [
        {
          name: 'Webhook',
          type: 'n8n-nodes-base.webhook',
          parameters: {
            path: '/webhook',
            responseMode: 'lastNode',
          },
        },
        {
          name: 'OpenRouter',
          type: 'n8n-nodes-base.httpRequest',
          parameters: {
            url: 'https://openrouter.ai/api/v1/chat/completions',
            method: 'POST',
            authentication: 'headerAuth',
            headerAuthKey: 'Authorization',
            headerAuthValue: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          },
        },
        {
          name: 'Switch',
          type: 'n8n-nodes-base.switch',
          parameters: {
            conditions: [
              {
                value1: '={{$node["Webhook"].json["platform"]}}',
                operation: 'equal',
                value2: 'whatsapp',
              },
              {
                value1: '={{$node["Webhook"].json["platform"]}}',
                operation: 'equal',
                value2: 'facebook',
              },
              {
                value1: '={{$node["Webhook"].json["platform"]}}',
                operation: 'equal',
                value2: 'instagram',
              },
            ],
          },
        },
        {
          name: 'WhatsApp',
          type: 'n8n-nodes-base.httpRequest',
          parameters: {
            url: '={{$node["Webhook"].json["whatsappConfig"].apiUrl}}',
            method: 'POST',
            authentication: 'headerAuth',
            headerAuthKey: 'Authorization',
            headerAuthValue: '={{$node["Webhook"].json["whatsappConfig"].accessToken}}',
          },
        },
        {
          name: 'Facebook',
          type: 'n8n-nodes-base.httpRequest',
          parameters: {
            url: '={{$node["Webhook"].json["facebookConfig"].apiUrl}}',
            method: 'POST',
            authentication: 'headerAuth',
            headerAuthKey: 'Authorization',
            headerAuthValue: '={{$node["Webhook"].json["facebookConfig"].accessToken}}',
          },
        },
        {
          name: 'Instagram',
          type: 'n8n-nodes-base.httpRequest',
          parameters: {
            url: '={{$node["Webhook"].json["instagramConfig"].apiUrl}}',
            method: 'POST',
            authentication: 'headerAuth',
            headerAuthKey: 'Authorization',
            headerAuthValue: '={{$node["Webhook"].json["instagramConfig"].accessToken}}',
          },
        },
      ],
      connections: {
        Webhook: {
          main: [
            [
              {
                node: 'OpenRouter',
                type: 'main',
                index: 0,
              },
            ],
          ],
        },
        OpenRouter: {
          main: [
            [
              {
                node: 'Switch',
                type: 'main',
                index: 0,
              },
            ],
          ],
        },
        Switch: {
          main: [
            [
              {
                node: 'WhatsApp',
                type: 'main',
                index: 0,
              },
            ],
            [
              {
                node: 'Facebook',
                type: 'main',
                index: 0,
              },
            ],
            [
              {
                node: 'Instagram',
                type: 'main',
                index: 0,
              },
            ],
          ],
        },
      },
    });
  }

  public static getInstance(): MessageRouter {
    if (!MessageRouter.instance) {
      MessageRouter.instance = new MessageRouter();
    }
    return MessageRouter.instance;
  }

  public async handleMessage(message: any, config: ChannelConfig): Promise<void> {
    // Execute workflow with message and config
    await this.workflow.execute({
      data: {
        ...message,
        whatsappConfig: config.whatsapp,
        facebookConfig: config.facebook,
        instagramConfig: config.instagram,
      },
    });
  }
}
