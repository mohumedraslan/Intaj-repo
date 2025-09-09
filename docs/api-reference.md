# Intaj API Reference

## Authentication

### Getting Started

1. Sign up at [dashboard.intaj.io](https://dashboard.intaj.io)
2. Get your API key from the dashboard
3. Include the API key in all requests:

```http
Authorization: Bearer your_api_key_here
```

### Authentication Endpoints

#### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your_password"
}
```

#### Sign Up

```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your_password",
  "name": "User Name"
}
```

## Chat API Endpoints

### Send Message

```http
POST /api/chat
Content-Type: application/json

{
  "message": "Hello, how can I help?",
  "chatbotId": "bot_123",
  "platform": "website" // website, whatsapp, facebook, instagram
}
```

### Get Chat History

```http
GET /api/chat/history?chatbotId=bot_123&limit=50
```

## Chatbot Management

### Create Chatbot

```http
POST /api/chatbots
Content-Type: application/json

{
  "name": "Support Bot",
  "model": "gpt-4",
  "settings": {
    "temperature": 0.7,
    "maxTokens": 2000
  }
}
```

### Update Chatbot

```http
PUT /api/chatbots/{botId}
Content-Type: application/json

{
  "name": "New Name",
  "settings": {
    "temperature": 0.5
  }
}
```

## File Management

### Upload File

```http
POST /api/files/upload
Content-Type: multipart/form-data

file: [binary]
```

### List Files

```http
GET /api/files?limit=20&offset=0
```

## Analytics

### Get Usage Stats

```http
GET /api/analytics/usage
```

### Get Performance Metrics

```http
GET /api/analytics/performance
```

## Rate Limits

| Plan     | API Calls/min | Messages/day | Storage |
| -------- | ------------- | ------------ | ------- |
| Free     | 60            | 100          | 100 MB  |
| Pro      | 300           | 1,000        | 1 GB    |
| Business | 1,000         | 5,000        | 5 GB    |

### Rate Limit Headers

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1631924400
```

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Rate limit exceeded",
    "details": {
      "limit": 60,
      "reset": 1631924400
    }
  }
}
```

### Common Error Codes

- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `429`: Rate Limit Exceeded
- `500`: Internal Server Error
