# 🎯 Complete User Flow Setup - Intaj Platform

## 🚀 Business Owner → Customer Support Agent → Telegram Bot Flow

This document outlines the complete end-to-end flow you requested: **Business owner creates customer support agent → connects Telegram bot → agent responds using OpenRouter**.

---

## ✅ What's Been Implemented

### 1. **Agent Creation UI** ✅
- **Location**: `/dashboard/agents/new`
- **Features**: 
  - Multi-step wizard for agent creation
  - Customer support agent type with pre-built prompt
  - Telegram integration with bot token input
  - Automatic webhook setup option

### 2. **Backend API Routes** ✅
- **`/api/agents`**: Unified agent + integration creation
- **`/api/integrations/telegram/setupWebhook`**: Automatic webhook configuration
- **`/api/webhooks/telegram/[agentId]`**: Receives Telegram messages
- **`/api/internal/llm-generate`**: LLM processing with OpenRouter

### 3. **Edge Functions** ✅
- **`process-inbound`**: Processes incoming messages and generates AI responses
- **`dispatch-outbound`**: Sends AI responses back to Telegram
- **Scheduling**: Configured to run every 10-30 seconds

### 4. **Database Schema** ✅
- **Unified schema**: `agents`, `connections`, `conversations`, `messages`
- **RLS policies**: Proper security and user isolation
- **Relationships**: All foreign keys and indexes in place

### 5. **LLM Integration** ✅
- **OpenRouter**: GPT-4o integration for high-quality responses
- **RAG Support**: Knowledge base integration ready
- **Conversation Context**: Maintains chat history

---

## 🔧 Environment Setup

### Required Environment Variables

Add these to your `.env.local` file:

```env
# Supabase (from: supabase status)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMAs_-snpY
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Db8dnGiqZqsNONcQ

# OpenRouter (GET YOUR KEY FROM: https://openrouter.ai/)
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Internal API Security
INTERNAL_ADMIN_KEY=intaj_admin_key_2024_secure

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
LLM_GENERATE_URL=http://localhost:3000/api/internal/llm-generate
```

### Get Your OpenRouter API Key
1. Go to [https://openrouter.ai/](https://openrouter.ai/)
2. Sign up for an account
3. Navigate to API Keys section
4. Create a new API key
5. Add credits to your account (minimum $5 recommended)

---

## 🎯 Complete User Flow

### Step 1: Business Owner Creates Agent
1. **Navigate to**: `http://localhost:3000/dashboard/agents/new`
2. **Select**: "Customer Support" agent type
3. **Fill in**:
   - Agent name: "Customer Support Bot"
   - Description: "AI-powered customer support"
   - System prompt: (pre-filled with customer support template)
4. **Configure Telegram**:
   - Select Telegram integration
   - Enter bot token from @BotFather
   - Enable automatic webhook setup

### Step 2: Agent Creation & Webhook Setup
1. **API Call**: `POST /api/agents` creates agent + connection
2. **Webhook Setup**: Automatically configures Telegram webhook
3. **Database**: Stores agent, connection, and webhook URL
4. **Redirect**: User forwarded to agent dashboard

### Step 3: Customer Sends Message
1. **Customer**: Sends message to Telegram bot
2. **Webhook**: `POST /api/webhooks/telegram/[agentId]` receives message
3. **Database**: Message stored with `status: 'received'`

### Step 4: AI Processing (Automated)
1. **Edge Function**: `process-inbound` runs every 30 seconds
2. **LLM Call**: Generates response using OpenRouter + GPT-4o
3. **Database**: Stores AI response with `status: 'queued'`

### Step 5: Response Delivery (Automated)
1. **Edge Function**: `dispatch-outbound` runs every 10 seconds
2. **Telegram API**: Sends response to customer
3. **Database**: Updates message `status: 'sent'`

---

## 🧪 Testing the Complete Flow

### Option 1: Automated Test Script
```powershell
# Set environment variables first
$env:SUPABASE_JWT_TOKEN = "your-jwt-token"
$env:TELEGRAM_BOT_TOKEN = "your-bot-token"
$env:OPENROUTER_API_KEY = "your-openrouter-key"

# Run complete flow test
.\test_complete_flow.ps1
```

### Option 2: Manual Testing
1. **Create Agent**: Use the UI at `/dashboard/agents/new`
2. **Get Bot Token**: Create bot with @BotFather on Telegram
3. **Test Message**: Send message to your bot
4. **Check Logs**: Monitor Edge Function logs
5. **Verify Response**: Bot should respond within 30-60 seconds

### Option 3: API Testing
```bash
# Test agent creation
curl -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_JWT_TOKEN" \
  -d '{
    "name": "Test Support Agent",
    "base_prompt": "You are a helpful customer support assistant",
    "model": "gpt-4o",
    "agent_type": "customer_support",
    "integrations": {
      "telegramToken": "'$TELEGRAM_BOT_TOKEN'",
      "autoSetupWebhook": true,
      "baseUrl": "http://localhost:3000"
    }
  }'
```

---

## 📊 Monitoring & Debugging

### Check Edge Function Logs
```bash
# Monitor inbound processing
supabase functions logs process-inbound --follow

# Monitor outbound dispatch
supabase functions logs dispatch-outbound --follow
```

### Database Queries
```sql
-- Check recent messages
SELECT * FROM messages ORDER BY created_at DESC LIMIT 10;

-- Check agent connections
SELECT a.name, c.platform, c.status 
FROM agents a 
JOIN connections c ON a.id = c.agent_id;

-- Check message processing status
SELECT direction, status, COUNT(*) 
FROM messages 
GROUP BY direction, status;
```

### Manual Function Triggers
```bash
# Manually trigger processing
supabase functions invoke process-inbound --no-verify-jwt
supabase functions invoke dispatch-outbound --no-verify-jwt
```

---

## 🎉 Success Indicators

### ✅ Agent Creation Success
- Agent appears in `/dashboard/agents`
- Telegram connection shows "active" status
- Webhook URL configured in Telegram

### ✅ Message Processing Success
- Customer message appears in database with `status: 'received'`
- AI response generated with `status: 'queued'`
- Response sent to Telegram with `status: 'sent'`

### ✅ End-to-End Success
- Customer receives AI response within 60 seconds
- Conversation history maintained
- Agent dashboard shows activity

---

## 🔧 Troubleshooting

### Common Issues

#### 1. "Agent not found" Error
- **Cause**: JWT token invalid or expired
- **Fix**: Get fresh token from Supabase auth

#### 2. "Webhook setup failed" Error
- **Cause**: Bot token invalid or webhook URL unreachable
- **Fix**: Verify bot token with @BotFather, ensure dev server running

#### 3. "No response from bot" Issue
- **Cause**: Edge Functions not deployed or OpenRouter key invalid
- **Fix**: Deploy functions, verify OpenRouter key and credits

#### 4. Database Connection Issues
- **Cause**: Supabase not running or RLS policies blocking access
- **Fix**: Run `supabase start`, check RLS policies

### Debug Commands
```bash
# Check Supabase status
supabase status

# Reset database
supabase db reset

# Deploy functions
supabase functions deploy process-inbound --no-verify-jwt
supabase functions deploy dispatch-outbound --no-verify-jwt
```

---

## 🚀 Ready to Test!

Your complete customer support agent flow is now ready. The system will:

1. ✅ **Accept** agent creation from business owners
2. ✅ **Connect** to Telegram automatically
3. ✅ **Process** customer messages with AI
4. ✅ **Respond** using OpenRouter + GPT-4o
5. ✅ **Track** everything in the dashboard

**Next Step**: Run the test script or create an agent through the UI!

```powershell
.\test_complete_flow.ps1
```

🎯 **Your Intaj platform is ready for business owners to create AI customer support agents!**
