# SDK Documentation

## Installation

```bash
npm install intaj-sdk
# or
yarn add intaj-sdk
```

## Quick Start

```javascript
import { Intaj } from 'intaj-sdk';

const intaj = new Intaj({
  apiKey: 'your_api_key'
});
```

## Core Features

### Chat

Send messages:

```javascript
const response = await intaj.chat.send({
  botId: 'bot_123',
  message: 'Hello!',
  platform: 'website'
});
```

Get chat history:

```javascript
const history = await intaj.chat.getHistory({
  botId: 'bot_123',
  limit: 50
});
```

### File Management

Upload file:

```javascript
const file = await intaj.files.upload({
  file: fileBuffer,
  filename: 'document.pdf'
});
```

Process file:

```javascript
const processed = await intaj.files.process({
  fileId: file.id,
  type: 'text_extraction'
});
```

### Analytics

Get usage stats:

```javascript
const stats = await intaj.analytics.getStats({
  startDate: '2025-09-01',
  endDate: '2025-09-07'
});
```

Get performance metrics:

```javascript
const metrics = await intaj.analytics.getMetrics({
  type: 'response_times'
});
```

## Error Handling

```javascript
try {
  await intaj.chat.send({ /* ... */ });
} catch (error) {
  if (error.code === 'rate_limit_exceeded') {
    // Handle rate limiting
    console.log(`Reset at: ${error.reset}`);
  } else if (error.code === 'invalid_request') {
    // Handle validation errors
    console.log(error.details);
  }
}
```

## TypeScript Support

```typescript
import { ChatMessage, ChatResponse } from 'intaj-sdk';

interface CustomMessage extends ChatMessage {
  customField: string;
}

const response: ChatResponse = await intaj.chat.send({
  message: customMessage
});
```

## Best Practices

1. **Error Handling**
   - Always wrap API calls in try-catch blocks
   - Check specific error codes
   - Implement retries for transient failures

2. **Rate Limiting**
   - Monitor rate limit headers
   - Implement backoff strategy
   - Cache responses when possible

3. **Authentication**
   - Store API keys securely
   - Rotate keys periodically
   - Use environment variables

4. **Performance**
   - Batch operations when possible
   - Implement request timeouts
   - Use streaming for large responses

5. **Security**
   - Validate user input
   - Sanitize responses
   - Use HTTPS endpoints
