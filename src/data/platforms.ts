export interface Platform {
  id: string;
  name: string;
  description: string;
  logo: string;
  status: 'live' | 'coming_soon';
  authType: 'api-key' | 'oauth';
  configOptions?: {
    requiresChannel?: boolean;
    requiresWebhook?: boolean;
  };
}

const platforms: Platform[] = [
  {
    id: 'email',
    name: 'Email',
    description: 'Connect your email account',
    logo: '/logos/email.svg',
    status: 'live',
    authType: 'oauth'
  },
  {
    id: 'telegram',
    name: 'Telegram',
    description: 'Connect your Telegram bot',
    logo: '/logos/telegram.svg',
    status: 'live',
    authType: 'api-key'
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Connect your Slack workspace',
    logo: '/logos/slack.svg',
    status: 'live',
    authType: 'oauth',
    configOptions: {
      requiresChannel: true
    }
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    description: 'Connect your WhatsApp Business account',
    logo: '/logos/whatsapp.svg',
    status: 'coming_soon',
    authType: 'api-key',
    configOptions: {
      requiresWebhook: true
    }
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Connect your Discord server',
    logo: '/logos/discord.svg',
    status: 'coming_soon',
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
    status: 'coming_soon',
    authType: 'oauth'
  },
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Connect your Instagram business account',
    logo: '/logos/instagram.svg',
    status: 'coming_soon',
    authType: 'oauth'
  },
  {
    id: 'twitter',
    name: 'Twitter',
    description: 'Connect your Twitter account',
    logo: '/logos/twitter.svg',
    status: 'coming_soon',
    authType: 'oauth'
  },
  {
    id: 'line',
    name: 'LINE',
    description: 'Connect your LINE official account',
    logo: '/logos/line.svg',
    status: 'coming_soon',
    authType: 'api-key'
  },
  {
    id: 'wechat',
    name: 'WeChat',
    description: 'Connect your WeChat official account',
    logo: '/logos/wechat.svg',
    status: 'coming_soon',
    authType: 'api-key'
  },
  {
    id: 'viber',
    name: 'Viber',
    description: 'Connect your Viber business account',
    logo: '/logos/viber.svg',
    status: 'coming_soon',
    authType: 'api-key'
  },
  {
    id: 'sms',
    name: 'SMS',
    description: 'Connect SMS via Twilio',
    logo: '/logos/sms.svg',
    status: 'coming_soon',
    authType: 'api-key'
  }
];

export default platforms;