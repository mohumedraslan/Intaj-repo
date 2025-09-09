# Instagram Integration Guide

## Overview

This guide will help you integrate your Intaj chatbot with Instagram Direct Messages (DM). Instagram integration enables your chatbot to:

- Handle Instagram DM conversations
- Respond to story mentions
- Process media messages
- Support automated responses

## Prerequisites

1. Instagram Business Account
2. Facebook Business Account
3. Intaj Pro or Business subscription
4. SSL-enabled webhook endpoint

## Setup Steps

### 1. Instagram Account Setup

1. Convert to Instagram Business Account
2. Link to Facebook Page
3. Enable Instagram messaging in Facebook settings
4. Note down your:
   - Instagram Account ID
   - Access Token

### 2. Intaj Dashboard Configuration

1. Log in to [Intaj Dashboard](https://dashboard.intaj.io)
2. Navigate to Connections > Instagram
3. Click "Add Instagram Connection"
4. Enter your Instagram credentials:

   ```json
   {
     "instagramAccountId": "your_account_id",
     "accessToken": "your_access_token"
   }
   ```

### 3. Webhook Setup

Configure your webhook endpoint in Facebook App Dashboard:

1. Set Webhook URL:

   ```txt
   https://api.intaj.io/webhook/instagram/{your_bot_id}
   ```

2. Set verify token from Intaj dashboard
3. Subscribe to webhook events:
   - messages
   - message_reactions
   - mentions

## Integration Options

### 1. REST API

Send messages via API:

```javascript
const response = await fetch('https://api.intaj.io/api/instagram/send', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer your_api_key',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    recipientId: 'user_ig_id',
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
await intaj.instagram.send({
  recipientId: 'user_ig_id',
  type: 'text',
  content: 'Hello from Intaj!',
});

// Send media message
await intaj.instagram.send({
  recipientId: 'user_ig_id',
  type: 'image',
  content: {
    url: 'https://example.com/image.jpg',
    caption: 'Check this out!',
  },
});
```

## Message Types

### 1. Text Messages

```javascript
await intaj.instagram.send({
  recipientId: 'user_ig_id',
  type: 'text',
  content: 'Hello!',
});
```

### 2. Media Messages

```javascript
await intaj.instagram.send({
  recipientId: 'user_ig_id',
  type: 'image',
  content: {
    url: 'https://example.com/image.jpg',
    caption: 'Check this out!',
  },
});
```

### 3. Quick Replies

```javascript
await intaj.instagram.send({
  recipientId: 'user_ig_id',
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
   - Follow Instagram's messaging policies
   - Respect user privacy settings
   - Handle media messages appropriately

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
   - Verify account permissions
   - Check recipient privacy settings
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

1. Create test account
2. Verify webhook integration
3. Test all message types
4. Check error scenarios
5. Monitor delivery status

## Support

- Documentation: [docs.intaj.io](https://docs.intaj.io)
- Support: [support@intaj.io](mailto:support@intaj.io)
- Status: [status.intaj.io](https://status.intaj.io)
