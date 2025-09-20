# 🚀 Intaj Platform - Developer Onboarding Guide

Welcome to the Intaj development team! This comprehensive guide will get you up and running with our AI automation platform.

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Development Environment Setup](#development-environment-setup)
4. [Architecture Overview](#architecture-overview)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [Frontend Components](#frontend-components)
8. [Edge Functions](#edge-functions)
9. [LLM Message Processing Loop](#llm-message-processing-loop)
10. [Testing](#testing)
11. [Deployment](#deployment)
12. [Common Tasks](#common-tasks)
13. [Troubleshooting](#troubleshooting)

---

## 🎯 Project Overview

**Intaj** is a unified AI automation platform for modern businesses that enables:
- Multi-channel AI chatbot creation and management
- Automated message processing with LLM integration
- Real-time analytics and performance monitoring
- Workflow automation with conditional logic
- Multi-platform integrations (Telegram, WhatsApp, Website)

### Target Market
- **Primary**: Small to Medium Businesses (SMBs)
- **Secondary**: Agencies managing multiple clients
- **Future**: Enterprise customers

### Business Model
- Subscription-based SaaS platform
- Tiered pricing based on usage and features
- Stripe integration for payment processing

---

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI
- **State Management**: React hooks + Context
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime subscriptions

### Backend
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **API**: Next.js API Routes
- **Edge Functions**: Supabase Edge Functions (Deno)
- **File Storage**: Supabase Storage
- **Real-time**: Supabase Realtime

### External Services
- **LLM Provider**: OpenRouter (GPT-4, Claude, etc.)
- **Payments**: Stripe
- **Messaging**: Telegram Bot API, WhatsApp Business API
- **Deployment**: Vercel (Frontend), Supabase (Backend)

### Development Tools
- **Language**: TypeScript
- **Package Manager**: npm
- **Database Migrations**: Supabase CLI
- **Version Control**: Git
- **Code Quality**: ESLint, Prettier

---

## 🔧 Development Environment Setup

### Prerequisites
1. **Node.js** (v18 or higher)
2. **Docker Desktop** (for local Supabase)
3. **Git**
4. **VS Code** (recommended)

### Step 1: Clone Repository
```bash
git clone https://github.com/your-org/intaj-repo.git
cd intaj-repo
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Environment Variables
Create `.env.local` file:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenRouter (LLM Provider)
OPENROUTER_API_KEY=your_openrouter_key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Internal API Security
INTERNAL_ADMIN_KEY=your_secret_admin_key

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
LLM_GENERATE_URL=http://localhost:3000/api/internal/llm-generate
```

### Step 4: Start Supabase Locally
```bash
# Install Supabase CLI
npm install -g @supabase/cli

# Start local Supabase instance
supabase start

# Get local credentials
supabase status
```

### Step 5: Run Development Server
```bash
npm run dev
```

### Step 6: Deploy Edge Functions (for full functionality)
```bash
supabase functions deploy process-inbound --no-verify-jwt
supabase functions deploy dispatch-outbound --no-verify-jwt
```

---

## 🏗 Architecture Overview

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Routes    │    │   Database      │
│   (Next.js)     │◄──►│   (Next.js)     │◄──►│   (Supabase)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         │              │  Edge Functions │              │
         └──────────────►│   (Supabase)    │◄─────────────┘
                        └─────────────────┘
                                 │
                        ┌─────────────────┐
                        │  External APIs  │
                        │ (OpenRouter,    │
                        │  Telegram, etc) │
                        └─────────────────┘
```

### Directory Structure
```
intaj-repo/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   ├── dashboard/         # Dashboard pages
│   │   ├── agents/           # Agent management
│   │   └── auth/             # Authentication pages
│   ├── components/           # React components
│   │   ├── ui/              # Shadcn UI components
│   │   ├── dashboard/       # Dashboard components
│   │   └── agents/          # Agent-specific components
│   ├── lib/                 # Utility libraries
│   │   ├── supabase/       # Supabase client
│   │   ├── ai/             # LLM integration
│   │   └── utils/          # Helper functions
│   └── types/              # TypeScript type definitions
├── supabase/
│   ├── functions/          # Edge Functions
│   ├── migrations/         # Database migrations
│   └── config.toml        # Supabase configuration
├── public/                # Static assets
└── docs/                 # Documentation
```

---

## 🗄 Database Schema

### Core Tables

#### `profiles`
User profile information extending Supabase auth.users
```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    name TEXT,
    email TEXT NOT NULL,
    subscription TEXT DEFAULT 'free',
    stripe_customer_id TEXT,
    onboarding_steps JSONB DEFAULT '{}',
    role TEXT DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `agents`
AI agents created by users
```sql
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    base_prompt TEXT,
    model TEXT DEFAULT 'gpt-4o',
    agent_type TEXT,
    avatar_url TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `connections`
Platform integrations for agents
```sql
CREATE TABLE connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    platform TEXT NOT NULL, -- 'telegram', 'whatsapp', etc.
    name TEXT,
    config JSONB DEFAULT '{}', -- platform-specific config
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `conversations`
Chat conversations between users and agents
```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    connection_id UUID REFERENCES connections(id) ON DELETE CASCADE,
    chat_id TEXT, -- platform-specific chat identifier
    channel TEXT, -- 'telegram', 'whatsapp', etc.
    status TEXT DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    first_message_at TIMESTAMPTZ,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `messages`
Individual messages in conversations
```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    connection_id UUID REFERENCES connections(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    
    -- Message content
    channel TEXT, -- 'telegram', 'whatsapp', etc.
    direction TEXT CHECK (direction IN ('inbound', 'outbound')),
    role TEXT CHECK (role IN ('user', 'agent', 'system')),
    content_text TEXT,
    attachments JSONB DEFAULT '[]',
    
    -- Status and metadata
    status TEXT DEFAULT 'received', -- 'received', 'processing', 'queued', 'sent', 'failed'
    metadata JSONB DEFAULT '{}',
    chat_id TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    sent_at TIMESTAMPTZ
);
```

### Indexes for Performance
```sql
-- Messages table indexes
CREATE INDEX idx_messages_agent_status ON messages(agent_id, status, created_at DESC);
CREATE INDEX idx_messages_conversation_direction ON messages(conversation_id, direction, created_at DESC);
CREATE INDEX idx_messages_direction_status ON messages(direction, status);

-- Conversations table indexes
CREATE INDEX idx_conversations_agent_status ON conversations(agent_id, status, last_message_at DESC);
CREATE INDEX idx_conversations_channel_chat ON conversations(channel, chat_id);
```

---

## 🔌 API Endpoints

### Authentication
All API routes require authentication via Supabase JWT token in Authorization header:
```
Authorization: Bearer <jwt_token>
```

### Core API Routes

#### `POST /api/agents`
Create a new agent with integrations
```typescript
// Request
{
  name: string;
  base_prompt: string;
  model: string;
  agent_type?: string;
  description?: string;
  integrations?: {
    telegramToken?: string;
    autoSetupWebhook?: boolean;
    baseUrl?: string;
  };
}

// Response
{
  agentId: string;
  connectionId?: string;
  webhook?: {
    success: boolean;
    webhookUrl?: string;
    error?: string;
  };
}
```

#### `GET /api/agents`
Get user's agents with their connections
```typescript
// Response
{
  agents: Array<{
    id: string;
    name: string;
    description: string;
    model: string;
    agent_type: string;
    created_at: string;
    connections: Array<{
      id: string;
      platform: string;
      status: string;
      name: string;
    }>;
  }>;
}
```

#### `POST /api/integrations/telegram/setupWebhook`
Setup Telegram webhook for a bot
```typescript
// Request
{
  botToken: string;
  baseUrl: string;
}

// Response
{
  success: boolean;
  webhookUrl: string;
  telegramResponse: object;
}
```

#### `POST /api/webhooks/telegram`
Telegram webhook endpoint (receives messages)
```typescript
// Telegram sends updates here
// Automatically processes and stores inbound messages
```

#### `POST /api/internal/llm-generate`
Internal LLM processing endpoint (requires INTERNAL_ADMIN_KEY)
```typescript
// Request
{
  agentId: string;
  messages: Array<{
    role: 'user' | 'agent' | 'system';
    content: string;
  }>;
}

// Response
{
  text: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
```

---

## 🎨 Frontend Components

### Key Component Structure

#### Dashboard Layout
- `src/app/dashboard/layout.tsx` - Main dashboard layout
- `src/components/dashboard/Sidebar.tsx` - Navigation sidebar
- `src/components/dashboard/Header.tsx` - Top header with user menu

#### Agent Management
- `src/app/dashboard/agents/page.tsx` - Agents list page
- `src/app/dashboard/agents/new/page.tsx` - Agent creation wizard
- `src/app/dashboard/agents/[id]/page.tsx` - Agent details/settings

#### UI Components (Shadcn)
- `src/components/ui/` - Reusable UI components
- `src/components/ui/button.tsx` - Button component
- `src/components/ui/card.tsx` - Card component
- `src/components/ui/input.tsx` - Input component

### State Management Patterns

#### Supabase Real-time Hook
```typescript
// src/lib/hooks/useDashboardData.ts
export function useDashboardData() {
  const [agents, setAgents] = useState([]);
  const [messages, setMessages] = useState([]);
  
  useEffect(() => {
    // Subscribe to real-time changes
    const subscription = supabase
      .channel('dashboard')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'agents'
      }, handleAgentChange)
      .subscribe();
      
    return () => subscription.unsubscribe();
  }, []);
  
  return { agents, messages };
}
```

#### Authentication Context
```typescript
// src/lib/contexts/AuthContext.tsx
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Handle auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );
    
    return () => subscription.unsubscribe();
  }, []);
  
  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
```

---

## ⚡ Edge Functions

Edge Functions run on Supabase's global edge network and handle automated message processing.

### `process-inbound`
Processes incoming messages and generates LLM responses
```typescript
// supabase/functions/process-inbound/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  try {
    // 1. Fetch unprocessed inbound messages
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('direction', 'inbound')
      .eq('status', 'received')
      .limit(10);

    for (const message of messages) {
      // 2. Get agent and conversation context
      const agent = await getAgent(message.agent_id);
      const history = await getConversationHistory(message.conversation_id);
      
      // 3. Generate LLM response
      const response = await generateLLMResponse(agent, history, message);
      
      // 4. Queue outbound message
      await queueOutboundMessage(message, response);
      
      // 5. Update message status
      await updateMessageStatus(message.id, 'processed');
    }
    
    return new Response(JSON.stringify({ processed: messages.length }));
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500
    });
  }
});
```

### `dispatch-outbound`
Sends queued outbound messages to platforms
```typescript
// supabase/functions/dispatch-outbound/index.ts
serve(async (req) => {
  try {
    // 1. Fetch queued outbound messages
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('direction', 'outbound')
      .eq('status', 'queued')
      .limit(25);

    for (const message of messages) {
      try {
        // 2. Send via appropriate platform
        if (message.channel === 'telegram') {
          await sendTelegramMessage(message);
        } else if (message.channel === 'whatsapp') {
          await sendWhatsAppMessage(message);
        }
        
        // 3. Update status to sent
        await updateMessageStatus(message.id, 'sent');
      } catch (error) {
        // 4. Mark as failed
        await updateMessageStatus(message.id, 'failed');
      }
    }
    
    return new Response(JSON.stringify({ sent: messages.length }));
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500
    });
  }
});
```

### Scheduling Edge Functions
Configure in Supabase Dashboard → Edge Functions → Cron Jobs:
- `process-inbound`: `*/30 * * * * *` (every 30 seconds)
- `dispatch-outbound`: `*/10 * * * * *` (every 10 seconds)

---

## 🔄 LLM Message Processing Loop

The automated message processing follows this flow:

### 1. Inbound Message Reception
```
Telegram/WhatsApp → Webhook → API Route → Database (messages table)
```

### 2. Message Processing
```
Edge Function (process-inbound) → Fetch unprocessed → Generate LLM response → Queue outbound
```

### 3. Message Dispatch
```
Edge Function (dispatch-outbound) → Fetch queued → Send to platform → Update status
```

### Flow Diagram
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Telegram  │    │   Webhook   │    │  Database   │    │ process-    │
│   Message   │───►│   Receives  │───►│   Stores    │───►│ inbound     │
│             │    │             │    │  (inbound)  │    │ Function    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                                   │
┌─────────────┐    ┌─────────────┐    ┌─────────────┐              │
│  Telegram   │    │ dispatch-   │    │  Database   │              │
│  Receives   │◄───│ outbound    │◄───│   Stores    │◄─────────────┘
│  Response   │    │ Function    │    │ (outbound)  │
└─────────────┘    └─────────────┘    └─────────────┘
```

### Key Functions

#### LLM Integration
```typescript
// src/lib/ai/llm.ts
export async function generateResponse(
  agent: Agent,
  messages: Message[],
  userMessage: string
): Promise<string> {
  const prompt = buildPrompt(agent.base_prompt, messages, userMessage);
  
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: agent.model,
      messages: prompt,
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });
  
  const data = await response.json();
  return data.choices[0].message.content;
}
```

#### Platform Adapters
```typescript
// src/lib/messaging/telegram.ts
export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string
): Promise<void> {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
    }),
  });
}
```

---

## 🧪 Testing

### Test Files Structure
```
├── test_agent_creation.ps1      # Test agent creation API
├── test_api_routes.ps1          # Test all API endpoints
├── test_edge_functions.ps1      # Test Edge Functions
├── test_complete_flow.ps1       # End-to-end flow test
└── test_database_operations.sql # Database operations test
```

### Running Tests

#### API Testing
```bash
# Test agent creation
.\test_agent_creation.ps1

# Test all API routes
.\test_api_routes.ps1
```

#### Database Testing
```sql
-- Run in Supabase SQL Editor
-- Copy contents from test_database_operations.sql
```

#### End-to-End Testing
```bash
# Test complete message flow
.\test_complete_flow.ps1
```

### Manual Testing Checklist
- [ ] User registration and authentication
- [ ] Agent creation through UI wizard
- [ ] Telegram bot integration setup
- [ ] Message sending and receiving
- [ ] LLM response generation
- [ ] Real-time dashboard updates
- [ ] Analytics and metrics display

---

## 🚀 Deployment

### Frontend Deployment (Vercel)
```bash
# Connect to Vercel
vercel login
vercel link

# Deploy
vercel --prod
```

### Environment Variables (Production)
Set in Vercel dashboard:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENROUTER_API_KEY=your_openrouter_key
STRIPE_SECRET_KEY=sk_live_...
INTERNAL_ADMIN_KEY=your_production_admin_key
```

### Database Deployment (Supabase)
```bash
# Link to production project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push

# Deploy Edge Functions
supabase functions deploy process-inbound --no-verify-jwt
supabase functions deploy dispatch-outbound --no-verify-jwt
```

### Post-Deployment Setup
1. Configure cron jobs in Supabase Dashboard
2. Set up Stripe webhooks
3. Configure domain and SSL
4. Set up monitoring and alerts

---

## 📝 Common Tasks

### Adding a New Integration Platform

#### 1. Create Platform Adapter
```typescript
// src/lib/messaging/newPlatform.ts
export class NewPlatformAdapter {
  async sendMessage(config: any, chatId: string, text: string) {
    // Implementation
  }
  
  async setupWebhook(config: any, webhookUrl: string) {
    // Implementation
  }
}
```

#### 2. Add Webhook Handler
```typescript
// src/app/api/webhooks/newplatform/route.ts
export async function POST(request: Request) {
  const payload = await request.json();
  
  // Process incoming message
  await processInboundMessage({
    platform: 'newplatform',
    chatId: payload.chat.id,
    text: payload.message.text,
    // ... other fields
  });
  
  return new Response('OK');
}
```

#### 3. Update Edge Functions
Add platform handling in `dispatch-outbound` function.

#### 4. Add UI Components
Create integration setup component in dashboard.

### Adding a New LLM Provider

#### 1. Create Provider Adapter
```typescript
// src/lib/ai/providers/newProvider.ts
export class NewProviderAdapter implements LLMProvider {
  async generateResponse(prompt: string, model: string): Promise<string> {
    // Implementation
  }
}
```

#### 2. Update LLM Service
```typescript
// src/lib/ai/llm.ts
import { NewProviderAdapter } from './providers/newProvider';

const providers = {
  openrouter: new OpenRouterAdapter(),
  newprovider: new NewProviderAdapter(),
};
```

### Database Schema Changes

#### 1. Create Migration
```bash
supabase migration new add_new_feature
```

#### 2. Write Migration SQL
```sql
-- supabase/migrations/timestamp_add_new_feature.sql
ALTER TABLE agents ADD COLUMN new_field TEXT;
CREATE INDEX idx_agents_new_field ON agents(new_field);
```

#### 3. Apply Migration
```bash
supabase db push
```

---

## 🔧 Troubleshooting

### Common Issues

#### "Unauthorized" API Errors
- Check JWT token is valid and not expired
- Verify token is passed in Authorization header
- Ensure user has proper permissions

#### Edge Functions Not Triggering
- Check cron job configuration in Supabase Dashboard
- Verify environment variables are set
- Check function logs: `supabase functions logs function-name`

#### Database Connection Issues
- Verify Supabase is running: `supabase status`
- Check connection string and credentials
- Ensure RLS policies allow access

#### Webhook Not Receiving Messages
- Verify webhook URL is publicly accessible
- Check webhook is properly registered with platform
- Ensure webhook endpoint returns 200 status

### Debug Commands
```bash
# Check Supabase status
supabase status

# View function logs
supabase functions logs process-inbound
supabase functions logs dispatch-outbound

# Debug with verbose output
supabase start --debug

# Test database connection
supabase db ping
```

### Useful SQL Queries
```sql
-- Check recent messages
SELECT * FROM messages ORDER BY created_at DESC LIMIT 10;

-- Check agent connections
SELECT a.name, c.platform, c.status 
FROM agents a 
JOIN connections c ON a.id = c.agent_id;

-- Check message processing status
SELECT 
  direction,
  status,
  COUNT(*) as count
FROM messages 
GROUP BY direction, status;
```

---

## 📚 Additional Resources

### Documentation
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Shadcn UI Documentation](https://ui.shadcn.com)

### API References
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
- [OpenRouter API](https://openrouter.ai/docs)
- [Stripe API](https://stripe.com/docs/api)

### Tools
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Vercel CLI](https://vercel.com/docs/cli)
- [Postman](https://www.postman.com/) - API testing
- [TablePlus](https://tableplus.com/) - Database GUI

---

## 🎯 Getting Started Checklist

### Day 1: Environment Setup
- [ ] Clone repository
- [ ] Install dependencies
- [ ] Set up local Supabase
- [ ] Configure environment variables
- [ ] Run development server
- [ ] Explore codebase structure

### Day 2: Understanding the Flow
- [ ] Study database schema
- [ ] Test API endpoints
- [ ] Deploy Edge Functions locally
- [ ] Test message processing flow
- [ ] Create test agent through UI

### Day 3: First Contribution
- [ ] Pick a small task from backlog
- [ ] Create feature branch
- [ ] Implement changes
- [ ] Test thoroughly
- [ ] Submit pull request

### Week 1: Full Understanding
- [ ] Complete end-to-end testing
- [ ] Deploy to staging environment
- [ ] Review all major components
- [ ] Understand business logic
- [ ] Ready for production tasks

---

## 🤝 Team Communication

### Code Review Process
1. Create feature branch from `main`
2. Implement changes with tests
3. Submit PR with detailed description
4. Address review feedback
5. Merge after approval

### Coding Standards
- Use TypeScript for type safety
- Follow ESLint and Prettier rules
- Write descriptive commit messages
- Add comments for complex logic
- Include error handling

### Meeting Schedule
- **Daily Standup**: 9:00 AM (15 minutes)
- **Sprint Planning**: Every 2 weeks
- **Code Review**: As needed
- **Architecture Discussions**: Weekly

---

## 📞 Support Contacts

- **Technical Lead**: [Your Name] - [email]
- **Product Manager**: [PM Name] - [email]
- **DevOps**: [DevOps Name] - [email]
- **Emergency**: [Emergency Contact]

---

**Welcome to the team! 🎉**

This document is your comprehensive guide to the Intaj platform. Take your time to go through each section, and don't hesitate to ask questions. We're here to help you succeed!

*Last updated: [Current Date]*
