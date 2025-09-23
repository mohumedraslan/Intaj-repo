# MVP Deployment Guide - Intaj AI Platform

## 🎯 Overview

This guide will help you deploy the Intaj AI Platform as a lean MVP using free-tier services, costing only $5-20/month while maintaining 95% of core functionality.

## 🏗️ MVP Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MVP Architecture                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────┐    │
│  │   Users     │───▶│   Vercel     │───▶│  Next.js    │    │
│  └─────────────┘    │  (Frontend)  │    │    App      │    │
│                     └──────────────┘    └─────────────┘    │
│                                                 │           │
│  ┌─────────────────────────────────────────────▼───────────┐│
│  │                Services Layer                           ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    ││
│  │  │  Supabase   │  │   Upstash   │  │   Sentry    │    ││
│  │  │(DB + Auth + │  │   Redis     │  │   (Errors)  │    ││
│  │  │Edge Funcs)  │  │ (Caching)   │  │             │    ││
│  │  └─────────────┘  └─────────────┘  └─────────────┘    ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              External APIs                              ││
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌─────────┐ ││
│  │  │OpenRouter │ │  Stripe   │ │ Telegram  │ │WhatsApp │ ││
│  │  │   (LLM)   │ │(Payments) │ │   Bot     │ │   API   │ ││
│  │  └───────────┘ └───────────┘ └───────────┘ └─────────┘ ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## 💰 Cost Breakdown

| Service | Free Tier Limits | Estimated Monthly Cost |
|---------|------------------|------------------------|
| **Vercel** | 100GB bandwidth, 1000 serverless functions | $0 |
| **Supabase** | 500MB DB, 2GB bandwidth, 500K Edge Function invocations | $0 |
| **Upstash Redis** | 10K commands/day | $0 |
| **Sentry** | 5K errors/month | $0 |
| **OpenRouter** | Pay-per-use | $5-15 |
| **Stripe** | 2.9% + 30¢ per transaction | Transaction-based |
| **Domain** | Optional | $10-15/year |
| **Total** | | **$5-20/month** |

## 🚀 Quick Start (45 Minutes)

### Step 1: Set Up Services (15 minutes)

#### 1.1 Create Supabase Project
```bash
# Visit https://supabase.com and create a new project
# Note down:
# - Project URL: https://your-project.supabase.co
# - Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# - Service Role Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 1.2 Create Upstash Redis
```bash
# Visit https://upstash.com and create a Redis database
# Note down:
# - REST URL: https://your-redis.upstash.io
# - REST Token: AXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXx
```

#### 1.3 Set Up Sentry (Optional)
```bash
# Visit https://sentry.io and create a new project
# Note down:
# - DSN: https://your-dsn@sentry.io/project-id
```

### Step 2: Configure Environment (10 minutes)

#### 2.1 Copy Environment Template
```bash
cp .env.mvp.example .env.local
```

#### 2.2 Fill in Required Values
```bash
# Edit .env.local with your actual values:

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# OpenRouter
OPENROUTER_API_KEY=sk-or-v1-your-key

# Stripe (Test Mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-key
STRIPE_SECRET_KEY=sk_test_your-key

# Generate secrets
NEXTAUTH_SECRET=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 64)
ENCRYPTION_KEY=$(openssl rand -hex 16)
```

### Step 3: Deploy Database & Functions (10 minutes)

#### 3.1 Push Database Schema
```bash
# Install Supabase CLI if not already installed
npm install -g @supabase/cli

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-id

# Push database migrations
supabase db push

# Verify tables are created
supabase db diff
```

#### 3.2 Deploy Edge Functions
```bash
# Deploy the message processing functions
supabase functions deploy process-inbound
supabase functions deploy dispatch-outbound

# Set environment variables for Edge Functions
supabase secrets set OPENROUTER_API_KEY=your-key
supabase secrets set TELEGRAM_BOT_TOKEN=your-token
supabase secrets set WHATSAPP_ACCESS_TOKEN=your-token

# Set up cron job for outbound dispatch (every 10 seconds)
# Go to Supabase Dashboard > Edge Functions > Cron Jobs
# Add: 0/10 * * * * * (every 10 seconds) -> dispatch-outbound
```

### Step 4: Deploy to Vercel (10 minutes)

#### 4.1 Connect GitHub Repository
```bash
# Visit https://vercel.com and import your GitHub repository
# Or use Vercel CLI:
npm install -g vercel
vercel login
vercel --prod
```

#### 4.2 Set Environment Variables in Vercel
```bash
# In Vercel Dashboard > Settings > Environment Variables, add:

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
OPENROUTER_API_KEY=sk-or-v1-your-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-key
STRIPE_SECRET_KEY=sk_test_your-key
NEXTAUTH_SECRET=your-generated-secret
JWT_SECRET=your-generated-jwt-secret
ENCRYPTION_KEY=your-generated-encryption-key
TELEGRAM_BOT_TOKEN=your-telegram-token
WHATSAPP_ACCESS_TOKEN=your-whatsapp-token
WHATSAPP_VERIFY_TOKEN=your-whatsapp-verify-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
```

#### 4.3 Deploy
```bash
# Push to main branch to trigger deployment
git add .
git commit -m "MVP deployment configuration"
git push origin main

# Or deploy directly
vercel --prod
```

## 🧪 Testing Your Deployment

### 1. Health Check
```bash
curl https://your-app.vercel.app/api/v1/health
# Should return: {"status": "healthy", ...}
```

### 2. Authentication
- Visit your app URL
- Try signing up/signing in
- Verify Supabase Auth is working

### 3. Agent Creation
- Create a new agent
- Verify it saves to Supabase
- Check agent appears in dashboard

### 4. Telegram Integration
- Set up a Telegram bot
- Configure webhook URL: `https://your-app.vercel.app/api/integrations/telegram/webhook`
- Send test message to bot
- Verify LLM response

### 5. Payment Flow
- Test Stripe checkout (test mode)
- Verify webhook handling
- Check subscription status

## 🔧 Local Development

### Option 1: With External Services
```bash
# Use external Supabase and Upstash
cp .env.mvp.example .env.local
# Fill in your service credentials
npm run dev
```

### Option 2: With Docker Compose
```bash
# Start local development environment
docker-compose -f docker-compose.mvp.yml up

# Or with local Supabase
docker-compose -f docker-compose.mvp.yml --profile local-supabase up
```

### Option 3: Supabase Local Development
```bash
# Start Supabase locally
supabase start

# Run Next.js app
npm run dev

# Stop Supabase when done
supabase stop
```

## 📊 Monitoring & Debugging

### Health Monitoring
```bash
# Check application health
curl https://your-app.vercel.app/api/v1/health

# Check Supabase status
curl https://your-project.supabase.co/rest/v1/

# Check Redis connectivity
# Use Upstash Console or Redis CLI
```

### Error Tracking
- **Sentry**: Automatic error tracking and performance monitoring
- **Vercel Logs**: Function logs in Vercel dashboard
- **Supabase Logs**: Edge Function logs in Supabase dashboard

### Performance Monitoring
```bash
# Vercel Analytics (free tier)
# - Page views and performance metrics
# - Core Web Vitals tracking

# Supabase Analytics
# - Database performance
# - API usage statistics
```

## 🔄 CI/CD Pipeline

### Automatic Deployments
```yaml
# .github/workflows/mvp-deploy.yml (simplified)
name: MVP Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm run test
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

### Database Migrations
```bash
# Automatic migration on deploy
supabase db push --linked

# Or manual migration
supabase migration up
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Build Failures
```bash
# Check Node.js version (use 18.x)
node --version

# Clear cache and reinstall
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

#### 2. Database Connection Issues
```bash
# Verify Supabase credentials
supabase projects list
supabase db ping

# Check RLS policies
supabase db diff
```

#### 3. Edge Function Errors
```bash
# Check function logs
supabase functions logs process-inbound
supabase functions logs dispatch-outbound

# Test functions locally
supabase functions serve
curl -X POST http://localhost:54321/functions/v1/process-inbound
```

#### 4. Redis Connection Issues
```bash
# Test Redis connection
curl -X POST https://your-redis.upstash.io/ping \
  -H "Authorization: Bearer your-token"
```

### Performance Optimization

#### 1. Reduce Bundle Size
```bash
# Analyze bundle
npm run build
npm run analyze

# Use dynamic imports for large components
const HeavyComponent = dynamic(() => import('./HeavyComponent'))
```

#### 2. Optimize Database Queries
```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_agents_user_id ON agents(user_id);
CREATE INDEX idx_messages_agent_id ON messages(agent_id);
```

#### 3. Cache Frequently Accessed Data
```typescript
// Use Redis for caching
import { redis } from '@/lib/redis'

const cachedData = await redis.get(`cache:${key}`)
if (!cachedData) {
  const data = await fetchData()
  await redis.setex(`cache:${key}`, 300, JSON.stringify(data))
  return data
}
```

## 📈 Scaling Considerations

### When to Upgrade from MVP

#### Traffic Indicators
- **Vercel**: Approaching 100GB bandwidth/month
- **Supabase**: Database > 400MB or bandwidth > 1.5GB
- **Upstash**: Redis commands > 8K/day
- **Response Times**: API responses > 1 second

#### Feature Requirements
- **Team Collaboration**: Multiple users per organization
- **Advanced Analytics**: Custom dashboards and reporting
- **Enterprise Security**: SSO, audit logs, compliance
- **High Availability**: 99.9% uptime SLA

### Migration Path to Production

#### 1. Gradual Migration
```bash
# Keep MVP running while setting up production
# Use feature flags to gradually migrate users
# Test production infrastructure with subset of traffic
```

#### 2. Data Migration
```bash
# Export from Supabase
supabase db dump > mvp_backup.sql

# Import to production database
psql -h production-db -U user -d database < mvp_backup.sql
```

#### 3. DNS Cutover
```bash
# Update DNS to point to production infrastructure
# Keep MVP as fallback for 24-48 hours
# Monitor metrics during transition
```

## 🎯 Success Metrics

### Technical Metrics
- **Uptime**: > 99% (Vercel + Supabase reliability)
- **Response Time**: < 500ms average API response
- **Error Rate**: < 1% of requests
- **Build Time**: < 2 minutes

### Business Metrics
- **User Registration**: Track signup conversion
- **Agent Creation**: Monitor agent creation success rate
- **Message Processing**: Track LLM response times
- **Payment Success**: Monitor Stripe conversion rates

### Cost Metrics
- **Monthly Spend**: Stay under $20/month
- **Cost per User**: Track cost efficiency
- **Service Utilization**: Monitor free tier limits

## 🔗 Useful Links

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Supabase Dashboard**: https://app.supabase.com
- **Upstash Console**: https://console.upstash.com
- **Sentry Dashboard**: https://sentry.io/organizations/your-org/
- **Stripe Dashboard**: https://dashboard.stripe.com

## 📞 Support

### Community Resources
- **Vercel Discord**: https://discord.gg/vercel
- **Supabase Discord**: https://discord.supabase.com
- **Next.js Discussions**: https://github.com/vercel/next.js/discussions

### Documentation
- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs

---

## 🎉 Congratulations!

Your Intaj AI Platform MVP is now live! You have:

✅ **Full-featured AI platform** running on free tiers  
✅ **$5-20/month** total cost  
✅ **Scalable architecture** ready for growth  
✅ **Professional deployment** with monitoring  
✅ **Clear upgrade path** to enterprise infrastructure  

**Next Steps:**
1. Test all features thoroughly
2. Gather user feedback
3. Monitor performance and costs
4. Plan scaling strategy based on growth

**Happy building! 🚀**
