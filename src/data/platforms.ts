export interface Platform {
  id: string;
  name: string;
  description: string;
  logo: string;
  available: boolean;
  authType: 'api-key' | 'oauth';
  configOptions?: {
    requiresChannel?: boolean;
    requiresWebhook?: boolean;
  };
}

const platforms: Platform[] = [
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    description: 'Connect your WhatsApp Business account',
    logo: '/logos/whatsapp.svg',
    available: true,
    authType: 'api-key',
    configOptions: {
      requiresWebhook: true
    }
  },
  {
    id: 'telegram',
    name: 'Telegram',
    description: 'Connect your Telegram bot',
    logo: '/logos/telegram.svg',
    available: true,
    authType: 'api-key'
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Connect your Slack workspace',
    logo: '/logos/slack.svg',
    available: true,
    authType: 'oauth',
    configOptions: {
      requiresChannel: true
    }
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Connect your Discord server',
    logo: '/logos/discord.svg',
    available: true,
    authType: 'oauth',
    configOptions: {
      requiresChannel: true
    }
  },
  {
    id: 'facebook',
    name: 'Facebook',
    description: 'Connect your Facebook page',
    logo: '/logos/facebook.svg',
    available: false,
    authType: 'oauth'
  },
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Connect your Instagram business account',
    logo: '/logos/instagram.svg',
    available: false,
    authType: 'oauth'
  },
  {
    id: 'twitter',
    name: 'Twitter',
    description: 'Connect your Twitter account',
    logo: '/logos/twitter.svg',
    available: false,
    authType: 'oauth'
  },
  {
    id: 'line',
    name: 'LINE',
    description: 'Connect your LINE official account',
    logo: '/logos/line.svg',
    available: false,
    authType: 'api-key'
  },
  {
    id: 'wechat',
    name: 'WeChat',
    description: 'Connect your WeChat official account',
    logo: '/logos/wechat.svg',
    available: false,
    authType: 'api-key'
  },
  {
    id: 'viber',
    name: 'Viber',
    description: 'Connect your Viber business account',
    logo: '/logos/viber.svg',
    available: false,
    authType: 'api-key'
  },
  {
    id: 'email',
    name: 'Email',
    description: 'Connect your email account',
    logo: '/logos/email.svg',
    available: false,
    authType: 'oauth'
  },
  {
    id: 'sms',
    name: 'SMS',
    description: 'Connect SMS via Twilio',
    logo: '/logos/sms.svg',
    available: false,
    authType: 'api-key'
  }
];

export default platforms;