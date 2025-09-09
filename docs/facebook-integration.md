# Facebook Messenger Integration Guide

## Overview

This guide will help you integrate your Intaj chatbot with Facebook Messenger. Facebook integration enables your chatbot to:

- Engage with customers through Messenger
- Handle page messages and comments
- Send proactive notifications
- Support rich message templates

## Prerequisites

1. Facebook Business Account
2. Facebook Page
3. Intaj Pro or Business subscription
4. SSL-enabled webhook endpoint

## Setup Steps

### 1. Facebook App Setup

1. Visit [Facebook Developers](https://developers.facebook.com)
2. Create a new app or use existing one
3. Add Messenger product to your app
4. Note down your:
   - App ID
   - App Secret
   - Page Access Token

### 2. Intaj Dashboard Configuration

1. Log in to [Intaj Dashboard](https://dashboard.intaj.io)
2. Navigate to Connections > Facebook
3. Click "Add Facebook Connection"
4. Enter your Facebook credentials:

   ```json
   {
     "appId": "your_app_id",
     "appSecret": "your_app_secret",
     "pageAccessToken": "your_page_token"
   }
   ```

### 3. Webhook Setup

Configure your webhook endpoint in Facebook App Dashboard:

1. Set Webhook URL:

   ```txt
   https://api.intaj.io/webhook/facebook/{your_bot_id}
   ```

2. Set verify token from Intaj dashboard
3. Subscribe to webhook events:
   - messages
   - messaging_postbacks
   - message_reactions
   - messaging_referrals

## Integration Options

### 1. REST API

Send messages via API:

```javascript
const response = await fetch('https://api.intaj.io/api/facebook/send', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer your_api_key',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    recipientId: 'user_psid',
    type: 'text',
    content: 'Hello from Intaj!',
  }),
});
```

### 2. SDK Integration

Using Intaj SDK:

```javascript
import { Intaj } from 'intaj-sdk';

const intaj = new Intaj({ apiKey: 'your_api_key' });

// Send text message
await intaj.facebook.send({
  recipientId: 'user_psid',
  type: 'text',
  content: 'Hello from Intaj!',
});

// Send template message
await intaj.facebook.sendTemplate({
  recipientId: 'user_psid',
  template: {
    type: 'generic',
    elements: [
      {
        title: 'Welcome!',
        subtitle: 'Choose an option:',
        buttons: [
          {
            type: 'postback',
            title: 'Get Started',
            payload: 'GET_STARTED',
          },
        ],
      },
    ],
  },
});
```

## Message Types

### 1. Text Messages

```javascript
await intaj.facebook.send({
  recipientId: 'user_psid',
  type: 'text',
  content: 'Hello!',
});
```

### 2. Rich Messages

```javascript
await intaj.facebook.send({
  recipientId: 'user_psid',
  type: 'generic',
  content: {
    title: 'Welcome!',
    subtitle: 'Choose an option:',
    image_url: 'https://example.com/image.jpg',
    buttons: [
      {
        type: 'postback',
        title: 'Get Started',
        payload: 'GET_STARTED',
      },
    ],
  },
});
```

### 3. Quick Replies

```javascript
await intaj.facebook.send({
  recipientId: 'user_psid',
  type: 'quick_replies',
  content: {
    text: 'Choose an option:',
    quick_replies: [
      {
        content_type: 'text',
        title: 'Option 1',
        payload: 'OPTION_1',
      },
    ],
  },
});
```

## Best Practices

1. **Message Rules**
   - Follow Facebook's messaging policies
   - Use tags for out-of-window messages
   - Implement customer matching when required

2. **Rate Limiting**
   - Monitor rate limit headers
   - Implement exponential backoff
   - Cache frequently used resources

3. **Error Handling**
   - Handle error codes appropriately
   - Implement retry logic
   - Log message status updates

4. **Security**
   - Store credentials securely
   - Validate webhook signatures
   - Use environment variables

## Troubleshooting

### Common Issues

1. **Message Not Delivered**
   - Verify page permissions
   - Check recipient opt-in status
   - Review message content policy

2. **Webhook Not Receiving**
   - Verify SSL certificate
   - Check webhook URL
   - Validate webhook subscription

3. **Rate Limits**
   - Monitor usage dashboard
   - Implement queuing
   - Review burst limits

## Testing

1. Create test page
2. Use test users
3. Verify webhook integration
4. Test all message types
5. Check error scenarios

## Support

- Documentation: [docs.intaj.io](https://docs.intaj.io)
- Support: [support@intaj.io](mailto:support@intaj.io)
- Status: [status.intaj.io](https://status.intaj.io)
