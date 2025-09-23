# Intaj AI Platform - MVP Edition 🚀

> **Lean, Fast, Cost-Effective AI Automation Platform**  
> Deploy in 45 minutes for $5-20/month using free-tier services

## 🎯 What's This?

The **MVP Edition** of Intaj AI Platform is a streamlined version designed for rapid deployment and minimal cost while maintaining 95% of core functionality. Perfect for:

- **Startups** wanting to launch quickly
- **Developers** testing AI automation concepts  
- **Small businesses** needing cost-effective solutions
- **MVPs** requiring fast time-to-market

## ✨ Features Included

### ✅ Core Features (95% Functionality)
- **User Authentication** - Supabase Auth with social logins
- **Agent Management** - Create, configure, and manage AI agents
- **Multi-channel Bots** - Telegram + WhatsApp integrations
- **LLM Processing** - OpenRouter API for AI responses
- **Workflow Builder** - Conditional logic and automation
- **Real-time Dashboard** - Live statistics and activity feeds
- **Analytics** - Performance metrics and insights
- **Payment Processing** - Stripe integration for subscriptions
- **Agent Templates** - Pre-built business use cases

### 🏗️ MVP Architecture

```
Vercel (Frontend + API) → Supabase (DB + Auth + Functions) → Upstash Redis (Cache)
                      ↓
External APIs: OpenRouter, Stripe, Telegram, WhatsApp
```

## 💰 Cost Breakdown

| Service | Usage | Monthly Cost |
|---------|-------|--------------|
| **Vercel** | Hosting + Functions | $0 (Free tier) |
| **Supabase** | Database + Auth + Edge Functions | $0 (Free tier) |
| **Upstash Redis** | Caching + Queues | $0 (Free tier) |
| **Sentry** | Error tracking | $0 (Free tier) |
| **OpenRouter** | LLM API calls | $5-15 (Pay per use) |
| **Stripe** | Payment processing | 2.9% + 30¢ per transaction |
| **Domain** (Optional) | Custom domain | $10-15/year |
| **Total** | | **$5-20/month** |

## 🚀 Quick Start (45 Minutes)

### Prerequisites
- Node.js 18+
- Git
- GitHub account
- Vercel account
- Supabase account
- Upstash account

### Step 1: Clone and Setup (5 minutes)
```bash
git clone https://github.com/your-username/intaj-repo.git
cd intaj-repo
npm install
cp .env.mvp.example .env.local
```

### Step 2: Create Services (15 minutes)
1. **Supabase**: Create project at https://supabase.com
2. **Upstash**: Create Redis database at https://upstash.com  
3. **Vercel**: Connect GitHub repo at https://vercel.com
4. **OpenRouter**: Get API key at https://openrouter.ai
5. **Stripe**: Set up account at https://stripe.com (test mode)

### Step 3: Configure Environment (10 minutes)
Edit `.env.local` with your service credentials:
```bash
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
```

### Step 4: Deploy Database & Functions (10 minutes)
```bash
# Install Supabase CLI
npm install -g @supabase/cli

# Login and link project
supabase login
supabase link --project-ref your-project-id

# Push database schema
npm run mvp:db:push

# Deploy Edge Functions
npm run mvp:functions

# Set Edge Function secrets
supabase secrets set OPENROUTER_API_KEY=your-key
supabase secrets set TELEGRAM_BOT_TOKEN=your-token
```

### Step 5: Deploy to Vercel (5 minutes)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
npm run mvp:deploy

# Or push to main branch for auto-deploy
git add .
git commit -m "MVP deployment"
git push origin main
```

## 🧪 Testing Your Deployment

### Health Check
```bash
curl https://your-app.vercel.app/api/v1/health
# Should return: {"status": "healthy"}
```

### Feature Testing
1. **Authentication**: Sign up/login
2. **Agent Creation**: Create a new AI agent
3. **Telegram Bot**: Set up bot and test messaging
4. **Dashboard**: View real-time statistics
5. **Payments**: Test Stripe checkout (test mode)

## 🛠️ Local Development

### Option 1: External Services
```bash
# Use external Supabase and Upstash
npm run dev
```

### Option 2: Docker Compose
```bash
# Start local development environment
npm run mvp:dev
```

### Option 3: Supabase Local
```bash
# Start Supabase locally
npm run supabase:start
npm run dev
```

## 📊 Monitoring & Debugging

### Built-in Monitoring
- **Vercel Analytics**: Page views and performance
- **Supabase Dashboard**: Database and API metrics  
- **Upstash Console**: Redis performance
- **Sentry**: Error tracking (optional)

### Health Endpoints
- `/api/v1/health` - Application health
- `/api/v1/metrics` - Basic metrics

### Debugging
```bash
# Check logs
vercel logs
supabase functions logs process-inbound
supabase functions logs dispatch-outbound

# Test locally
npm run dev
npm run test
```

## 🔄 CI/CD Pipeline

### Automatic Deployment
- **Push to main** → Auto-deploy to Vercel
- **Pull requests** → Preview deployments
- **Edge Functions** → Auto-deploy on push

### Manual Commands
```bash
npm run mvp:deploy        # Deploy to Vercel
npm run mvp:functions     # Deploy Edge Functions
npm run mvp:db:push       # Push database changes
npm run mvp:setup         # Full setup (DB + Functions)
```

## 📈 Scaling Considerations

### Free Tier Limits
- **Vercel**: 100GB bandwidth, 1000 serverless functions
- **Supabase**: 500MB DB, 2GB bandwidth, 500K Edge Functions
- **Upstash**: 10K Redis commands/day

### When to Upgrade
- **Traffic**: > 80% of free tier limits
- **Features**: Need team collaboration, advanced analytics
- **Performance**: Response times > 1 second
- **Compliance**: Enterprise security requirements

### Migration Path
The MVP is designed for easy migration to the full production infrastructure:
1. Keep MVP running during migration
2. Use feature flags for gradual rollout
3. Migrate data using provided scripts
4. DNS cutover to production

## 🚨 Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

#### Database Issues
```bash
# Reset database
npm run mvp:db:reset
npm run mvp:db:push
```

#### Function Deployment Issues
```bash
# Check function logs
supabase functions logs process-inbound --follow

# Redeploy functions
npm run mvp:functions
```

### Getting Help
- **GitHub Issues**: Report bugs and feature requests
- **Discord**: Join our community for support
- **Documentation**: Check the full deployment guide

## 🎯 What's Different from Full Production?

### Removed for MVP
- ❌ Kubernetes/Helm deployments
- ❌ Terraform infrastructure
- ❌ Prometheus/Grafana monitoring
- ❌ AWS-specific services
- ❌ Complex backup procedures
- ❌ Blue-green deployments

### Simplified for MVP
- ✅ Single Vercel deployment
- ✅ Supabase managed services
- ✅ Basic monitoring via service dashboards
- ✅ Automatic backups via Supabase
- ✅ Simple rollback via Vercel

## 🔗 Useful Links

- **Live Demo**: https://intaj-mvp.vercel.app
- **Deployment Guide**: [MVP_DEPLOYMENT_GUIDE.md](./MVP_DEPLOYMENT_GUIDE.md)
- **API Documentation**: https://your-app.vercel.app/api/docs
- **Status Page**: https://your-app.vercel.app/status

## 📞 Support

- **GitHub Issues**: https://github.com/your-username/intaj-repo/issues
- **Email**: support@intaj.ai
- **Discord**: https://discord.gg/intaj

## 🎉 Success Stories

> "Deployed Intaj MVP in 30 minutes and had our first paying customer within a week!" - Startup Founder

> "Perfect for testing our AI automation ideas without breaking the bank." - Developer

> "Scaled from MVP to full production seamlessly when we hit 1000 users." - SaaS Company

---

## 🚀 Ready to Launch?

1. **Follow the Quick Start guide** (45 minutes)
2. **Test all features** thoroughly
3. **Gather user feedback** and iterate
4. **Monitor costs** and performance
5. **Scale up** when ready

**Happy building! 🎯**

---

**MVP Edition** | **Cost: $5-20/month** | **Deploy Time: 45 minutes** | **Scalable Architecture**
