# Integration Guides

## WhatsApp Integration

### Prerequisites

1. WhatsApp Business Account
2. Meta Developer Account
3. Intaj API Key

### Setup Steps

1. Create Meta App:
   - Go to [Meta Developers](https://developers.facebook.com)
   - Create new app
   - Add WhatsApp product
   - Get API credentials

2. Connect to Intaj:

   ```javascript
   const intaj = require('intaj');

   intaj.connect({
     platform: 'whatsapp',
     credentials: {
       apiKey: 'your_meta_api_key',
       phoneNumberId: 'your_phone_number_id',
       accessToken: 'your_access_token',
     },
   });
   ```

3. Handle Messages:
   ```javascript
   intaj.on('whatsapp:message', async message => {
     const response = await intaj.chat.send({
       to: message.from,
       message: 'Thanks for your message!',
     });
   });
   ```

## Facebook Messenger Integration

### Prerequisites

1. Facebook Page
2. Meta Developer Account
3. Intaj API Key

### Setup Steps

1. Configure Facebook App:
   - Create app in Meta Developers
   - Add Messenger product
   - Link Facebook page
   - Get page access token

2. Connect to Intaj:

   ```javascript
   intaj.connect({
     platform: 'facebook',
     credentials: {
       pageId: 'your_page_id',
       accessToken: 'your_page_access_token',
     },
   });
   ```

3. Handle Messages:
   ```javascript
   intaj.on('facebook:message', async message => {
     await intaj.chat.send({
       to: message.senderId,
       message: 'Hello from Facebook!',
     });
   });
   ```

## Instagram Integration

### Prerequisites

1. Instagram Business Account
2. Facebook Page (connected to Instagram)
3. Intaj API Key

### Setup Steps

1. Link Instagram to Facebook:
   - Connect Instagram to Facebook Page
   - Enable Instagram messaging in Meta app
   - Get Instagram account ID

2. Connect to Intaj:

   ```javascript
   intaj.connect({
     platform: 'instagram',
     credentials: {
       accountId: 'your_instagram_account_id',
       accessToken: 'your_access_token',
     },
   });
   ```

3. Handle Messages:
   ```javascript
   intaj.on('instagram:message', async message => {
     await intaj.chat.send({
       to: message.from,
       message: 'Thanks for reaching out on Instagram!',
     });
   });
   ```

## Website Widget Integration

### Basic Integration

Add this script to your HTML:

```html
<script src="https://cdn.intaj.io/widget.js"></script>
<script>
  IntajWidget.init({
    apiKey: 'your_api_key',
    botId: 'your_bot_id',
  });
</script>
```

### Customization

```javascript
IntajWidget.init({
  apiKey: 'your_api_key',
  botId: 'your_bot_id',
  theme: {
    primaryColor: '#2563eb',
    fontFamily: 'Inter',
    borderRadius: '8px',
  },
  position: 'bottom-right',
  welcomeMessage: 'How can I help you today?',
  headerText: 'Chat with us',
});
```

### Events

```javascript
IntajWidget.on('ready', () => {
  console.log('Widget ready');
});

IntajWidget.on('message', message => {
  console.log('New message:', message);
});

IntajWidget.on('error', error => {
  console.error('Widget error:', error);
});
```
