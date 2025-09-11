# Intaj AI Public API Reference

Welcome to the Intaj AI Public API! This guide will help you get started with programmatically interacting with your AI Agents.

## Authentication

All API requests must be authenticated with an API key. You can generate and manage your API keys in your **Profile Settings > API Keys**.

Your API key must be included in the `Authorization` header as a Bearer token.

**Example Header:**
```
Authorization: Bearer sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Endpoints

### Chat with an Agent

This endpoint allows you to send a message to one of your agents and receive a response.

- **URL:** `/api/v1/chat`
- **Method:** `POST`
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer YOUR_API_KEY`

**Request Body:**

```json
{
  "agentId": "YOUR_AGENT_ID",
  "message": "Hello, what services do you offer?"
}
```

- `agentId` (string, required): The unique ID of the agent you want to chat with. You can find this ID in the URL when you are editing your agent in the dashboard.
- `message` (string, required): The message from the user.

**Success Response (200 OK):**

```json
{
  "reply": "We offer a wide range of AI automation services, including intelligent chatbots, sales automation, and seamless integrations with platforms like Slack and Telegram."
}
```

**Error Responses:**

- `400 Bad Request`: Missing `agentId` or `message` in the request body.
- `401 Unauthorized`: Missing or invalid API key.
- `404 Not Found`: The specified `agentId` does not exist or you do not have permission to access it.
- `500 Internal Server Error`: An unexpected error occurred on our end.

---

## Code Examples

### cURL

```bash
curl -X POST https://intaj.nabih.tech/api/v1/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
        "agentId": "YOUR_AGENT_ID",
        "message": "Tell me about your pricing."
      }'
```

### JavaScript (fetch)

```javascript
const agentId = 'YOUR_AGENT_ID';
const apiKey = 'YOUR_API_KEY';
const userMessage = 'What is your refund policy?';

fetch('https://intaj.nabih.tech/api/v1/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  },
  body: JSON.stringify({
    agentId: agentId,
    message: userMessage
  })
})
.then(response => response.json())
.then(data => {
  console.log('AI Reply:', data.reply);
})
.catch(error => {
  console.error('Error:', error);
});
```
