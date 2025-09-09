# WhatsApp Integration Guide

## Overview

This guide will help you integrate your Intaj chatbot with WhatsApp Business API. WhatsApp integration enables your chatbot to:

- Receive and respond to customer messages
- Send proactive notifications
- Handle media messages
- Support rich message templates

## Prerequisites

1. WhatsApp Business Account
2. WhatsApp Business API access
3. Intaj Pro or Business subscription
4. SSL-enabled webhook endpoint

## Setup Steps

### 1. WhatsApp Business API Setup

1. Visit [Facebook Business Manager](https://business.facebook.com)
2. Create a WhatsApp Business Account
3. Request WhatsApp Business API access
4. Note down your:
   - Business Account ID
   - Phone Number ID
   - Access Token

### 2. Intaj Dashboard Configuration

1. Log in to [Intaj Dashboard](https://dashboard.intaj.io)
2. Navigate to Connections > WhatsApp
3. Click "Add WhatsApp Connection"
4. Enter your WhatsApp credentials:

   ```json
   {
     "businessAccountId": "your_account_id",
     "phoneNumberId": "your_phone_number_id",
     "accessToken": "your_access_token"
   }
   ```

### 3. Webhook Setup

Configure your webhook endpoint in the WhatsApp Business Manager:

1. Set Webhook URL:

   ```txt
   https://api.intaj.io/webhook/whatsapp/{your_bot_id}
   ```

2. Subscribe to webhook events:
   - messages
   - message_status
   - notifications

### 4. Message Templates

1. Create message templates in WhatsApp Business Manager
2. Sync templates to Intaj:

   ```http
   POST /api/whatsapp/sync-templates
   Authorization: Bearer your_api_key
   ```

## Integration Options

### 1. REST API

Send messages via API:

```javascript
const response = await fetch('https://api.intaj.io/api/whatsapp/send', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your_api_key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    to: 'recipient_phone_number',
    type: 'text',
    content: 'Hello from Intaj!'
  })
});
```

### 2. SDK Integration

Using Intaj SDK:

```javascript
import { Intaj } from 'intaj-sdk';

const intaj = new Intaj({ apiKey: 'your_api_key' });

// Send text message
await intaj.whatsapp.send({
  to: 'recipient_phone_number',
  type: 'text',
  content: 'Hello from Intaj!'
});

// Send template message
await intaj.whatsapp.sendTemplate({
  to: 'recipient_phone_number',
  template: {
    name: 'appointment_reminder',
    language: 'en',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: 'John' },
          { type: 'text', text: '2:30 PM' }
        ]
      }
    ]
  }
});
```

## Message Types

### 1. Text Messages

```javascript
await intaj.whatsapp.send({
  to: 'phone_number',
  type: 'text',
  content: 'Hello!'
});
```

### 2. Media Messages

```javascript
await intaj.whatsapp.send({
  to: 'phone_number',
  type: 'image',
  content: {
    url: 'https://example.com/image.jpg',
    caption: 'Check this out!'
  }
});
```

### 3. Template Messages

```javascript
await intaj.whatsapp.sendTemplate({
  to: 'phone_number',
  template: {
    name: 'order_update',
    language: 'en',
    components: [/* ... */]
  }
});
```

## Best Practices

1. **Message Windows**
   - Respect 24-hour messaging window
   - Use templates for proactive messages
   - Keep track of conversation expiry

2. **Rate Limiting**
   - Monitor rate limit headers
   - Implement exponential backoff
   - Cache frequently used resources

3. **Error Handling**
   - Implement retry logic
   - Log message status updates
   - Monitor delivery reports

4. **Security**
   - Store credentials securely
   - Validate webhook signatures
   - Use environment variables

## Troubleshooting

### Common Issues

1. **Message Not Delivered**
   - Check phone number format
   - Verify 24-hour window
   - Review message template status

2. **Webhook Not Receiving**
   - Verify SSL certificate
   - Check webhook URL
   - Review event subscriptions

3. **Rate Limits**
   - Monitor usage dashboard
   - Implement queuing
   - Optimize batch operations

## Testing

1. Use test phone numbers
2. Verify webhook integration
3. Test all message types
4. Monitor delivery status
5. Check error scenarios

## Support

- Documentation: [docs.intaj.io](https://docs.intaj.io)
- Support: [support@intaj.io](mailto:support@intaj.io)
- Status: [status.intaj.io](https://status.intaj.io)
