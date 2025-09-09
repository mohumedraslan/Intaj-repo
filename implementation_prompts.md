# INTAJ Project Context & Next Steps

## Current Progress Summary (as of Sept 2025)

### ✅ Completed Frontend
1. Landing page with modern UI
2. Services page with animations
3. Authentication system (login/signup)
4. Basic UI components and styling

### 🎯 Next Phase: Backend Implementation

## Backend Development Prompts

### Prompt 1: Project Context & Architecture
```
You are a senior full-stack engineer joining the Intaj project. Here's what's been built:

Frontend:
- Next.js 15 with App Router and TypeScript
- Modern UI with Tailwind CSS
- Authentication UI (login/signup)
- Landing and services pages
- Contact integration

Required Backend Features:
1. Auth system with Supabase
2. Multi-channel chatbot integration (WhatsApp, FB, IG)
3. Stripe payment integration
4. OpenAI/OpenRouter for chatbot responses
5. File storage and vector search
6. Usage tracking and rate limiting

Please help implement these features following best practices and security standards. We'll tackle them one by one.

For context, refer to:
1. connection.md - Integration architecture
2. DB_DESCRIPTION.md - Database schema
3. Current frontend implementation

Let's start with [specific feature] implementation.
```

### Prompt 2: Supabase Auth Implementation
```
Help implement Supabase authentication in our Next.js app. Requirements:

1. Email/password and OAuth authentication
2. Protected routes and middleware
3. User profiles with subscription status
4. Session management
5. Type-safe database queries

Use the existing auth UI components in src/app/auth/.
Implement proper error handling and loading states.
```

### Prompt 3: Stripe Integration
```
Implement Stripe payment processing for Intaj. Requirements:

1. Subscription plans (Free, Pro)
2. Secure webhook handling
3. Usage tracking and limits
4. Payment UI integration
5. Subscription management

Follow Stripe best practices for Next.js integration.
Consider webhook security and testing.
```

### Prompt 4: Multi-Channel Chat Integration
```
Based on connection.md, implement the chat platform integrations. Requirements:

1. WhatsApp Business API integration
2. Facebook/Instagram Messenger API
3. Web widget implementation
4. Message queueing and rate limiting
5. Error handling and retries

Focus on scalability and maintainability.
Consider using n8n for initial MVP workflow automation.
```

### Prompt 5: OpenAI/OpenRouter Integration
```
Implement the AI chat functionality using OpenAI/OpenRouter. Requirements:

1. Streaming responses
2. Context management
3. Rate limiting
4. Error handling
5. Model switching capability
6. Usage tracking

Consider implementing fallback options and retry logic.
```

### Prompt 6: File Storage & Vector Search
```
Implement document processing and vector search. Requirements:

1. File upload to Supabase storage
2. Text extraction and processing
3. Vector embedding generation
4. Efficient vector search
5. Result ranking and filtering

Focus on performance and scalability.
```

### Prompt 7: Testing & Deployment
```
Help set up testing and deployment pipeline. Requirements:

1. Unit and integration tests
2. End-to-end testing
3. CI/CD with GitHub Actions
4. Production environment setup
5. Monitoring and logging

Focus on reliability and maintainability.
```

### Prompt 8: Analytics & Dashboard Implementation
```
Implement analytics and dashboard features. Requirements:

1. Usage analytics dashboard
   - Message counts per channel
   - Active chatbots
   - API usage tracking
   - Cost monitoring
2. Performance metrics
   - Response times
   - Error rates
   - User engagement
3. Custom reports and exports
4. Real-time monitoring

Focus on actionable insights and performance optimization.
```

### Prompt 9: Rate Limiting & Usage Controls
```
Implement comprehensive rate limiting and usage controls:

1. Per-user rate limiting
   - API calls
   - Message counts
   - File uploads
2. Subscription tier limits
3. Usage quotas
4. Automatic notifications
5. Grace period handling
6. Upgrade prompts

Focus on fair usage and business sustainability.
```

### Prompt 10: Error Handling & Recovery
```
Implement robust error handling and recovery:

1. Global error handling
2. Retry mechanisms
   - API calls
   - Database operations
   - File operations
3. Fallback strategies
4. Error logging
5. User notifications
6. Auto-recovery procedures

Focus on system resilience and user experience.
```

### Prompt 11: Documentation & API Reference
```
Create comprehensive documentation:

1. API Reference
   - Endpoints
   - Authentication
   - Rate limits
2. Integration guides
   - WhatsApp
   - Facebook
   - Instagram
   - Website widget
3. SDK documentation
4. Tutorial guides
5. Best practices

Focus on developer experience and adoption.
```

### Prompt 12: Security Hardening
```
Implement additional security measures:

1. Advanced authentication
   - 2FA implementation
   - Session management
   - Token rotation
2. Encryption at rest
3. Audit logging
4. Security headers
5. CORS policies
6. Input validation
7. Output sanitization

Focus on protecting user data and system integrity.
```

### Prompt 13: Performance Optimization
```
Implement performance improvements:

1. Caching strategy
   - Redis implementation
   - Cache invalidation
   - Cache warming
2. Database optimization
   - Query optimization
   - Indexing strategy
   - Connection pooling
3. CDN setup
4. Load balancing
5. Asset optimization

Focus on scalability and response times.
```

## Usage Instructions

1. Use these prompts in order, one at a time
2. Each prompt builds on the previous implementation
3. Always ask for clarification if needed
4. Keep security and scalability in mind
5. Follow TypeScript best practices
6. Maintain consistent error handling
7. Document all implementations
8. Add tests for new features

## Example Usage

When starting a new feature:
1. Use the Project Context prompt first
2. Then use the specific feature prompt
3. Ask for clarification on requirements if needed
4. Request code review and testing guidance

## Security Notes

- Always verify user permissions
- Encrypt sensitive data
- Use environment variables
- Implement rate limiting
- Follow security best practices
- Test edge cases
- Monitor for unusual activity

## Performance Considerations

- Implement caching where appropriate
- Use connection pooling
- Optimize database queries
- Monitor resource usage
- Implement proper error handling
- Use appropriate indexes
- Consider scalability

## Testing Strategy

### Unit Tests
- Test individual components
- Test utility functions
- Test API endpoints
- Mock external services

### Integration Tests
- Test feature workflows
- Test database interactions
- Test third-party integrations
- Test error scenarios

### E2E Tests
- Test critical user journeys
- Test payment flows
- Test chat interactions
- Test file processing

## Deployment Checklist

1. Environment Setup
   - Configure Supabase
   - Set up Stripe
   - Configure OpenAI/OpenRouter
   - Set up monitoring

2. Security Checks
   - Audit dependencies
   - Check for exposed secrets
   - Review access controls
   - Test rate limiting

3. Performance Verification
   - Load testing
   - Database optimization
   - Cache configuration
   - CDN setup

4. Monitoring Setup
   - Error tracking
   - Performance monitoring
   - Usage analytics
   - Cost monitoring

### Prompt 14: Implement Real Analytics Metrics (Backend + Frontend)
```
The analytics dashboard in `src/app/analytics/page.tsx` is currently using simulated data. We need to replace this with real, efficiently-queried data from our Supabase database.

**Part 1: Backend (Supabase RPC Functions)**

1.  **Create a new SQL file** in `db/` named `analytics_functions.sql`.
2.  In this file, create a Supabase RPC function called `get_analytics_metrics`. This function should:
    *   Accept `user_id_param` (uuid) and `time_range_param` (text, e.g., '7d', '30d') as arguments.
    *   Return a JSON object with the following real metrics for the given user and time range:
        *   `total_conversations`: Count of messages where `role = 'user'`.
        *   `active_bots`: Count of chatbots where `status = 'active'`.
        *   `avg_response_time`: This is tricky. For now, you can return a hardcoded value like `1.2` seconds. We can implement a more accurate version later.
        *   `conversion_rate`: This is also complex. For now, simulate it by taking `(total_conversations * 0.15)`.
        *   `bot_performance`: An array of JSON objects, one for each chatbot belonging to the user. Each object should contain:
            *   `name`: The chatbot's name.
            *   `channel`: The platform from the `connections` table (e.g., 'Website', 'WhatsApp'). Default to 'Website' if no connection is found.
            *   `conversations`: The number of conversations for that bot.
            *   `success_rate`: A simulated value for now (e.g., `80 + random() * 15`).
            *   `response_time`: A simulated value for now (e.g., `(1 + random() * 2) || 's'`).
            *   `status`: The chatbot's status.
    *   Refer to `db/DB_DESCRIPTION.md` for table schemas (`messages`, `chatbots`, `connections`).
    *   Ensure the function is secure and only returns data for the provided `user_id_param`.

**Part 2: Frontend (Update Analytics Page)**

1.  **Modify `src/app/analytics/page.tsx`**.
2.  In the `fetchAnalyticsData` function, remove the separate fetches for `chatbots`, `messages`, and `connections`.
3.  **Call the new RPC function** instead:
    ```javascript
    const { data: analyticsData, error } = await supabase.rpc('get_analytics_metrics', {
      user_id_param: user.id,
      time_range_param: timeRange
    });
    ```
4.  **Update the state** using the data returned from the RPC function.
    *   Replace all the hardcoded and simulated metric calculations (`totalConversations`, `activeBots`, `avgResponseTime`, `conversionRate`, `botPerformanceData`) with the values from `analyticsData`.
    *   The `change` and `trend` values for the top-level metrics can remain hardcoded for now, as calculating them requires historical data, which is a separate task.

By the end of this task, the analytics dashboard should display real data from the database, even if some of the more complex metrics are still simulated within the SQL function.
```

### Prompt 15: Implement Analytics Charts and Export
```
The analytics dashboard in `src/app/analytics/page.tsx` has placeholder sections for charts and a non-functional "Export Report" button. Let's implement these features.

**Prerequisites:**
*   You will need a charting library. Install `recharts` and its types: `npm install recharts @types/recharts`.

**Part 1: Implement Charts**

1.  **Create a new RPC function** in `db/analytics_functions.sql` called `get_conversations_over_time`.
    *   It should accept `user_id_param` (uuid) and `time_range_param` (text) as arguments.
    *   It should return a list of daily conversation counts for the last 7 or 30 days. Each row should have a `date` and `count`.
    *   You can use `date_trunc('day', created_at)` to group messages by day.
2.  **Modify `src/app/analytics/page.tsx`**:
    *   Import `ResponsiveContainer`, `BarChart`, `Bar`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip` from `recharts`.
    *   In `fetchAnalyticsData`, call your new `get_conversations_over_time` RPC function.
    *   Store the chart data in a new state variable.
    *   Replace the placeholder `div` for the "Conversations Over Time" chart with a real `<BarChart>` component from `recharts`, using the data you fetched.
    *   Style the chart to match the dark, modern theme of the dashboard. Use gradients for the bars.

**Part 2: Implement Export Functionality**

1.  **Create a helper function** that converts an array of objects (the `botPerformance` data) into a CSV string.
    *   The first line of the string should be the headers (e.g., "Bot Name,Channel,Conversations").
    *   Each subsequent line should be the data for one bot.
2.  **Modify the "Export Report" button** in `src/app/analytics/page.tsx`.
3.  When the button is clicked:
    *   Call the CSV conversion function with the `botPerformance` data.
    *   Create a `Blob` from the CSV string with `type: 'text/csv;charset=utf-8;'`.
    *   Create a temporary link (`<a>` element) with a `href` pointing to `URL.createObjectURL(blob)`.
    *   Set the `download` attribute of the link to something like `intaj-performance-report.csv`.
    *   Programmatically click the link to trigger the download.
    *   Clean up by revoking the object URL.

By the end of this task, the dashboard should display an interactive bar chart of conversation history and the "Export Report" button should download a CSV file of the bot performance data.
```

### Prompt 16: Implement Two-Factor Authentication (2FA)
```
We need to enhance user security by adding Time-based One-Time Password (TOTP) two-factor authentication (2FA). We will use the `speakeasy` and `qrcode` libraries.

**Prerequisites:**
*   Install the necessary libraries: `npm install speakeasy qrcode @types/speakeasy @types/qrcode`.

**Part 1: Backend API Endpoints**

1.  **Database:** Add a new table `user_2fa_secrets` to the database with columns: `user_id` (uuid, FK to auth.users), `secret` (text, encrypted), `enabled` (boolean).
2.  **Create API Endpoint for Setup (`/api/auth/2fa/setup`):**
    *   This `POST` endpoint should be protected, requiring an authenticated user.
    *   Generate a new 2FA secret using `speakeasy.generateSecret({ name: 'Intaj AI (user.email)' })`.
    *   Save the `base32` version of the secret to the `user_2fa_secrets` table for the user (remember to encrypt it first!).
    *   Respond with the `otpauth_url` from the secret. Do **not** send the secret itself back to the client.
3.  **Create API Endpoint for Verification (`/api/auth/2fa/verify`):**
    *   This `POST` endpoint accepts a `token` from the user.
    *   Retrieve the user's saved (and decrypted) 2FA secret from the database.
    *   Use `speakeasy.totp.verify()` to check if the provided token is valid.
    *   If valid, update the `enabled` flag for the user's 2FA secret to `true`. Respond with success.
    *   If invalid, respond with an error.
4.  **Create API Endpoint for Disabling (`/api/auth/2fa/disable`):**
    *   A `POST` endpoint that requires a valid 2FA token to disable 2FA.
    *   Verify the token first.
    *   If valid, remove the user's 2FA record from the database.

**Part 2: Frontend UI**

1.  **Create a new component `TwoFactorSetup` in `src/components/security/`**.
2.  This component should be displayed on the user's `/profile` page.
3.  **Setup Flow:**
    *   A button "Enable 2FA" calls the `/api/auth/2fa/setup` endpoint.
    *   On success, it receives the `otpauth_url`.
    *   Use the `qrcode` library to convert the `otpauth_url` into a data URL and display it as an image (`<img src={qrCodeDataUrl} />`).
    *   Show an input field for the user to enter the 6-digit token from their authenticator app.
    *   A "Verify" button sends the token to `/api/auth/2fa/verify`.
    *   On success, show a confirmation message.
4.  **Disable Flow:**
    *   If 2FA is enabled, show a "Disable 2FA" button.
    *   This button should prompt the user for a current 2FA token and then call the `/api/auth/2fa/disable` endpoint.

**Part 3: Integrate into Login Flow**

1.  Modify the main login logic. After a user successfully authenticates with their password, check if they have 2FA enabled.
2.  If they do, redirect them to a new page (e.g., `/auth/2fa`) where they must enter their 2FA token to complete the login.

This is a complex task. Ensure you handle all states (loading, error, success) and provide clear instructions to the user throughout the UI.
```
