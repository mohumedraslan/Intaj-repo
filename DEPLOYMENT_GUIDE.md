# Intaj Platform Deployment Guide

## Vercel Deployment Steps

1. **Prerequisites**:
   - Vercel account
   - Supabase project
   - OpenRouter API key
   - Telegram bot token

2. **Environment Variables**:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   INTERNAL_ADMIN_KEY=your_secure_key
   OPENROUTER_API_KEY=your_openrouter_key
   NGROK_URL=your_ngrok_url # For local testing
   ```

3. **Vercel Setup**:
   ```bash
   # Install Vercel CLI
   npm install -g vercel
   
   # Link project
   vercel link
   
   # Deploy
   vercel --prod
   ```

4. **Post-Deployment**:
   - Set up webhooks in Telegram
   - Configure cron jobs for Edge Functions
   - Test end-to-end flow

## Telegram Webhook Setup

For production:
```bash
curl -X POST https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-vercel-app.vercel.app/api/webhooks/telegram/<AGENT_ID>"}'
```

For local development (using ngrok):
```bash
curl -X POST https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-ngrok-url.ngrok.io/api/webhooks/telegram/<AGENT_ID>"}'
```
