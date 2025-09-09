# Environment Variables for Intaj Platform

## 🔧 Core Application
```bash
# Next.js Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Production: https://intaj.nabih.tech
NEXTAUTH_URL=http://localhost:3000         # Production: https://intaj.nabih.tech
NEXTAUTH_SECRET=your-nextauth-secret-key-here

# Environment
NODE_ENV=development  # Production: production
```

## 🗄️ Database (Supabase)
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

## 🤖 AI Services
```bash
# OpenRouter API (for AI models)
OPENROUTER_API_KEY=your-openrouter-api-key

# Alternative AI Providers (optional)
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

## 💳 Payment Processing (Stripe)
```bash
# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_... # Production: pk_live_...
STRIPE_SECRET_KEY=sk_test_...      # Production: sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 📱 WhatsApp Business API
```bash
# WhatsApp Business Platform
WHATSAPP_ACCESS_TOKEN=your-whatsapp-access-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_BUSINESS_ACCOUNT_ID=your-business-account-id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-custom-verify-token
WHATSAPP_APP_ID=your-facebook-app-id
WHATSAPP_APP_SECRET=your-facebook-app-secret

# Callback URLs
# Local: http://localhost:3000/api/webhooks/whatsapp
# Production: https://intaj.nabih.tech/api/webhooks/whatsapp
```

## 📘 Facebook Messenger
```bash
# Facebook App Configuration
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
FACEBOOK_PAGE_ACCESS_TOKEN=your-page-access-token
FACEBOOK_WEBHOOK_VERIFY_TOKEN=your-custom-verify-token

# Callback URLs
# Local: http://localhost:3000/api/webhooks/facebook
# Production: https://intaj.nabih.tech/api/webhooks/facebook
```

## 📸 Instagram Business
```bash
# Instagram Business API (uses Facebook credentials)
INSTAGRAM_BUSINESS_ACCOUNT_ID=your-instagram-business-id
INSTAGRAM_ACCESS_TOKEN=your-instagram-access-token

# Callback URLs
# Local: http://localhost:3000/api/webhooks/instagram
# Production: https://intaj.nabih.tech/api/webhooks/instagram
```

## 📧 Email Services
```bash
# Email Provider (choose one)
# Resend
RESEND_API_KEY=your-resend-api-key

# SendGrid (alternative)
SENDGRID_API_KEY=your-sendgrid-api-key

# Nodemailer SMTP (alternative)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## 🔐 Authentication & Security
```bash
# JWT Secret for custom auth
JWT_SECRET=your-jwt-secret-key

# Encryption keys for sensitive data
ENCRYPTION_KEY=your-32-character-encryption-key

# CORS Origins
CORS_ORIGINS=http://localhost:3000,https://intaj.nabih.tech
```

## 📊 Analytics & Monitoring
```bash
# Google Analytics (optional)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Sentry Error Tracking (optional)
SENTRY_DSN=your-sentry-dsn
NEXT_PUBLIC_SENTRY_DSN=your-public-sentry-dsn

# PostHog Analytics (optional)
NEXT_PUBLIC_POSTHOG_KEY=your-posthog-key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

## 🔧 Development & Testing
```bash
# Development flags
DEBUG=true
VERBOSE_LOGGING=true

# Test environment
TEST_DATABASE_URL=your-test-database-url
TEST_STRIPE_KEY=sk_test_...
```

## 🌐 CDN & Storage
```bash
# Supabase Storage (for file uploads)
SUPABASE_STORAGE_BUCKET=intaj-uploads

# Cloudinary (alternative for media)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## 📱 Push Notifications (Optional)
```bash
# Firebase Cloud Messaging
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY=your-firebase-private-key
FIREBASE_CLIENT_EMAIL=your-firebase-client-email
```

## 🔄 Rate Limiting & Caching
```bash
# Redis (for caching and rate limiting)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password

# Upstash Redis (cloud alternative)
UPSTASH_REDIS_REST_URL=your-upstash-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-token
```

---

## 🚀 Quick Setup Priority

### Essential (Must Have):
1. `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. `OPENROUTER_API_KEY` or `OPENAI_API_KEY`
3. `STRIPE_PUBLISHABLE_KEY` & `STRIPE_SECRET_KEY`
4. `NEXTAUTH_SECRET`

### Social Media Integration:
5. `WHATSAPP_ACCESS_TOKEN` & `WHATSAPP_PHONE_NUMBER_ID`
6. `FACEBOOK_APP_ID` & `FACEBOOK_APP_SECRET`
7. `INSTAGRAM_BUSINESS_ACCOUNT_ID` & `INSTAGRAM_ACCESS_TOKEN`

### Production Ready:
8. Email service credentials
9. Analytics keys
10. Error monitoring (Sentry)

---

## 📝 Notes:
- Replace all `your-*` placeholders with actual values
- Keep test/development keys separate from production
- Never commit `.env.local` to version control
- Use different webhook verify tokens for each service
- Ensure HTTPS for all production webhook URLs
