# AI Agent Platform - Production Architecture & Implementation Plan

## Executive Summary

**Current State Assessment:** 5.5/10 - Functional MVP with significant technical debt
**Target State:** Production-ready platform for automated business roles with enterprise scalability
**Approach:** Strategic refactor with service layer separation and microservices-ready architecture

## New Architecture Design

### 1. Service-Oriented Architecture (Monolith → Modular Services)

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                          │
│  Next.js 15 App Router + React Components + TailwindCSS       │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                         │
│  /api/v1/* - Versioned REST APIs with OpenAPI Spec            │
│  Middleware: Auth, Validation (Zod), Rate Limiting, Logging   │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                     Business Logic Layer                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │   User      │ │   Agent     │ │Integration  │ │    LLM    │ │
│  │  Service    │ │  Service    │ │  Gateway    │ │Orchestrator│ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                       Data Layer                               │
│  PostgreSQL + Vector DB + Redis + Object Storage              │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                        │
│  Queues (SQS/Redis) + Monitoring + Logging + Security         │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Core Services Design

#### A. User/Business Service
- **Responsibility:** User management, authentication, billing, organizations
- **API Endpoints:** `/api/v1/users`, `/api/v1/auth`, `/api/v1/billing`
- **Data:** profiles, subscriptions, organizations, api_keys

#### B. Agent Service  
- **Responsibility:** Agent lifecycle, configurations, templates, deployment
- **API Endpoints:** `/api/v1/agents`, `/api/v1/templates`, `/api/v1/deployments`
- **Data:** agents, agent_templates, deployments, usage_logs

#### C. Integration Gateway
- **Responsibility:** Multi-platform messaging, webhooks, message routing
- **API Endpoints:** `/api/v1/integrations`, `/api/v1/webhooks`
- **Data:** connections, conversations, messages (inbox/outbox pattern)

#### D. LLM Orchestrator
- **Responsibility:** AI provider abstraction, RAG, prompt management, usage tracking
- **API Endpoints:** `/api/v1/llm`, `/api/v1/embeddings`, `/api/v1/rag`
- **Data:** conversations, usage_metrics, embeddings

### 3. Database Schema Optimization

#### Normalized Core Tables:
```sql
-- Users & Business
profiles (id, email, name, subscription, billing_info, created_at)
organizations (id, owner_id, plan, settings, created_at)
api_keys (id, user_id, name, key_hash, permissions, expires_at)

-- Agent Management
agents (id, user_id, name, type, status, config, created_at, updated_at)
agent_templates (id, type, name, base_prompt, default_config, created_at)
deployments (id, agent_id, version, config_snapshot, status, deployed_at)

-- Integrations & Messaging
connections (id, agent_id, platform, config, status, created_at)
conversations (id, agent_id, connection_id, external_id, metadata, created_at)
messages (id, conversation_id, direction, content, status, metadata, created_at)

-- AI & Knowledge
embeddings (id, agent_id, content_hash, vector, metadata, created_at)
usage_logs (id, agent_id, tokens_in, tokens_out, cost, provider, created_at)
```

### 4. Technology Stack Decisions

#### Backend Framework: Next.js 15 (API Routes → Service Modules)
- Keep existing Next.js for rapid development
- Refactor API routes to call service modules
- Add proper middleware stack

#### Queue System: Redis + Bull (Phase 1) → SQS (Phase 2)  
- Immediate: Redis-based queues for message processing
- Future: AWS SQS for enterprise scalability

#### Vector Database: Qdrant (Self-hosted) or Pinecone (Managed)
- Qdrant for cost-effective start
- Migration path to Pinecone for scale

#### Monitoring: OpenTelemetry + Sentry + Custom Metrics
- Distributed tracing across services
- Error tracking and performance monitoring
- Business metrics dashboard

## Implementation Plan - Windsurf Prompts

### Phase 1: Foundation & Service Layer (Weeks 1-3)

#### Prompt 1: Core Service Architecture Setup
Create the foundational service layer architecture with proper separation of concerns. Set up:

1. **Service Module Structure:**
   - `src/services/userService.ts` - User management, auth, billing
   - `src/services/agentService.ts` - Agent CRUD, templates, configs
   - `src/services/integrationGateway.ts` - Multi-platform messaging
   - `src/services/llmOrchestrator.ts` - LLM provider abstraction
   - `src/services/base/BaseService.ts` - Common service patterns

2. **Request/Response Standards:**
   - Zod schemas for all API inputs/outputs in `src/schemas/`
   - Consistent error handling with `src/lib/errors.ts`
   - API response wrapper with status codes and metadata

3. **Database Access Layer:**
   - `src/repositories/` - Repository pattern for each entity
   - Transaction management utilities
   - Connection pooling optimization

4. **Middleware Stack:**
   - Authentication middleware using Supabase JWT
   - Request validation middleware with Zod
   - Rate limiting middleware with Redis
   - Structured logging with correlation IDs

Ensure all existing API routes are refactored to use the new service layer while maintaining backward compatibility.

#### Prompt 2: Database Schema Normalization
Normalize the database schema and fix all legacy naming issues:

1. **Schema Migration:**
   - Create comprehensive migration script to rename `chatbots` to `agents` everywhere
   - Standardize `connections.config` vs `connections.credentials` 
   - Add missing foreign key constraints and indexes
   - Implement proper cascading deletes

2. **New Tables:**
   ```sql
   CREATE TABLE agent_templates (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     type TEXT NOT NULL, -- 'customer_support', 'sales', 'marketing'
     name TEXT NOT NULL,
     description TEXT,
     base_prompt TEXT NOT NULL,
     default_config JSONB DEFAULT '{}',
     tools JSONB DEFAULT '[]',
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   CREATE TABLE deployments (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
     version INTEGER NOT NULL DEFAULT 1,
     config_snapshot JSONB NOT NULL,
     status TEXT DEFAULT 'active',
     deployed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   CREATE TABLE usage_logs (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
     conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
     provider TEXT NOT NULL,
     model TEXT NOT NULL,
     tokens_input INTEGER NOT NULL DEFAULT 0,
     tokens_output INTEGER NOT NULL DEFAULT 0,
     cost_usd DECIMAL(10,6),
     latency_ms INTEGER,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

3. **Data Migration Scripts:**
   - Migrate existing data to new schema
   - Verify data integrity after migration
   - Update all RLS policies for new schema

4. **Indexes & Performance:**
   - Add composite indexes for common query patterns
   - Optimize existing indexes based on query analysis
   - Add database monitoring queries

#### Prompt 3: API Standardization & Validation
Standardize all API endpoints with proper validation and error handling:

1. **API Versioning:**
   - Implement `/api/v1/` prefix for all endpoints
   - Add API version header handling
   - Create migration guide for existing endpoints

2. **Request Validation:**
   - Comprehensive Zod schemas for all endpoints:
   ```typescript
   // Agent creation schema
   const CreateAgentSchema = z.object({
     name: z.string().min(2).max(100),
     type: z.enum(['customer_support', 'sales', 'marketing']),
     base_prompt: z.string().min(10).max(4000),
     model: z.string().default('gpt-4o'),
     settings: z.object({
       temperature: z.number().min(0).max(2).default(0.7),
       max_tokens: z.number().min(100).max(4000).default(1000),
       timeout_ms: z.number().min(5000).max(30000).default(10000)
     }).optional()
   });
   ```

3. **Error Handling:**
   - Standardized error response format
   - Error code system with client-friendly messages
   - Proper HTTP status codes
   - Error logging with context

4. **OpenAPI Documentation:**
   - Generate OpenAPI 3.0 spec from Zod schemas
   - Interactive API documentation
   - Client SDK generation capability

### Phase 2: Integration Gateway & Messaging (Weeks 3-5)

#### Prompt 4: Integration Gateway Implementation
Build a robust, multi-platform integration gateway:

1. **Platform Abstraction:**
   ```typescript
   interface PlatformAdapter {
     platform: string;
     setupWebhook(config: PlatformConfig): Promise<WebhookSetupResult>;
     processInbound(webhook: WebhookPayload): Promise<InboundMessage>;
     sendOutbound(message: OutboundMessage): Promise<SendResult>;
     validateWebhook(payload: any, signature: string): boolean;
   }
   ```

2. **Telegram Adapter (Enhanced):**
   - Webhook signature verification
   - Message deduplication by `update_id`
   - Rate limiting per bot token
   - Error handling with exponential backoff
   - Support for all Telegram message types

3. **WhatsApp Adapter (Stub → Implementation):**
   - WhatsApp Business API integration
   - Webhook verification
   - Message templates support
   - Media message handling

4. **Message Queue System:**
   - Redis-based queue with Bull
   - Separate queues: `inbound`, `processing`, `outbound`, `dlq`
   - Job retry policies with exponential backoff
   - Dead letter queue for failed messages

5. **Idempotency & Reliability:**
   - Idempotency keys for webhook processing
   - Outbox pattern for message delivery
   - Transaction boundaries for message state changes

#### Prompt 5: LLM Orchestrator Service
Create a comprehensive LLM orchestration service:

1. **Provider Abstraction:**
   ```typescript
   interface LLMProvider {
     name: string;
     generateResponse(request: LLMRequest): Promise<LLMResponse>;
     getEmbedding(text: string): Promise<number[]>;
     streamResponse(request: LLMRequest): AsyncIterable<string>;
   }
   ```

2. **Provider Implementations:**
   - OpenRouter (existing)
   - OpenAI direct
   - Anthropic Claude
   - Local/self-hosted models

3. **RAG Pipeline:**
   - Document ingestion and chunking
   - Embedding generation and storage
   - Context retrieval with relevance scoring
   - Prompt template management

4. **Usage Tracking:**
   - Token counting and cost calculation
   - Rate limiting per agent/user
   - Usage analytics and reporting

5. **Caching & Performance:**
   - Response caching for common queries
   - Embedding cache
   - Connection pooling for providers

### Phase 3: Advanced Features & Production Readiness (Weeks 5-8)

#### Prompt 6: Vector Database & RAG Implementation
Implement production-grade RAG with vector database:

1. **Vector Database Setup:**
   - Qdrant integration with docker-compose
   - Collection management per agent
   - Index configuration and optimization

2. **Document Processing Pipeline:**
   - File upload handling (PDF, DOCX, TXT, CSV)
   - Text extraction and cleaning
   - Intelligent chunking strategies
   - Metadata extraction and storage

3. **Embedding Pipeline:**
   - Batch embedding generation
   - Embedding model management
   - Vector similarity search optimization
   - Context ranking and filtering

4. **RAG Query Engine:**
   - Hybrid search (vector + keyword)
   - Context window management
   - Source attribution in responses
   - Relevance scoring and filtering

#### Prompt 7: Monitoring, Logging & Observability
Implement comprehensive observability:

1. **Structured Logging:**
   ```typescript
   const logger = createLogger({
     service: 'ai-agent-platform',
     version: '1.0.0',
     environment: process.env.NODE_ENV
   });

   logger.info('Processing message', {
     correlationId,
     agentId,
     conversationId,
     messageId,
     platform,
     latency: Date.now() - startTime
   });
   ```

2. **Metrics & Analytics:**
   - Business metrics: messages/day, response time, user engagement
   - Technical metrics: error rates, queue depths, DB performance
   - Agent performance: resolution rate, customer satisfaction

3. **Distributed Tracing:**
   - OpenTelemetry integration
   - Trace propagation across services
   - Performance bottleneck identification

4. **Error Tracking:**
   - Sentry integration for error monitoring
   - Error categorization and alerting
   - Performance monitoring

5. **Health Checks:**
   - Service health endpoints
   - Database connection monitoring
   - External service dependency checks

#### Prompt 8: Security, Rate Limiting & Production Hardening
Implement production-grade security and reliability:

1. **Authentication & Authorization:**
   - JWT token validation middleware
   - API key management system
   - Role-based access control (RBAC)
   - Service-to-service authentication

2. **Rate Limiting:**
   - Redis-based sliding window rate limiting
   - Per-user, per-agent, and global limits
   - Different tiers based on subscription
   - Rate limit headers in responses

3. **Input Validation & Sanitization:**
   - XSS prevention
   - SQL injection prevention (already handled by Supabase)
   - File upload validation
   - Content filtering for inappropriate content

4. **Secrets Management:**
   - Environment variable validation
   - Secret rotation procedures
   - Encrypted storage for sensitive data

5. **Production Configuration:**
   - Docker containerization
   - Environment-specific configs
   - Health checks and graceful shutdown
   - Performance optimization settings

### Phase 4: Testing, Deployment & Go-Live (Weeks 8-10)

#### Prompt 9: Comprehensive Testing Suite
Build a complete testing framework:

1. **Unit Tests:**
   - Service layer unit tests with mocks
   - Repository pattern tests
   - Utility function tests
   - 80%+ code coverage target

2. **Integration Tests:**
   - Database integration tests
   - LLM provider integration tests
   - External API integration tests

3. **E2E Tests:**
   - Complete message flow testing
   - Webhook simulation tests
   - User journey tests
   - Performance regression tests

4. **Load Testing:**
   - Concurrent user simulation
   - Message throughput testing
   - Database performance under load
   - Breaking point identification

5. **Test Infrastructure:**
   - Test database setup/teardown
   - Mock external services
   - CI/CD pipeline integration

#### Prompt 10: Deployment & Launch Preparation
Prepare for production deployment:

1. **Deployment Infrastructure:**
   - Docker containerization for all services
   - Kubernetes manifests (optional)
   - Database migration scripts
   - Environment configuration management

2. **CI/CD Pipeline:**
   - GitHub Actions workflows
   - Automated testing on PR
   - Staging deployment automation
   - Production deployment with rollback

3. **Monitoring & Alerting:**
   - Production monitoring dashboard
   - Alert rules for critical issues
   - On-call procedures
   - Incident response playbook

4. **Documentation:**
   - API documentation (OpenAPI)
   - Developer onboarding guide
   - Production operations guide
   - User documentation

5. **Launch Checklist:**
   - Security audit
   - Performance baseline
   - Backup and recovery procedures
   - Customer support procedures

## Success Metrics & KPIs

### Technical Metrics:
- **Availability:** 99.9% uptime SLA
- **Performance:** <2s P95 response time for messages
- **Reliability:** <0.1% message loss rate
- **Scalability:** Support 10,000 concurrent conversations

### Business Metrics:
- **User Engagement:** >70% DAU/MAU ratio
- **Agent Effectiveness:** >85% successful resolution rate
- **Platform Growth:** Support 5+ agent types by Q2
- **Revenue Impact:** Enable $10K+ MRR within 6 months

## Risk Mitigation:

1. **Technical Risks:**
   - **Database Migration:** Comprehensive backup and rollback procedures
   - **Service Dependencies:** Circuit breakers and fallback mechanisms
   - **Scaling Issues:** Horizontal scaling architecture from day one

2. **Business Risks:**
   - **User Adoption:** Beta program with key customers
   - **Competition:** Focus on superior UX and reliability
   - **Market Changes:** Flexible architecture for rapid feature development

This implementation plan provides a clear path from the current 5.5/10 codebase to a production-ready 9/10 platform that can scale with your business needs.