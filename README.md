
# Intaj — Automation Platform MVP

Intaj is a modern automation platform for business, sales, marketing, and content creation. It enables you to build, deploy, and manage:
- AI chatbots (MVP)
- Sales agents
- Marketing agents
- Content creator agents
- Workflow automations (coming soon)

**MVP Focus:** Chatbots (with extensible architecture for future automation agents)


## Getting Started


First, install dependencies and run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.


## Features
- Next.js 15 (App Router, TypeScript)
- Tailwind CSS, Shadcn UI
- Supabase (auth, database, storage, vector search)
- Stripe integration (subscriptions)
- Embeddable chat widget
- Extensible for future automation agents

## File Structure
- `src/app/` — Next.js app routes (dashboard, chat, widget, etc)
- `src/lib/` — Core libraries (supabase, embeddings, usage, etc)
- `db/` — Database schema and SQL functions

## Contributing
See `db/DB_DESCRIPTION.md` for schema and table docs. PRs welcome!

## LLM Loop

The platform implements an automated message processing loop:

### Flow
1. **Inbound**: Webhook receives message → stores in `messages` table (`direction='inbound'`, `status='received'`)
2. **Processing**: Edge Function `process-inbound` → calls LLM API → queues reply (`direction='outbound'`, `status='queued'`)
3. **Outbound**: Edge Function `dispatch-outbound` → sends via platform APIs → updates status to `sent`

### Environment Variables
```bash
# Required for LLM processing
OPENROUTER_API_KEY=your_openrouter_key
INTERNAL_ADMIN_KEY=your_secret_key

# Required for Edge Function to call Next.js LLM route
LLM_GENERATE_URL=https://yourapp.com/api/internal/llm-generate
```

### Manual Testing
```bash
# Test LLM generation
curl -X POST https://yourapp.com/api/internal/llm-generate \
  -H "Content-Type: application/json" \
  -H "X-ADMIN-KEY: your_secret_key" \
  -d '{"agentId": "agent_id", "messages": [{"role": "user", "content": "Hello"}]}'

# Trigger inbound processing
supabase functions invoke process-inbound

# Trigger outbound dispatch
curl -X POST https://yourapp.com/api/internal/dispatch \
  -H "X-ADMIN-KEY: your_secret_key"

# Setup Telegram webhook
curl -X POST https://yourapp.com/api/integrations/telegram/setupWebhook \
  -H "Content-Type: application/json" \
  -d '{"botToken": "your_bot_token", "baseUrl": "https://yourapp.com"}'

# Create agent with Telegram integration
curl -X POST https://yourapp.com/api/agents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_jwt" \
  -d '{
    "name": "Support Bot",
    "base_prompt": "You are a helpful support assistant.",
    "model": "gpt-4o",
    "integrations": {
      "telegramToken": "your_bot_token",
      "autoSetupWebhook": true,
      "baseUrl": "https://yourapp.com"
    }
  }'
```

### Deployment
```bash
# Deploy Edge Functions
supabase functions deploy process-inbound --no-verify-jwt
supabase functions deploy dispatch-outbound --no-verify-jwt

# Schedule dispatcher (every 10 seconds)
# Configure via Supabase Dashboard → Edge Functions → Cron Jobs
# Function: dispatch-outbound, Schedule: */10 * * * * *
```

## Links
- [DB Schema](db/DB_DESCRIPTION.md)

---
This project is the foundation for a full automation platform. MVP = chatbots, but architecture supports sales, marketing, and content agents.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
