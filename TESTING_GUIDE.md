# 🧪 Comprehensive Testing Guide - Intaj Platform

This guide provides complete testing procedures for the Intaj AI automation platform, covering database operations, API routes, Edge Functions, and end-to-end workflows.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Testing](#database-testing)
3. [API Routes Testing](#api-routes-testing)
4. [Edge Functions Testing](#edge-functions-testing)
5. [End-to-End Testing](#end-to-end-testing)
6. [Monitoring & Troubleshooting](#monitoring--troubleshooting)

## 🔧 Prerequisites

### Environment Variables
Set these environment variables before running tests:

```bash
# Supabase Configuration
export SUPABASE_PROJECT_REF="your-project-ref"
export SUPABASE_ANON_KEY="your-anon-key"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export SUPABASE_JWT_TOKEN="your-jwt-token"

# API Keys
export OPENROUTER_API_KEY="your-openrouter-key"
export TELEGRAM_BOT_TOKEN="your-bot-token"
export INTERNAL_ADMIN_KEY="your-admin-key"

# Application URLs
export BASE_URL="http://localhost:3000"  # or your deployed URL
```

### Required Tools
- Node.js 18+
- Supabase CLI
- PowerShell (Windows) or Bash (Linux/Mac)
- curl (for cross-platform testing)

## 🗄️ Database Testing

### 1. Run Database Schema Tests

Execute the comprehensive SQL test suite:

```sql
-- Run in Supabase SQL Editor or psql
\i test_database_operations.sql
```

**What it tests:**
- ✅ Agent creation and relationships
- ✅ Connection management
- ✅ Message storage and retrieval
- ✅ FAQ and data source operations
- ✅ RLS policies and security
- ✅ JSON operations and indexing
- ✅ Performance and query optimization

### 2. Manual Database Validation

```sql
-- Quick validation queries
SELECT 'agents' as table_name, count(*) FROM agents
UNION ALL
SELECT 'connections', count(*) FROM connections
UNION ALL
SELECT 'messages', count(*) FROM messages;

-- Test relationships
SELECT a.name, c.platform, c.status 
FROM agents a 
LEFT JOIN connections c ON a.id = c.agent_id 
LIMIT 5;
```

## 🌐 API Routes Testing

### Option 1: PowerShell Test Suite (Windows)

```powershell
# Run comprehensive API tests
.\test_complete_api_suite.ps1 -BaseUrl "http://localhost:3000" -Verbose

# With custom parameters
.\test_complete_api_suite.ps1 `
  -BaseUrl "https://your-app.com" `
  -AdminKey $env:INTERNAL_ADMIN_KEY `
  -JwtToken $env:SUPABASE_JWT_TOKEN `
  -BotToken $env:TELEGRAM_BOT_TOKEN `
  -Verbose
```

### Option 2: Curl Test Suite (Cross-Platform)

```bash
# Make executable and run
chmod +x test_api_curl.sh
./test_api_curl.sh
```

### Option 3: Node.js Test Suite

```bash
# Install dependencies and run
npm install
node test_api_endpoints.js
```

### Manual API Testing with curl

#### Create Agent
```bash
curl -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_JWT_TOKEN" \
  -d '{
    "name": "Test Support Agent",
    "base_prompt": "You are a helpful customer support assistant",
    "model": "gpt-4o",
    "integrations": {
      "telegramToken": "'$TELEGRAM_BOT_TOKEN'",
      "autoSetupWebhook": true,
      "baseUrl": "http://localhost:3000"
    }
  }'
```

#### Setup Telegram Webhook
```bash
curl -X POST http://localhost:3000/api/integrations/telegram/setupWebhook \
  -H "Content-Type: application/json" \
  -d '{
    "botToken": "'$TELEGRAM_BOT_TOKEN'",
    "baseUrl": "http://localhost:3000"
  }'
```

#### Test LLM Generation
```bash
curl -X POST http://localhost:3000/api/internal/llm-generate \
  -H "Content-Type: application/json" \
  -H "X-ADMIN-KEY: $INTERNAL_ADMIN_KEY" \
  -d '{
    "agentId": "your-agent-id",
    "messages": [
      {"role": "user", "content": "Hello, I need help with my order"}
    ]
  }'
```

#### Test Message Dispatch
```bash
curl -X POST http://localhost:3000/api/internal/dispatch \
  -H "X-ADMIN-KEY: $INTERNAL_ADMIN_KEY"
```

## ⚡ Edge Functions Testing

### 1. Deploy Edge Functions

```bash
# Deploy both functions
supabase functions deploy process-inbound --no-verify-jwt --debug
supabase functions deploy dispatch-outbound --no-verify-jwt --debug

# Verify deployment
supabase functions list
```

### 2. Run Edge Function Tests

```powershell
# PowerShell test suite
.\test_edge_functions.ps1 -Deploy -Verbose

# Manual invocation
supabase functions invoke process-inbound --no-verify-jwt
supabase functions invoke dispatch-outbound --no-verify-jwt
```

### 3. Monitor Function Logs

```bash
# Follow logs in real-time
supabase functions logs process-inbound --follow
supabase functions logs dispatch-outbound --follow

# Get recent logs
supabase functions logs process-inbound --limit 50
```

### 4. Configure Cron Scheduler

Create `supabase/functions/dispatch-outbound/cron.yaml`:

```yaml
# Run every 10 seconds
- name: "dispatch-outbound"
  schedule: "*/10 * * * * *"
  function: "dispatch-outbound"
```

## 🔄 End-to-End Testing

### 1. Complete Workflow Test

```bash
# 1. Create agent with Telegram integration
AGENT_RESPONSE=$(curl -s -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_JWT_TOKEN" \
  -d '{
    "name": "E2E Test Agent",
    "base_prompt": "You are a helpful assistant",
    "model": "gpt-4o",
    "integrations": {
      "telegramToken": "'$TELEGRAM_BOT_TOKEN'",
      "autoSetupWebhook": true,
      "baseUrl": "http://localhost:3000"
    }
  }')

# Extract agent ID
AGENT_ID=$(echo $AGENT_RESPONSE | jq -r '.agentId')
echo "Created agent: $AGENT_ID"

# 2. Send test message to Telegram bot
# (Use Telegram app to send message to your bot)

# 3. Check message was received
curl -s "http://localhost:3000/api/agents" \
  -H "Authorization: Bearer $SUPABASE_JWT_TOKEN" | jq

# 4. Trigger processing
supabase functions invoke process-inbound --no-verify-jwt

# 5. Trigger dispatch
supabase functions invoke dispatch-outbound --no-verify-jwt
```

### 2. Telegram Bot Testing

1. **Send Message**: Send a message to your Telegram bot
2. **Check Webhook**: Verify webhook receives the message
3. **Check Database**: Confirm message is stored in database
4. **Check Processing**: Verify LLM processes the message
5. **Check Response**: Confirm bot responds appropriately

### 3. Performance Testing

```bash
# Load test with multiple concurrent requests
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/agents \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $SUPABASE_JWT_TOKEN" \
    -d '{
      "name": "Load Test Agent '$i'",
      "base_prompt": "You are agent number '$i'",
      "model": "gpt-4o"
    }' &
done
wait
```

## 📊 Monitoring & Troubleshooting

### 1. Health Checks

```bash
# Application health
curl http://localhost:3000/api/example

# Database connectivity
supabase db ping

# Edge functions status
supabase functions list
```

### 2. Common Issues & Solutions

#### Authentication Errors
```bash
# Check JWT token validity
curl -H "Authorization: Bearer $SUPABASE_JWT_TOKEN" \
  http://localhost:3000/api/agents

# Regenerate token if needed
supabase auth login
```

#### Database Connection Issues
```bash
# Reset database
supabase db reset

# Check migrations
supabase db push
```

#### Edge Function Errors
```bash
# Check function logs
supabase functions logs process-inbound --limit 100

# Redeploy functions
supabase functions deploy --no-verify-jwt
```

#### Telegram Webhook Issues
```bash
# Check webhook status
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo"

# Reset webhook
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/deleteWebhook"
```

### 3. Monitoring Dashboard

Set up monitoring for:
- API response times
- Database query performance
- Edge function execution frequency
- Error rates and types
- Message processing latency

### 4. Logging Best Practices

```typescript
// Add structured logging to your functions
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  level: 'INFO',
  service: 'process-inbound',
  agentId: agentId,
  messageId: messageId,
  action: 'processing_message',
  duration: processingTime
}));
```

## 🎯 Test Checklist

### Database Tests
- [ ] Agent CRUD operations
- [ ] Connection management
- [ ] Message storage/retrieval
- [ ] RLS policies working
- [ ] Foreign key constraints
- [ ] JSON operations
- [ ] Performance queries

### API Tests
- [ ] Authentication working
- [ ] Agent creation/listing
- [ ] Telegram integration
- [ ] Webhook setup
- [ ] LLM generation
- [ ] Message dispatch
- [ ] Error handling
- [ ] Rate limiting

### Edge Function Tests
- [ ] Functions deploy successfully
- [ ] process-inbound works
- [ ] dispatch-outbound works
- [ ] Cron scheduler configured
- [ ] Error handling robust
- [ ] Logging comprehensive

### End-to-End Tests
- [ ] Complete message flow
- [ ] Telegram bot responds
- [ ] Database updates correctly
- [ ] Performance acceptable
- [ ] Error recovery works

## 🚀 Deployment Testing

### Staging Environment
```bash
# Test against staging
export BASE_URL="https://staging.your-app.com"
./test_complete_api_suite.ps1 -BaseUrl $BASE_URL
```

### Production Environment
```bash
# Test against production (read-only tests)
export BASE_URL="https://your-app.com"
./test_api_curl.sh  # Run only safe tests
```

## 📈 Performance Benchmarks

Target performance metrics:
- API response time: < 200ms
- Database queries: < 50ms
- LLM generation: < 3s
- Message processing: < 5s
- Webhook response: < 1s

## 🔄 Continuous Testing

Set up automated testing in CI/CD:

```yaml
# .github/workflows/test.yml
name: API Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run API Tests
        run: ./test_api_curl.sh
        env:
          BASE_URL: ${{ secrets.STAGING_URL }}
          SUPABASE_JWT_TOKEN: ${{ secrets.JWT_TOKEN }}
```

---

## 📞 Support

If you encounter issues:
1. Check the logs first
2. Verify environment variables
3. Test individual components
4. Review the troubleshooting section
5. Check database connectivity

**Happy Testing! 🎉**
