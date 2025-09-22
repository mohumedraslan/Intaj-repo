# Windsurf Implementation Prompts - AI Agent Platform Transformation

## Phase 1: Foundation & Architecture (Prompts 1-3)

### Prompt 1: Service Layer Architecture & Repository Pattern

**CRITICAL:** This prompt establishes the foundation. Execute this first and ensure it's working before proceeding.

```
I need you to transform our monolithic Next.js API routes into a proper service-oriented architecture. Create a comprehensive service layer with repository pattern and proper separation of concerns.

TASKS TO COMPLETE:

1. **Create Service Layer Structure:**
   - `src/services/base/BaseService.ts` - Abstract base class with common patterns
   - `src/services/userService.ts` - User management, profiles, authentication
   - `src/services/agentService.ts` - Agent CRUD, configurations, templates
   - `src/services/integrationService.ts` - Multi-platform integrations
   - `src/services/llmService.ts` - LLM provider abstraction and orchestration
   - `src/services/messageService.ts` - Message handling, conversations

2. **Create Repository Layer:**
   - `src/repositories/base/BaseRepository.ts` - Abstract repository with CRUD operations
   - `src/repositories/UserRepository.ts`
   - `src/repositories/AgentRepository.ts`
   - `src/repositories/MessageRepository.ts`
   - `src/repositories/ConversationRepository.ts`
   - `src/repositories/ConnectionRepository.ts`

3. **Implement Transaction Management:**
   - `src/lib/database/transaction.ts` - Database transaction utilities
   - Error handling and rollback mechanisms
   - Connection pooling optimization

4. **Service Implementation Guidelines:**
   - Each service should handle business logic only
   - Services call repositories, never direct DB access
   - Proper error handling with custom error classes
   - Logging with correlation IDs
   - Input validation before processing

5. **BaseService Implementation:**
```typescript
export abstract class BaseService {
  protected logger: Logger;
  
  constructor(protected name: string) {
    this.logger = createLogger({ service: name });
  }
  
  protected async withTransaction<T>(
    operation: (client: SupabaseClient) => Promise<T>
  ): Promise<T> {
    // Implement transaction wrapper
  }
  
  protected handleError(error: unknown, context: Record<string, any>): never {
    // Standardized error handling
  }
}
```

6. **Update All Existing API Routes:**
   - Refactor ALL routes in `src/app/api/` to use new service layer
   - Remove direct database calls from route handlers
   - Maintain backward compatibility
   - Add proper TypeScript types throughout

Requirements:
- Use existing Supabase client configuration
- Maintain all current functionality
- Add comprehensive TypeScript types
- Include JSDoc documentation for all public methods
- Follow existing code style and patterns
```

### Prompt 2: Database Schema Normalization & Migration

```
I need you to normalize our database schema, fix all legacy naming issues, and create proper migration scripts. The current schema has inconsistencies between 'chatbots' vs 'agents' naming and missing relationships.

TASKS TO COMPLETE:

1. **Schema Analysis & Migration Planning:**
   - Audit current schema using the provided table information
   - Create comprehensive migration plan to fix naming inconsistencies
   - Ensure all foreign keys and indexes are properly defined

2. **Create Master Migration Script:**
   ```sql
   -- File: db/migrations/001_normalize_schema.sql
   
   -- Rename chatbots to agents (if not already done)
   -- Standardize connections.config vs connections.credentials
   -- Add missing foreign key constraints
   -- Create missing indexes
   -- Update RLS policies
   ```

3. **Add New Required Tables:**
   ```sql
   -- Agent Templates for different business roles
   CREATE TABLE agent_templates (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     type TEXT NOT NULL CHECK (type IN ('customer_support', 'sales', 'marketing', 'hr', 'technical_support')),
     name TEXT NOT NULL,
     description TEXT,
     base_prompt TEXT NOT NULL,
     default_config JSONB DEFAULT '{}',
     available_tools JSONB DEFAULT '[]',
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Deployment tracking
   CREATE TABLE deployments (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
     version INTEGER NOT NULL DEFAULT 1,
     config_snapshot JSONB NOT NULL,
     status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'failed')),
     deployed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     deployed_by UUID REFERENCES profiles(id)
   );

   -- Enhanced usage tracking
   CREATE TABLE usage_logs (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
     conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
     provider TEXT NOT NULL,
     model TEXT NOT NULL,
     tokens_input INTEGER DEFAULT 0,
     tokens_output INTEGER DEFAULT 0,
     cost_usd DECIMAL(10,6),
     latency_ms INTEGER,
     request_id TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

4. **Performance Optimization:**
   - Add composite indexes for common query patterns:
     ```sql
     -- Message querying patterns
     CREATE INDEX idx_messages_agent_status_created ON messages(agent_id, status, created_at DESC);
     CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
     
     -- Conversation patterns
     CREATE INDEX idx_conversations_agent_last_message ON conversations(agent_id, last_message_at DESC NULLS LAST);
     
     -- Usage analytics
     CREATE INDEX idx_usage_logs_agent_date ON usage_logs(agent_id, created_at DESC);
     ```

5. **Data Migration Scripts:**
   - Create safe data migration procedures
   - Backup existing data before migration
   - Validation scripts to ensure data integrity
   - Rollback procedures in case of issues

6. **Update All Code References:**
   - Search and replace all legacy table references
   - Update all service and repository classes
   - Fix any broken foreign key relationships
   - Ensure RLS policies work with new schema

7. **Schema Validation:**
   - Create validation queries to check schema correctness
   - Add constraints to prevent future schema drift
   - Document the final schema structure

Requirements:
- All migrations must be reversible
- Include comprehensive validation
- Maintain data integrity throughout
- Update all existing code to use new schema
- Test all existing functionality after migration
```

### Prompt 3: API Standardization, Validation & Error Handling

```
I need you to standardize all our API endpoints with proper validation, error handling, and API versioning. Create a comprehensive middleware stack and validation system.

TASKS TO COMPLETE:

1. **Create Zod Validation Schemas:**
   ```typescript
   // File: src/schemas/agent.ts
   export const CreateAgentSchema = z.object({
     name: z.string().min(2, 'Name must be at least 2 characters').max(100),
     type: z.enum(['customer_support', 'sales', 'marketing', 'hr', 'technical_support']),
     base_prompt: z.string().min(10).max(4000),
     model: z.string().default('gpt-4o'),
     settings: z.object({
       temperature: z.number().min(0).max(2).default(0.7),
       max_tokens: z.number().min(100).max(4000).default(1000),
       timeout_ms: z.number().min(5000).max(30000).default(10000)
     }).optional()
   });

   // File: src/schemas/integration.ts
   export const TelegramSetupSchema = z.object({
     agentId: z.string().uuid(),
     botToken: z.string().regex(/^\d+:[A-Za-z0-9_-]{35}$/, 'Invalid Telegram bot token'),
     autoSetWebhook: z.boolean().default(true)
   });
   ```

2. **Create Comprehensive Middleware Stack:**
   ```typescript
   // File: src/middleware/apiMiddleware.ts
   export function withApiMiddleware(handler: ApiHandler) {
     return async (req: NextRequest) => {
       const startTime = Date.now();
       const correlationId = generateCorrelationId();
       
       try {
         // 1. Authentication
         const user = await authenticateRequest(req);
         
         // 2. Rate limiting
         await checkRateLimit(req, user?.id);
         
         // 3. Request validation
         const validatedData = await validateRequest(req);
         
         // 4. Execute handler
         const response = await handler({
           req,
           user,
           data: validatedData,
           correlationId
         });
         
         // 5. Log successful request
         logApiRequest({
           method: req.method,
           url: req.url,
           userId: user?.id,
           correlationId,
           latency: Date.now() - startTime,
           status: 'success'
         });
         
         return response;
         
       } catch (error) {
         return handleApiError(error, correlationId);
       }
     };
   }
   ```

3. **Standardized Error System:**
   ```typescript
   // File: src/lib/errors.ts
   export class ApiError extends Error {
     constructor(
       public code: string,
       public message: string,
       public statusCode: number = 400,
       public details?: Record<string, any>
     ) {
       super(message);
     }
   }

   export class ValidationError extends ApiError {
     constructor(errors: ZodError) {
       super('VALIDATION_ERROR', 'Validation failed', 422, {
         fieldErrors: errors.flatten().fieldErrors
       });
     }
   }
   ```

4. **API Response Wrapper:**
   ```typescript
   // File: src/lib/apiResponse.ts
   export interface ApiResponse<T = any> {
     success: boolean;
     data?: T;
     error?: {
       code: string;
       message: string;
       details?: Record<string, any>;
     };
     metadata?: {
       correlationId: string;
       timestamp: string;
       version: string;
     };
   }

   export function createSuccessResponse<T>(
     data: T,
     metadata?: Record<string, any>
   ): NextResponse<ApiResponse<T>> {
     // Implementation
   }
   ```

5. **Refactor ALL API Routes to v1:**
   - Move all routes from `/api/*` to `/api/v1/*`
   - Apply validation middleware to all routes
   - Implement proper error handling
   - Add OpenAPI documentation comments

6. **Create Rate Limiting System:**
   ```typescript
   // File: src/lib/rateLimiter.ts
   interface RateLimitConfig {
     windowMs: number;
     maxRequests: number;
     keyGenerator: (req: NextRequest) => string;
   }

   export class RateLimiter {
     // Redis-based sliding window rate limiting
   }
   ```

7. **Authentication Middleware:**
   - JWT token validation
   - API key authentication for internal services
   - Role-based access control
   - Service-to-service authentication

8. **Update All Existing Routes:**
   - Apply new middleware to all routes
   - Add proper validation schemas
   - Implement standardized error responses
   - Add correlation ID tracking

Requirements:
- All endpoints must use validation middleware
- Proper HTTP status codes (200, 201, 400, 401, 422, 500)
- Comprehensive error logging
- Rate limiting implementation
- Backward compatibility during transition
```

## Phase 2: Integration Gateway & LLM Orchestration (Prompts 4-6)

### Prompt 4: Integration Gateway with Multi-Platform Support

```
I need you to build a robust, extensible Integration Gateway that can handle multiple messaging platforms (Telegram, WhatsApp, etc.) with proper error handling, rate limiting, and message queuing.

TASKS TO COMPLETE:

1. **Platform Adapter Interface:**
   ```typescript
   // File: src/integrations/base/PlatformAdapter.ts
   export interface PlatformAdapter {
     platform: string;
     
     setupWebhook(config: PlatformConfig): Promise<WebhookSetupResult>;
     processInbound(payload: WebhookPayload): Promise<InboundMessage>;
     sendOutbound(message: OutboundMessage): Promise<SendResult>;
     validateWebhook(payload: any, signature?: string): boolean;
     
     // Rate limiting and error handling
     getRateLimit(): RateLimitInfo;
     handleError(error: PlatformError): Promise<ErrorResponse>;
   }
   ```

2. **Enhanced Telegram Adapter:**
   ```typescript
   // File: src/integrations/telegram/TelegramAdapter.ts
   export class TelegramAdapter implements PlatformAdapter {
     platform = 'telegram';
     
     async setupWebhook(config: TelegramConfig): Promise<WebhookSetupResult> {
       // Validate bot token format and test connection
       // Set webhook with proper URL and certificate handling
       // Handle rate limiting (30 requests/second for Telegram)
       // Store webhook configuration in database
       // Return detailed setup result with status
     }
     
     async processInbound(payload: TelegramUpdate): Promise<InboundMessage> {
       // Validate webhook signature if secret is set
       // Extract message content and metadata
       // Handle different message types (text, media, commands)
       // Deduplicate by update_id
       // Return standardized InboundMessage
     }
     
     async sendOutbound(message: OutboundMessage): Promise<SendResult> {
       // Convert to Telegram API format
       // Handle message formatting and mentions
       // Implement retry logic with exponential backoff
       // Track delivery status
     }
   }
   ```

3. **WhatsApp Business API Adapter:**
   ```typescript
   // File: src/integrations/whatsapp/WhatsAppAdapter.ts
   export class WhatsAppAdapter implements PlatformAdapter {
     platform = 'whatsapp';
     
     // Implement WhatsApp Business API integration
     // Handle webhook verification
     // Support message templates
     // Media message handling
   }
   ```

4. **Message Queue System:**
   ```typescript
   // File: src/lib/queue/MessageQueue.ts
   export class MessageQueue {
     private queues = {
       inbound: 'messages:inbound',
       processing: 'messages:processing', 
       outbound: 'messages:outbound',
       dlq: 'messages:failed'
     };
     
     async enqueueInbound(message: InboundMessage): Promise<void> {
       // Add to inbound queue with priority
       // Set up retry policy
       // Add correlation tracking
     }
     
     async processInbound(): Promise<void> {
       // Process messages from inbound queue
       // Call LLM service for response generation
       // Move to outbound queue
       // Handle errors and move to DLQ
     }
   }
   ```

5. **Integration Gateway Service:**
   ```typescript
   // File: src/services/integrationGateway.ts
   export class IntegrationGatewayService extends BaseService {
     private adapters: Map<string, PlatformAdapter> = new Map();
     
     constructor() {
       super('IntegrationGateway');
       this.registerAdapters();
     }
     
     async setupIntegration(agentId: string, platform: string, config: any) {
       // Validate agent exists and user has permission
       // Get platform adapter
       // Setup webhook and store configuration
       // Update connection status in database
     }
     
     async processWebhook(platform: string, payload: any) {
       // Get appropriate adapter
       // Validate webhook
       // Process message and enqueue
       // Return appropriate HTTP response
     }
   }
   ```

6. **Webhook Endpoints Refactor:**
   - Update `/api/v1/webhooks/telegram/[agentId]` with proper error handling
   - Add `/api/v1/webhooks/whatsapp/[agentId]` endpoint
   - Implement idempotency using Redis
   - Add webhook signature validation
   - Proper logging with correlation IDs

7. **Message Processing Workers:**
   - Create background workers for queue processing
   - Implement proper error handling and retries
   - Add metrics and monitoring
   - Dead letter queue handling

Requirements:
- All webhook processing must be idempotent
- Proper rate limiting per platform
- Comprehensive error handling and logging
- Support for message deduplication
- Extensible architecture for new platforms
```

### Prompt 5: LLM Orchestrator & Provider Abstraction

```
I need you to create a comprehensive LLM Orchestrator service that abstracts different AI providers, handles RAG (Retrieval Augmented Generation), manages prompts, and tracks usage with proper error handling and caching.

TASKS TO COMPLETE:

1. **LLM Provider Interface:**
   ```typescript
   // File: src/llm/base/LLMProvider.ts
   export interface LLMProvider {
     name: string;
     models: string[];
     
     generateResponse(request: LLMRequest): Promise<LLMResponse>;
     generateStreamResponse(request: LLMRequest): AsyncIterable<LLMStreamChunk>;
     getEmbedding(text: string, model?: string): Promise<number[]>;
     getTokenCount(text: string, model: string): Promise<number>;
     
     // Provider-specific capabilities
     supportsStreaming(): boolean;
     supportsEmbedding(): boolean;
     getMaxTokens(model: string): number;
     getCostPerToken(model: string): { input: number; output: number };
   }
   ```

2. **Provider Implementations:**
   ```typescript
   // File: src/llm/providers/OpenRouterProvider.ts
   export class OpenRouterProvider implements LLMProvider {
     name = 'openrouter';
     models = ['openai/gpt-4o', 'anthropic/claude-3-sonnet', 'meta-llama/llama-3-70b'];
     
     async generateResponse(request: LLMRequest): Promise<LLMResponse> {
       // Enhanced OpenRouter integration
       // Proper error handling for rate limits
       // Token counting and cost calculation
       // Response validation
     }
   }
   
   // File: src/llm/providers/OpenAIProvider.ts
   export class OpenAIProvider implements LLMProvider {
     // Direct OpenAI API integration
   }
   
   // File: src/llm/providers/AnthropicProvider.ts
   export class AnthropicProvider implements LLMProvider {
     // Claude API integration
   }
   ```

3. **Prompt Template System:**
   ```typescript
   // File: src/llm/prompts/PromptTemplate.ts
   export class PromptTemplate {
     constructor(
       public name: string,
       public template: string,
       public variables: string[],
       public version: number = 1
     ) {}
     
     render(variables: Record<string, any>): string {
       // Render template with variables
       // Validate required variables
       // Handle escaping and formatting
     }
     
     validate(variables: Record<string, any>): ValidationResult {
       // Validate template variables
     }
   }
   
   // File: src/llm/prompts/AgentPrompts.ts
   export const CUSTOMER_SUPPORT_PROMPT = new PromptTemplate(
     'customer_support',
     `You are a helpful customer support agent for {{company_name}}.
     Your role is to assist customers with their inquiries professionally and efficiently.
     
     Company Information:
     {{company_info}}
     
     Knowledge Base:
     {{knowledge_base}}
     
     Current conversation context:
     {{conversation_history}}
     
     Customer message: {{user_message}}
     
     Instructions:
     - Be polite and professional
     - Provide accurate information based on the knowledge base
     - If you don't know something, admit it and offer to escalate
     - Keep responses concise but helpful`,
     ['company_name', 'company_info', 'knowledge_base', 'conversation_history', 'user_message']
   );
   ```

4. **RAG (Retrieval Augmented Generation) System:**
   ```typescript
   // File: src/llm/rag/RAGService.ts
   export class RAGService {
     async retrieveContext(
       query: string, 
       agentId: string, 
       maxResults: number = 5
     ): Promise<RetrievedDocument[]> {
       // Generate query embedding
       // Search vector database
       // Rank results by relevance
       // Return formatted context
     }
     
     async ingestDocument(
       agentId: string,
       content: string,
       metadata: DocumentMetadata
     ): Promise<void> {
       // Chunk document intelligently
       // Generate embeddings
       // Store in vector database
       // Update agent's knowledge base
     }
   }
   ```

5. **LLM Orchestrator Service:**
   ```typescript
   // File: src/services/llmService.ts
   export class LLMService extends BaseService {
     private providers: Map<string, LLMProvider> = new Map();
     private cache: LLMResponseCache;
     private ragService: RAGService;
     
     async generateAgentResponse(request: AgentMessageRequest): Promise<AgentResponse> {
       try {
         // 1. Get agent configuration
         const agent = await this.agentRepository.findById(request.agentId);
         
         // 2. Retrieve RAG context if enabled
         const context = agent.settings.enableRAG 
           ? await this.ragService.retrieveContext(request.message, agent.id)
           : [];
         
         // 3. Build prompt from template
         const prompt = this.buildPrompt(agent, request.message, context);
         
         // 4. Check cache
         const cacheKey = this.generateCacheKey(prompt, agent.model);
         const cached = await this.cache.get(cacheKey);
         if (cached) return cached;
         
         // 5. Call LLM provider
         const provider = this.getProvider(agent.provider);
         const llmResponse = await provider.generateResponse({
           messages: prompt,
           model: agent.model,
           temperature: agent.settings.temperature,
           maxTokens: agent.settings.maxTokens
         });
         
         // 6. Log usage and cost
         await this.logUsage(agent.id, request.conversationId, llmResponse);
         
         // 7. Cache response
         await this.cache.set(cacheKey, llmResponse);
         
         return llmResponse;
         
       } catch (error) {
         await this.handleLLMError(error, request);
         throw error;
       }
     }
   }
   ```

6. **Usage Tracking & Analytics:**
   ```typescript
   // File: src/services/usageTrackingService.ts
   export class UsageTrackingService extends BaseService {
     async logUsage(usage: UsageLog): Promise<void> {
       // Store detailed usage metrics
       // Calculate costs
       // Update user quotas
       // Trigger alerts for high usage
     }
     
     async getUserUsage(userId: string, period: DateRange): Promise<UsageReport> {
       // Generate usage reports
       // Cost analysis
       // Performance metrics
     }
   }
   ```

7. **LLM Response Caching:**
   ```typescript
   // File: src/llm/cache/LLMCache.ts
   export class LLMResponseCache {
     async get(key: string): Promise<LLMResponse | null> {
       // Redis-based caching
       // TTL based on content type
       // Cache invalidation strategies
     }
   }
   ```

8. **Error Handling & Retry Logic:**
   - Exponential backoff for rate limits
   - Fallback providers for high availability
   - Circuit breaker pattern for failed providers
   - Detailed error logging and metrics

Requirements:
- Support multiple LLM providers simultaneously
- Implement comprehensive caching strategy
- Track token usage and costs accurately
- Handle rate limiting gracefully
- Support streaming responses
- Comprehensive error handling and logging
```

### Prompt 6: Vector Database & Advanced RAG Implementation

```
I need you to implement a production-grade RAG (Retrieval Augmented Generation) system with vector database integration, document processing pipeline, and intelligent context retrieval for our AI agents.

TASKS TO COMPLETE:

1. **Vector Database Setup & Configuration:**
   ```typescript
   // File: src/vectordb/VectorDBClient.ts
   export class VectorDBClient {
     private client: QdrantClient;
     
     constructor() {
       this.client = new QdrantClient({
         host: process.env.QDRANT_HOST || 'localhost',
         port: process.env.QDRANT_PORT || 6333
       });
     }
     
     async createCollection(agentId: string): Promise<void> {
       // Create collection per agent
       // Configure vector dimensions (1536 for OpenAI embeddings)
       // Set distance metric (cosine similarity)
       // Configure indexing parameters
     }
     
     async upsertDocuments(
       agentId: string,
       documents: VectorDocument[]
     ): Promise<void> {
       // Batch insert documents with embeddings
       // Handle duplicate detection
       // Update existing documents
     }
     
     async searchSimilar(
       agentId: string,
       queryVector: number[],
       limit: number = 10,
       threshold: number = 0.7
     ): Promise<SearchResult[]> {
       // Perform vector similarity search
       // Apply relevance threshold
       // Return ranked results with metadata
     }
   }
   ```

2. **Document Processing Pipeline:**
   ```typescript
   // File: src/document/DocumentProcessor.ts
   export class DocumentProcessor {
     private chunkingStrategies: Map<string, ChunkingStrategy> = new Map();
     
     async processDocument(
       file: File,
       agentId: string,
       metadata: DocumentMetadata
     ): Promise<ProcessingResult> {
       try {
         // 1. Extract text based on file type
         const text = await this.extractText(file);
         
         // 2. Clean and normalize text
         const cleanedText = this.cleanText(text);
         
         // 3. Chunk document intelligently
         const chunks = await this.chunkDocument(cleanedText, file.type);
         
         // 4. Generate embeddings for each chunk
         const embeddings = await this.generateEmbeddings(chunks);
         
         // 5. Store in vector database
         await this.vectorDB.upsertDocuments(agentId, embeddings);
         
         // 6. Update agent's knowledge base metadata
         await this.updateKnowledgeBase(agentId, metadata);
         
         return { success: true, chunksProcessed: chunks.length };
         
       } catch (error) {
         this.logger.error('Document processing failed', { error, agentId });
         throw new DocumentProcessingError(error.message);
       }
     }
     
     private async extractText(file: File): Promise<string> {
       switch (file.type) {
         case 'application/pdf':
           return this.extractFromPDF(file);
         case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
           return this.extractFromDOCX(file);
         case 'text/csv':
           return this.extractFromCSV(file);
         case 'text/plain':
           return file.text();
         default:
           throw new UnsupportedFileTypeError(file.type);
       }
     }
   }
   ```

3. **Intelligent Chunking Strategies:**
   ```typescript
   // File: src/document/chunking/ChunkingStrategy.ts
   export abstract class ChunkingStrategy {
     abstract chunk(text: string, metadata?: any): Promise<TextChunk[]>;
   }
   
   // File: src/document/chunking/SemanticChunking.ts
   export class SemanticChunking extends ChunkingStrategy {
     async chunk(text: string): Promise<TextChunk[]> {
       // Split by semantic boundaries (sentences, paragraphs)
       // Maintain context overlap between chunks
       // Optimize chunk size for embedding models
       // Preserve document structure
     }
   }
   
   // File: src/document/chunking/FAQChunking.ts
   export class FAQChunking extends ChunkingStrategy {
     async chunk(text: string): Promise<TextChunk[]> {
       // Specialized for FAQ documents
       // Each Q&A pair becomes a chunk
       // Extract questions and answers separately
     }
   }
   ```

4. **Advanced Context Retrieval:**
   ```typescript
   // File: src/rag/ContextRetriever.ts
   export class ContextRetriever {
     async retrieveRelevantContext(
       query: string,
       agentId: string,
       options: RetrievalOptions = {}
     ): Promise<RetrievedContext> {
       try {
         // 1. Generate query embedding
         const queryEmbedding = await this.embeddings.getEmbedding(query);
         
         // 2. Perform vector search
         const similarDocs = await this.vectorDB.searchSimilar(
           agentId,
           queryEmbedding,
           options.maxResults || 5,
           options.threshold || 0.7
         );
         
         // 3. Re-rank results using hybrid approach
         const rerankedDocs = await this.rerank(query, similarDocs);
         
         // 4. Apply context window optimization
         const optimizedContext = this.optimizeContextWindow(
           rerankedDocs,
           options.maxTokens || 2000
         );
         
         return {
           documents: optimizedContext,
           totalRelevance: this.calculateRelevanceScore(optimizedContext),
           sources: this.extractSources(optimizedContext)
         };
         
       } catch (error) {
         this.logger.error('Context retrieval failed', { error, query, agentId });
         return { documents: [], totalRelevance: 0, sources: [] };
       }
     }
     
     private async rerank(query: string, documents: SearchResult[]): Promise<SearchResult[]> {
       // Implement hybrid ranking combining:
       // - Vector similarity scores
       // - BM25 keyword matching
       // - Recency scores
       // - Document type preferences
     }
   }
   ```

5. **Embedding Management Service:**
   ```typescript
   // File: src/embeddings/EmbeddingService.ts
   export class EmbeddingService extends BaseService {
     private providers: Map<string, EmbeddingProvider> = new Map();
     private cache: EmbeddingCache;
     
     async generateEmbedding(
       text: string,
       model: string = 'text-embedding-ada-002'
     ): Promise<number[]> {
       // Check cache first
       const cacheKey = this.generateCacheKey(text, model);
       const cached = await this.cache.get(cacheKey);
       if (cached) return cached;
       
       // Generate new embedding
       const provider = this.getProvider(model);
       const embedding = await provider.generateEmbedding(text);
       
       // Cache result
       await this.cache.set(cacheKey, embedding);
       
       return embedding;
     }
     
     async batchGenerateEmbeddings(
       texts: string[],
       model: string
     ): Promise<number[][]> {
       // Batch processing for efficiency
       // Handle rate limiting
       // Parallel processing where possible
     }
   }
   ```

6. **Knowledge Base Management:**
   ```typescript
   // File: src/services/knowledgeBaseService.ts
   export class KnowledgeBaseService extends BaseService {
     async addDocument(
       agentId: string,
       file: File,
       metadata: DocumentMetadata
     ): Promise<Document> {
       // Validate user permissions
       // Process document
       // Update agent's knowledge base
       // Trigger reindexing if needed
     }
     
     async removeDocument(agentId: string, documentId: string): Promise<void> {
       // Remove from vector database
       // Update agent configuration
       // Clean up orphaned embeddings
     }
     
     async updateDocument(
       agentId: string,
       documentId: string,
       file: File
     ): Promise<Document> {
       // Version control for documents
       // Incremental updates
       // Preserve document history
     }
     
     async searchKnowledgeBase(
       agentId: string,
       query: string
     ): Promise<SearchResults> {
       // Search across agent's knowledge base
       // Return formatted results with sources
       // Track search analytics
     }
   }
   ```

7. **Document Upload & Management API:**
   ```typescript
   // File: src/app/api/v1/agents/[id]/knowledge-base/route.ts
   export async function POST(
     req: NextRequest,
     { params }: { params: { id: string } }
   ) {
     return withApiMiddleware(async ({ user, correlationId }) => {
       // Handle file uploads
       // Validate file types and sizes
       // Process documents asynchronously
       // Return upload status
     })(req);
   }
   ```

8. **Performance Optimization:**
   - Implement connection pooling for vector DB
   - Batch processing for embeddings
   - Caching strategies for frequently accessed documents
   - Async processing for large documents

Requirements:
- Support PDF, DOCX, TXT, CSV file types
- Intelligent chunking based on document type
- Vector similarity search with configurable thresholds
- Document versioning and update capabilities
- Comprehensive error handling and logging
- Performance optimization for large knowledge bases
```

## Phase 3: Production Features & Reliability (Prompts 7-8)

### Prompt 7: Monitoring, Logging & Observability System

```
I need you to implement a comprehensive observability system with structured logging, metrics, distributed tracing, and monitoring dashboards for our AI agent platform.

TASKS TO COMPLETE:

1. **Structured Logging System:**
   ```typescript
   // File: src/lib/logging/Logger.ts
   export interface LogContext {
     correlationId?: string;
     userId?: string;
     agentId?: string;
     conversationId?: string;
     messageId?: string;
     platform?: string;
     [key: string]: any;
   }
   
   export class Logger {
     private pino: pino.Logger;
     
     constructor(private service: string) {
       this.pino = pino({
         name: service,
         level: process.env.LOG_LEVEL || 'info',
         formatters: {
           level: (label) => ({ level: label }),
         },
         timestamp: pino.stdTimeFunctions.isoTime,
         ...(process.env.NODE_ENV === 'production' && {
           redact: ['password', 'token', 'apiKey', 'secret']
         })
       });
     }
     
     info(message: string, context?: LogContext): void {
       this.pino.info(context, message);
     }
     
     error(message: string, context?: LogContext & { error?: Error }): void {
       this.pino.error(context, message);
     }
     
     warn(message: string, context?: LogContext): void {
       this.pino.warn(context, message);
     }
     
     debug(message: string, context?: LogContext): void {
       this.pino.debug(context, message);
     }
   }
   
   // File: src/lib/logging/index.ts
   export function createLogger(service: string): Logger {
     return new Logger(service);
   }
   ```

2. **Metrics Collection System:**
   ```typescript
   // File: src/lib/metrics/MetricsCollector.ts
   export class MetricsCollector {
     private static instance: MetricsCollector;
     private metrics: Map<string, any> = new Map();
     
     static getInstance(): MetricsCollector {
       if (!this.instance) {
         this.instance = new MetricsCollector();
       }
       return this.instance;
     }
     
     // Counter metrics
     incrementCounter(name: string, labels?: Record<string, string>): void {
       // Track: messages_processed_total, api_requests_total, errors_total
     }
     
     // Histogram metrics  
     recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
       // Track: response_time_ms, llm_latency_ms, queue_processing_time
     }
     
     // Gauge metrics
     setGauge(name: string, value: number, labels?: Record<string, string>): void {
       // Track: active_conversations, queue_depth, agent_count
     }
     
     async exportMetrics(): Promise<string> {
       // Export in Prometheus format
     }
   }
   
   // File: src/lib/metrics/businessMetrics.ts
   export class BusinessMetrics {
     static async trackMessageProcessed(agentId: string, platform: string): Promise<void> {
       MetricsCollector.getInstance().incrementCounter('messages_processed_total', {
         agent_id: agentId,
         platform
       });
     }
     
     static async trackLLMLatency(provider: string, model: string, latency: number): Promise<void> {
       MetricsCollector.getInstance().recordHistogram('llm_response_time_ms', latency, {
         provider,
         model
       });
     }
   }
   ```

3. **Distributed Tracing with OpenTelemetry:**
   ```typescript
   // File: src/lib/tracing/tracer.ts
   import { NodeSDK } from '@opentelemetry/sdk-node';
   import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
   
   export class TracingService {
     private sdk: NodeSDK;
     
     constructor() {
       this.sdk = new NodeSDK({
         instrumentations: [
           getNodeAutoInstrumentations({
             '@opentelemetry/instrumentation-fs': { enabled: false },
           }),
         ],
         serviceName: 'ai-agent-platform',
         serviceVersion: process.env.APP_VERSION || '1.0.0',
       });
     }
     
     start(): void {
       this.sdk.start();
     }
     
     async createSpan<T>(
       name: string,
       operation: (span: any) => Promise<T>,
       attributes?: Record<string, any>
     ): Promise<T> {
       // Create and manage spans for operations
       // Add custom attributes
       // Handle errors and span status
     }
   }
   ```

4. **Performance Monitoring Middleware:**
   ```typescript
   // File: src/middleware/performanceMiddleware.ts
   export function withPerformanceMonitoring<T>(
     operationName: string,
     handler: () => Promise<T>
   ): Promise<T> {
     return TracingService.createSpan(operationName, async (span) => {
       const startTime = Date.now();
       
       try {
         const result = await handler();
         
         const duration = Date.now() - startTime;
         MetricsCollector.getInstance().recordHistogram(
           'operation_duration_ms',
           duration,
           { operation: operationName }
         );
         
         span.setStatus({ code: 'OK' });
         return result;
         
       } catch (error) {
         const duration = Date.now() - startTime;
         
         MetricsCollector.getInstance().incrementCounter('operation_errors_total', {
           operation: operationName,
           error_type: error.constructor.name
         });
         
         span.setStatus({ code: 'ERROR', message: error.message });
         throw error;
       }
     });
   }
   ```

5. **Health Check System:**
   ```typescript
   // File: src/lib/health/HealthChecker.ts
   export interface HealthCheck {
     name: string;
     check(): Promise<HealthStatus>;
   }
   
   export class HealthChecker {
     private checks: HealthCheck[] = [];
     
     addCheck(check: HealthCheck): void {
       this.checks.push(check);
     }
     
     async checkHealth(): Promise<HealthReport> {
       const results = await Promise.allSettled(
         this.checks.map(async (check) => ({
           name: check.name,
           status: await check.check()
         }))
       );
       
       return {
         status: results.every(r => r.status === 'fulfilled' && r.value.status.healthy) 
           ? 'healthy' 
           : 'unhealthy',
         checks: results.map(r => 
           r.status === 'fulfilled' 
             ? r.value 
             : { name: 'unknown', status: { healthy: false, error: r.reason } }
         ),
         timestamp: new Date().toISOString()
       };
     }
   }
   
   // File: src/app/api/v1/health/route.ts
   export async function GET() {
     const healthChecker = new HealthChecker();
     
     // Add health checks
     healthChecker.addCheck(new DatabaseHealthCheck());
     healthChecker.addCheck(new RedisHealthCheck());
     healthChecker.addCheck(new LLMProviderHealthCheck());
     healthChecker.addCheck(new VectorDBHealthCheck());
     
     const health = await healthChecker.checkHealth();
     
     return NextResponse.json(health, {
       status: health.status === 'healthy' ? 200 : 503
     });
   }
   ```

6. **Error Tracking with Sentry:**
   ```typescript
   // File: src/lib/monitoring/errorTracking.ts
   import * as Sentry from '@sentry/nextjs';
   
   export function initializeErrorTracking(): void {
     Sentry.init({
       dsn: process.env.SENTRY_DSN,
       environment: process.env.NODE_ENV,
       tracesSampleRate: 0.1,
       beforeSend(event, hint) {
         // Filter sensitive data
         // Add custom context
         return event;
       }
     });
   }
   
   export function captureError(
     error: Error,
     context: Record<string, any> = {}
   ): void {
     Sentry.withScope(scope => {
       Object.keys(context).forEach(key => {
         scope.setTag(key, context[key]);
       });
       Sentry.captureException(error);
     });
   }
   ```

7. **Analytics Dashboard Data:**
   ```typescript
   // File: src/services/analyticsService.ts
   export class AnalyticsService extends BaseService {
     async getAgentMetrics(agentId: string, period: DateRange): Promise<AgentMetrics> {
       // Message volume over time
       // Response times and success rates
       // User engagement metrics
       // Cost analysis
     }
     
     async getPlatformMetrics(period: DateRange): Promise<PlatformMetrics> {
       // Overall system performance
       // User growth and retention
       // Revenue metrics
       // Resource utilization
     }
     
     async generateReport(type: ReportType, filters: ReportFilters): Promise<Report> {
       // Generate comprehensive analytics reports
       // Export in various formats (JSON, CSV, PDF)
     }
   }
   ```

8. **Real-time Monitoring Dashboard:**
   ```typescript
   // File: src/app/api/v1/monitoring/metrics/route.ts
   export async function GET() {
     const metrics = await MetricsCollector.getInstance().exportMetrics();
     return new Response(metrics, {
       headers: { 'Content-Type': 'text/plain' }
     });
   }
   
   // File: src/components/monitoring/MetricsDashboard.tsx
   export function MetricsDashboard() {
     // Real-time metrics visualization
     // Charts for response times, error rates, throughput
     // Alert status indicators
     // System health overview
   }
   ```

Requirements:
- Structured JSON logging with correlation IDs across all services
- Prometheus-compatible metrics export
- OpenTelemetry distributed tracing
- Comprehensive health checks for all dependencies
- Real-time monitoring dashboard
- Error tracking with proper context and filtering
- Performance monitoring with alerting thresholds
```

### Prompt 8: Security, Authentication & Production Hardening

```
I need you to implement comprehensive security measures, authentication systems, rate limiting, and production-ready hardening for our AI agent platform.

TASKS TO COMPLETE:

1. **Enhanced Authentication System:**
   ```typescript
   // File: src/lib/auth/AuthService.ts
   export class AuthService extends BaseService {
     async validateJWTToken(token: string): Promise<AuthUser> {
       try {
         const { data: { user }, error } = await this.supabase.auth.getUser(token);
         if (error || !user) {
           throw new UnauthorizedError('Invalid token');
         }
         
         // Check if user is active and not suspended
         const profile = await this.userRepository.findById(user.id);
         if (!profile || profile.status !== 'active') {
           throw new ForbiddenError('Account suspended');
         }
         
         return {
           id: user.id,
           email: user.email,
           role: profile.role,
           permissions: await this.getUserPermissions(user.id)
         };
       } catch (error) {
         this.logger.error('Token validation failed', { error });
         throw error;
       }
     }
     
     async validateAPIKey(apiKey: string): Promise<AuthUser> {
       // API key validation for service-to-service calls
       // Rate limiting per API key
       // Scope-based permissions
     }
     
     async refreshToken(refreshToken: string): Promise<AuthTokens> {
       // Secure token refresh
       // Token rotation
       // Blacklist old tokens
     }
   }
   ```

2. **Role-Based Access Control (RBAC):**
   ```typescript
   // File: src/lib/auth/permissions.ts
   export enum Permission {
     // Agent management
     AGENT_CREATE = 'agent:create',
     AGENT_READ = 'agent:read',
     AGENT_UPDATE = 'agent:update',
     AGENT_DELETE = 'agent:delete',
     
     // Integration management
     INTEGRATION_SETUP = 'integration:setup',
     INTEGRATION_VIEW = 'integration:view',
     
     // Admin functions
     USER_MANAGE = 'user:manage',
     SYSTEM_CONFIG = 'system:config'
   }
   
   export const RolePermissions: Record<string, Permission[]> = {
     user: [
       Permission.AGENT_CREATE,
       Permission.AGENT_READ,
       Permission.AGENT_UPDATE,
       Permission.AGENT_DELETE,
       Permission.INTEGRATION_SETUP,
       Permission.INTEGRATION_VIEW
     ],
     admin: Object.values(Permission),
     readonly: [
       Permission.AGENT_READ,
       Permission.INTEGRATION_VIEW
     ]
   };
   
   // File: src/middleware/authMiddleware.ts
   export function requirePermissions(permissions: Permission[]) {
     return (req: AuthenticatedRequest, res: NextResponse, next: NextFunction) => {
       const userPermissions = req.user.permissions;
       const hasPermission = permissions.every(p => userPermissions.includes(p));
       
       if (!hasPermission) {
         throw new ForbiddenError('Insufficient permissions');
       }
       
       next();
     };
   }
   ```

3. **Advanced Rate Limiting System:**
   ```typescript
   // File: src/lib/rateLimit/RateLimiter.ts
   export interface RateLimitConfig {
     windowMs: number;
     maxRequests: number;
     keyGenerator: (req: NextRequest) => string;
     skipSuccessfulRequests?: boolean;
     skipFailedRequests?: boolean;
     onLimitReached?: (req: NextRequest) => void;
   }
   
   export class RateLimiter {
     private redis: Redis;
     
     constructor(private config: RateLimitConfig) {
       this.redis = new Redis(process.env.REDIS_URL);
     }
     
     async checkLimit(req: NextRequest): Promise<RateLimitResult> {
       const key = this.config.keyGenerator(req);
       const window = Math.floor(Date.now() / this.config.windowMs);
       const redisKey = `rate_limit:${key}:${window}`;
       
       const current = await this.redis.incr(redisKey);
       
       if (current === 1) {
         await this.redis.expire(redisKey, Math.ceil(this.config.windowMs / 1000));
       }
       
       const isAllowed = current <= this.config.maxRequests;
       const resetTime = (window + 1) * this.config.windowMs;
       
       if (!isAllowed && this.config.onLimitReached) {
         this.config.onLimitReached(req);
       }
       
       return {
         allowed: isAllowed,
         limit: this.config.maxRequests,
         current,
         resetTime,
         retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
       };
     }
   }
   
   // File: src/middleware/rateLimitMiddleware.ts
   export function createRateLimitMiddleware(config: RateLimitConfig) {
     const limiter = new RateLimiter(config);
     
     return async (req: NextRequest) => {
       const result = await limiter.checkLimit(req);
       
       if (!result.allowed) {
         return NextResponse.json(
           {
             error: {
               code: 'RATE_LIMIT_EXCEEDED',
               message: 'Too many requests',
               retryAfter: result.retryAfter
             }
           },
           {
             status: 429,
             headers: {
               'X-RateLimit-Limit': result.limit.toString(),
               'X-RateLimit-Remaining': Math.max(0, result.limit - result.current).toString(),
               'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
               'Retry-After': result.retryAfter.toString()
             }
           }
         );
       }
       
       return null; // Allow request to proceed
     };
   }
   ```

4. **Input Validation & Sanitization:**
   ```typescript
   // File: src/lib/validation/sanitizer.ts
   export class InputSanitizer {
     static sanitizeHTML(input: string): string {
       // Remove potentially dangerous HTML tags and attributes
       // Use DOMPurify or similar library
       return DOMPurify.sanitize(input, {
         ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
         ALLOWED_ATTR: []
       });
     }
     
     static sanitizeSQL(input: string): string {
       // Additional SQL injection prevention (beyond parameterized queries)
       // Remove or escape dangerous characters
     }
     
     static validateFileUpload(file: File): ValidationResult {
       // File type validation
       // File size limits
       // Scan for malware signatures
       // Check file headers match extensions
     }
     
     static sanitizeUserMessage(message: string): string {
       // Clean user messages for LLM processing
       // Remove potential prompt injection attempts
       // Normalize whitespace and encoding
     }
   }
   ```

5. **Secrets Management & Environment Security:**
   ```typescript
   // File: src/lib/config/ConfigValidator.ts
   export class ConfigValidator {
     private requiredEnvVars = [
       'SUPABASE_URL',
       'SUPABASE_ANON_KEY',
       'SUPABASE_SERVICE_ROLE_KEY',
       'OPENROUTER_API_KEY',
       'REDIS_URL',
       'NEXTAUTH_SECRET'
     ];
     
     validateEnvironment(): void {
       const missing = this.requiredEnvVars.filter(
         varName => !process.env[varName]
       );
       
       if (missing.length > 0) {
         throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
       }
       
       // Validate format of critical variables
       this.validateURLFormat('SUPABASE_URL');
       this.validateKeyFormat('SUPABASE_ANON_KEY');
       this.validateRedisURL('REDIS_URL');
     }
     
     private validateURLFormat(varName: string): void {
       const url = process.env[varName];
       try {
         new URL(url!);
       } catch {
         throw new Error(`Invalid URL format for ${varName}`);
       }
     }
   }
   
   // File: src/lib/security/SecretsManager.ts
   export class SecretsManager {
     private static encryptionKey = process.env.ENCRYPTION_KEY;
     
     static async encryptSensitiveData(data: string): Promise<string> {
       // Encrypt sensitive data before storing
       // Use AES-256-GCM encryption
     }
     
     static async decryptSensitiveData(encryptedData: string): Promise<string> {
       // Decrypt sensitive data
       // Handle decryption errors gracefully
     }
     
     static async rotateAPIKey(keyId: string): Promise<string> {
       // API key rotation procedures
       // Update all systems using the old key
     }
   }
   ```

6. **Security Headers & CORS Configuration:**
   ```typescript
   // File: src/middleware/securityMiddleware.ts
   export function addSecurityHeaders(response: NextResponse): NextResponse {
     // Security headers
     response.headers.set('X-Content-Type-Options', 'nosniff');
     response.headers.set('X-Frame-Options', 'DENY');
     response.headers.set('X-XSS-Protection', '1; mode=block');
     response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
     response.headers.set(
       'Content-Security-Policy',
       "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
     );
     response.headers.set(
       'Strict-Transport-Security',
       'max-age=31536000; includeSubDomains'
     );
     
     return response;
   }
   
   // File: next.config.js (update existing)
   const nextConfig = {
     async headers() {
       return [
         {
           source: '/api/:path*',
           headers: [
             { key: 'Access-Control-Allow-Origin', value: process.env.ALLOWED_ORIGINS || '*' },
             { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
             { key: 'Access-Control-Allow-Headers', value: 'Content-Type,Authorization' }
           ]
         }
       ];
     }
   };
   ```

7. **Audit Logging & Security Monitoring:**
   ```typescript
   // File: src/lib/security/AuditLogger.ts
   export class AuditLogger {
     private logger = createLogger('security-audit');
     
     async logSecurityEvent(event: SecurityEvent): Promise<void> {
       await this.logger.info('Security event', {
         eventType: event.type,
         userId: event.userId,
         ipAddress: event.ipAddress,
         userAgent: event.userAgent,
         resource: event.resource,
         action: event.action,
         result: event.result,
         timestamp: new Date().toISOString(),
         metadata: event.metadata
       });
       
       // Store in database for analysis
       await this.storeAuditEvent(event);
       
       // Trigger alerts for critical events
       if (event.severity === 'HIGH') {
         await this.triggerSecurityAlert(event);
       }
     }
     
     async logAuthenticationAttempt(
       email: string,
       success: boolean,
       ipAddress: string,
       userAgent: string
     ): Promise<void> {
       await this.logSecurityEvent({
         type: 'AUTHENTICATION',
         userId: success ? await this.getUserId(email) : null,
         ipAddress,
         userAgent,
         action: 'LOGIN_ATTEMPT',
         result: success ? 'SUCCESS' : 'FAILURE',
         severity: success ? 'LOW' : 'MEDIUM'
       });
     }
   }
   ```

8. **Production Deployment Security:**
   ```dockerfile
   # File: Dockerfile
   FROM node:18-alpine AS base
   
   # Security: Run as non-root user
   RUN addgroup --system --gid 1001 nodejs
   RUN adduser --system --uid 1001 nextjs
   
   COPY --from=builder /app/public ./public
   
   # Set correct permissions for prerender cache
   RUN mkdir .next
   RUN chown nextjs:nodejs .next
   
   # Copy built application
   COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
   COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
   
   USER nextjs
   
   EXPOSE 3000
   ENV PORT 3000
   ENV HOSTNAME "0.0.0.0"
   
   # Health check
   HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
     CMD node healthcheck.js
   
   CMD ["node", "server.js"]
   
   # File: docker-compose.prod.yml
   version: '3.8'
   
   services:
     app:
       build:
         context: .
         dockerfile: Dockerfile.production
       ports:
         - "3000:3000"
       environment:
         - NODE_ENV=production
         - DATABASE_URL=${DATABASE_URL}
         - REDIS_URL=${REDIS_URL}
       depends_on:
         - redis
         - postgres
       restart: unless-stopped
   
     redis:
       image: redis:7-alpine
       ports:
         - "6379:6379"
       volumes:
         - redis_data:/data
       restart: unless-stopped
   
     postgres:
       image: postgres:15
       environment:
         POSTGRES_DB: ${POSTGRES_DB}
         POSTGRES_USER: ${POSTGRES_USER}
         POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
       volumes:
         - postgres_data:/var/lib/postgresql/data
       restart: unless-stopped
   
     nginx:
       image: nginx:alpine
       ports:
         - "80:80"
         - "443:443"
       volumes:
         - ./nginx.conf:/etc/nginx/nginx.conf
         - ./ssl:/etc/nginx/ssl
       depends_on:
         - app
       restart: unless-stopped
   
   volumes:
     redis_data:
     postgres_data:
   ```

2. **GitHub Actions CI/CD Pipeline:**
   ```yaml
   # File: .github/workflows/ci-cd.yml
   name: CI/CD Pipeline
   
   on:
     push:
       branches: [main, develop]
     pull_request:
       branches: [main]
   
   env:
     NODE_VERSION: '18'
     REGISTRY: ghcr.io
     IMAGE_NAME: ${{ github.repository }}
   
   jobs:
     test:
       runs-on: ubuntu-latest
       
       services:
         postgres:
           image: postgres:15
           env:
             POSTGRES_PASSWORD: postgres
             POSTGRES_DB: test_db
           options: >-
             --health-cmd pg_isready
             --health-interval 10s
             --health-timeout 5s
             --health-retries 5
           ports:
             - 5432:5432
         
         redis:
           image: redis:7
           options: >-
             --health-cmd "redis-cli ping"
             --health-interval 10s
             --health-timeout 5s
             --health-retries 5
           ports:
             - 6379:6379
   
       steps:
         - name: Checkout code
           uses: actions/checkout@v4
   
         - name: Setup Node.js
           uses: actions/setup-node@v4
           with:
             node-version: ${{ env.NODE_VERSION }}
             cache: 'npm'
   
         - name: Install dependencies
           run: npm ci
   
         - name: Run linting
           run: npm run lint
   
         - name: Run type checking
           run: npm run type-check
   
         - name: Run unit tests
           run: npm run test:coverage
           env:
             DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
             REDIS_URL: redis://localhost:6379
   
         - name: Run integration tests
           run: npm run test:integration
           env:
             DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
             REDIS_URL: redis://localhost:6379
   
         - name: Upload coverage reports
           uses: codecov/codecov-action@v3
           with:
             file: ./coverage/lcov.info
   
     build-and-push:
       needs: test
       runs-on: ubuntu-latest
       if: github.ref == 'refs/heads/main'
       
       permissions:
         contents: read
         packages: write
   
       steps:
         - name: Checkout code
           uses: actions/checkout@v4
   
         - name: Log in to Container Registry
           uses: docker/login-action@v2
           with:
             registry: ${{ env.REGISTRY }}
             username: ${{ github.actor }}
             password: ${{ secrets.GITHUB_TOKEN }}
   
         - name: Extract metadata
           id: meta
           uses: docker/metadata-action@v4
           with:
             images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
             tags: |
               type=ref,event=branch
               type=ref,event=pr
               type=sha,prefix={{branch}}-
   
         - name: Build and push Docker image
           uses: docker/build-push-action@v4
           with:
             context: .
             file: ./Dockerfile.production
             push: true
             tags: ${{ steps.meta.outputs.tags }}
             labels: ${{ steps.meta.outputs.labels }}
   
     deploy-staging:
       needs: build-and-push
       runs-on: ubuntu-latest
       if: github.ref == 'refs/heads/develop'
       
       steps:
         - name: Deploy to staging
           uses: appleboy/ssh-action@v0.1.5
           with:
             host: ${{ secrets.STAGING_HOST }}
             username: ${{ secrets.STAGING_USER }}
             key: ${{ secrets.STAGING_SSH_KEY }}
             script: |
               docker pull ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:develop
               docker-compose -f docker-compose.staging.yml up -d
   
     deploy-production:
       needs: build-and-push
       runs-on: ubuntu-latest
       if: github.ref == 'refs/heads/main'
       environment: production
       
       steps:
         - name: Deploy to production
           uses: appleboy/ssh-action@v0.1.5
           with:
             host: ${{ secrets.PRODUCTION_HOST }}
             username: ${{ secrets.PRODUCTION_USER }}
             key: ${{ secrets.PRODUCTION_SSH_KEY }}
             script: |
               # Pull new image
               docker pull ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:main
               
               # Run database migrations
               docker run --rm --env-file .env ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:main npm run migrate
               
               # Deploy with zero-downtime
               docker-compose -f docker-compose.prod.yml up -d --no-deps app
               
               # Health check
               sleep 30
               curl -f http://localhost:3000/api/v1/health || exit 1
   ```

3. **Infrastructure as Code (Terraform):**
   ```hcl
   # File: infrastructure/main.tf
   terraform {
     required_providers {
       aws = {
         source  = "hashicorp/aws"
         version = "~> 5.0"
       }
     }
   }
   
   provider "aws" {
     region = var.aws_region
   }
   
   # VPC and networking
   module "vpc" {
     source = "terraform-aws-modules/vpc/aws"
     
     name = "${var.project_name}-vpc"
     cidr = "10.0.0.0/16"
     
     azs             = ["${var.aws_region}a", "${var.aws_region}b"]
     private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
     public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]
     
     enable_nat_gateway = true
     enable_vpn_gateway = true
   }
   
   # ECS Cluster
   resource "aws_ecs_cluster" "main" {
     name = "${var.project_name}-cluster"
     
     setting {
       name  = "containerInsights"
       value = "enabled"
     }
   }
   
   # Application Load Balancer
   resource "aws_lb" "main" {
     name               = "${var.project_name}-alb"
     internal           = false
     load_balancer_type = "application"
     security_groups    = [aws_security_group.alb.id]
     subnets            = module.vpc.public_subnets
     
     enable_deletion_protection = var.environment == "production"
   }
   
   # RDS Database
   resource "aws_db_instance" "main" {
     identifier = "${var.project_name}-db"
     
     engine         = "postgres"
     engine_version = "15.3"
     instance_class = var.db_instance_class
     
     allocated_storage     = var.db_allocated_storage
     max_allocated_storage = var.db_max_allocated_storage
     
     db_name  = var.db_name
     username = var.db_username
     password = var.db_password
     
     vpc_security_group_ids = [aws_security_group.rds.id]
     db_subnet_group_name   = aws_db_subnet_group.main.name
     
     backup_retention_period = var.environment == "production" ? 7 : 1
     backup_window          = "03:00-04:00"
     maintenance_window     = "sun:04:00-sun:05:00"
     
     skip_final_snapshot = var.environment != "production"
   }
   
   # ElastiCache Redis
   resource "aws_elasticache_subnet_group" "main" {
     name       = "${var.project_name}-cache-subnet"
     subnet_ids = module.vpc.private_subnets
   }
   
   resource "aws_elasticache_cluster" "redis" {
     cluster_id           = "${var.project_name}-redis"
     engine              = "redis"
     node_type           = var.redis_node_type
     port                = 6379
     parameter_group_name = "default.redis7"
     subnet_group_name    = aws_elasticache_subnet_group.main.name
     security_group_ids   = [aws_security_group.redis.id]
   }
   ```

4. **Monitoring and Alerting Setup:**
   ```yaml
   # File: monitoring/prometheus.yml
   global:
     scrape_interval: 15s
     evaluation_interval: 15s
   
   rule_files:
     - "alert_rules.yml"
   
   alerting:
     alertmanagers:
       - static_configs:
           - targets:
             - alertmanager:9093
   
   scrape_configs:
     - job_name: 'ai-agent-platform'
       static_configs:
         - targets: ['app:3000']
       metrics_path: '/api/v1/monitoring/metrics'
       scrape_interval: 30s
   
   # File: monitoring/alert_rules.yml
   groups:
     - name: platform_alerts
       rules:
         - alert: HighErrorRate
           expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
           for: 5m
           labels:
             severity: critical
           annotations:
             summary: "High error rate detected"
             description: "Error rate is {{ $value }} per second"
   
         - alert: HighResponseTime
           expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
           for: 5m
           labels:
             severity: warning
           annotations:
             summary: "High response time"
             description: "95th percentile response time is {{ $value }} seconds"
   
         - alert: LLMProviderDown
           expr: up{job="llm_providers"} == 0
           for: 2m
           labels:
             severity: critical
           annotations:
             summary: "LLM Provider is down"
   
         - alert: QueueBacklog
           expr: message_queue_depth > 1000
           for: 5m
           labels:
             severity: warning
           annotations:
             summary: "Message queue backlog"
   ```

5. **Production Environment Configuration:**
   ```bash
   # File: .env.production
   # Application
   NODE_ENV=production
   NEXT_PUBLIC_APP_URL=https://your-domain.com
   
   # Database
   DATABASE_URL=postgresql://user:password@prod-db:5432/ai_platform
   DATABASE_POOL_SIZE=20
   
   # Redis
   REDIS_URL=redis://prod-redis:6379
   REDIS_POOL_SIZE=10
   
   # Authentication
   NEXTAUTH_URL=https://your-domain.com
   NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
   
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
   NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
   SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_KEY}
   
   # LLM Providers
   OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
   OPENAI_API_KEY=${OPENAI_API_KEY}
   ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
   
   # Monitoring
   SENTRY_DSN=${SENTRY_DSN}
   OTEL_SERVICE_NAME=ai-agent-platform
   OTEL_EXPORTER_OTLP_ENDPOINT=${OTEL_ENDPOINT}
   
   # Security
   ENCRYPTION_KEY=${ENCRYPTION_KEY}
   RATE_LIMIT_REDIS_URL=${REDIS_URL}
   
   # File uploads
   S3_BUCKET_NAME=${S3_BUCKET}
   AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
   AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
   ```

6. **Database Migration and Backup Scripts:**
   ```bash
   #!/bin/bash
   # File: scripts/deploy.sh
   
   set -e
   
   echo "Starting deployment process..."
   
   # Backup database
   echo "Creating database backup..."
   pg_dump $DATABASE_URL > "backup_$(date +%Y%m%d_%H%M%S).sql"
   
   # Run migrations
   echo "Running database migrations..."
   npm run migrate:prod
   
   # Validate schema
   echo "Validating database schema..."
   npm run db:validate
   
   # Deploy application
   echo "Deploying application..."
   docker-compose -f docker-compose.prod.yml up -d --no-deps app
   
   # Wait for health check
   echo "Waiting for application to be healthy..."
   timeout 120 bash -c 'until curl -f http://localhost:3000/api/v1/health; do sleep 2; done'
   
   # Run smoke tests
   echo "Running smoke tests..."
   npm run test:smoke
   
   echo "Deployment completed successfully!"
   
   # File: scripts/rollback.sh
   #!/bin/bash
   
   set -e
   
   BACKUP_FILE=$1
   
   if [ -z "$BACKUP_FILE" ]; then
     echo "Usage: ./rollback.sh <backup_file>"
     exit 1
   fi
   
   echo "Rolling back to previous version..."
   
   # Stop current application
   docker-compose -f docker-compose.prod.yml stop app
   
   # Restore database
   echo "Restoring database from backup..."
   psql $DATABASE_URL < $BACKUP_FILE
   
   # Deploy previous image
   docker-compose -f docker-compose.prod.yml up -d app
   
   echo "Rollback completed!"
   ```

7. **Performance Monitoring and Optimization:**
   ```typescript
   // File: scripts/performance-check.ts
   import { performance } from 'perf_hooks';
   import { createClient } from '@supabase/supabase-js';
   
   interface PerformanceMetrics {
     dbConnectionTime: number;
     redisConnectionTime: number;
     llmResponseTime: number;
     apiResponseTime: number;
   }
   
   async function runPerformanceCheck(): Promise<PerformanceMetrics> {
     const metrics: PerformanceMetrics = {
       dbConnectionTime: 0,
       redisConnectionTime: 0,
       llmResponseTime: 0,
       apiResponseTime: 0
     };
     
     // Test database connection
     const dbStart = performance.now();
     const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
     await supabase.from('profiles').select('id').limit(1);
     metrics.dbConnectionTime = performance.now() - dbStart;
     
     // Test Redis connection
     const redisStart = performance.now();
     const redis = new Redis(process.env.REDIS_URL!);
     await redis.ping();
     metrics.redisConnectionTime = performance.now() - redisStart;
     
     // Test LLM response
     const llmStart = performance.now();
     // Mock LLM call
     await new Promise(resolve => setTimeout(resolve, 100));
     metrics.llmResponseTime = performance.now() - llmStart;
     
     // Test API endpoint
     const apiStart = performance.now();
     await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/v1/health`);
     metrics.apiResponseTime = performance.now() - apiStart;
     
     return metrics;
   }
   
   // Run check and alert if metrics exceed thresholds
   runPerformanceCheck().then(metrics => {
     console.log('Performance Metrics:', metrics);
     
     if (metrics.dbConnectionTime > 1000) {
       console.error('Database connection time exceeds threshold');
       process.exit(1);
     }
     
     if (metrics.apiResponseTime > 2000) {
       console.error('API response time exceeds threshold');
       process.exit(1);
     }
   });
   ```

8. **Launch Checklist and Documentation:**
   ```markdown
   # File: LAUNCH_CHECKLIST.md
   
   ## Pre-Launch Checklist
   
   ### Security Review
   - [ ] All secrets properly configured in production
   - [ ] HTTPS certificates installed and configured
   - [ ] Rate limiting enabled and tested
   - [ ] Input validation on all endpoints
   - [ ] Database RLS policies reviewed
   - [ ] Authentication flows tested
   - [ ] API keys rotated and secured
   
   ### Performance Verification
   - [ ] Load testing completed with acceptable results
   - [ ] Database queries optimized and indexed
   - [ ] CDN configured for static assets
   - [ ] Caching strategies implemented
   - [ ] Connection pooling configured
   
   ### Monitoring and Alerting
   - [ ] All monitoring systems operational
   - [ ] Alert rules configured and tested
   - [ ] Error tracking active
   - [ ] Performance metrics baseline established
   - [ ] Health checks responding correctly
   
   ### Infrastructure
   - [ ] Production database backed up
   - [ ] Disaster recovery procedures documented
   - [ ] Auto-scaling configured
   - [ ] Log rotation configured
   - [ ] SSL certificates have valid expiration dates
   
   ### Documentation
   - [ ] API documentation updated
   - [ ] User documentation complete
   - [ ] Operations runbook created
   - [ ] Incident response procedures documented
   
   ## Post-Launch Monitoring
   
   ### Week 1
   - [ ] Monitor error rates and performance metrics
   - [ ] Check user feedback and support requests
   - [ ] Verify all integrations working correctly
   - [ ] Review and adjust alert thresholds
   
   ### Week 2-4
   - [ ] Analyze usage patterns and optimize
   - [ ] Review security logs for anomalies
   - [ ] Plan for scaling based on growth
   - [ ] Gather user feedback for improvements
   ```

Requirements:
- Docker multi-stage builds for optimal image size
- Zero-downtime deployment capability
- Comprehensive CI/CD pipeline with automated testing
- Infrastructure as code for reproducible environments
- Production-ready monitoring and alerting
- Database backup and disaster recovery procedures
- Performance monitoring and optimization scripts
- Complete launch checklist with security review
- Rollback procedures for emergency situations
```

## Execution Strategy

These 10 prompts should be executed in order, with each phase building upon the previous ones:

**Phase 1 (Prompts 1-3):** Foundation - Establish service architecture, normalize database, standardize APIs
**Phase 2 (Prompts 4-6):** Core Features - Build integration gateway, LLM orchestrator, and RAG system  
**Phase 3 (Prompts 7-8):** Production Readiness - Implement monitoring, security, and hardening
**Phase 4 (Prompts 9-10):** Testing & Deployment - Complete testing suite and production deployment

Each prompt is designed to be comprehensive enough for Windsurf to handle multiple related tasks while maintaining focus on specific architectural components. The implementation follows enterprise-grade practices and prepares the platform for scale.

## Expected Outcomes

After completing all 10 prompts, you'll have:
- **Scalable Architecture:** Service-oriented design ready for microservices
- **Production Security:** Comprehensive security measures and compliance
- **Enterprise Features:** RAG, multi-platform integrations, usage tracking
- **Operational Excellence:** Monitoring, alerting, and deployment automation
- **Quality Assurance:** Comprehensive testing and performance validation

This transformation will take your platform from a 5.5/10 codebase to a production-ready 9/10 system capable of handling enterprise workloads and scaling with your business growth.001 nextjs
   
   # Install dependencies only when needed
   FROM base AS deps
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production && npm cache clean --force
   
   # Production image
   FROM base AS runner
   WORKDIR /app
   
   ENV NODE_ENV production
   
   RUN addgroup --system --gid 1001 nodejs
   RUN adduser --system --uid 1001 nextjs
   
   # Copy built application
   COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
   COPY --chown=nextjs:nodejs . .
   
   USER nextjs
   
   EXPOSE 3000
   ENV PORT 3000
   
   CMD ["npm", "start"]
   ```

9. **Security Monitoring & Intrusion Detection:**
   ```typescript
   // File: src/lib/security/IntrusionDetection.ts
   export class IntrusionDetection {
     private redis: Redis;
     private suspiciousPatterns = [
       /union\s+select/i,
       /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
       /javascript:/i,
       /on\w+\s*=/i
     ];
     
     async analyzeRequest(req: NextRequest): Promise<SecurityAssessment> {
       const threats = [];
       
       // Check for SQL injection patterns
       if (this.detectSQLInjection(req)) {
         threats.push('SQL_INJECTION');
       }
       
       // Check for XSS patterns
       if (this.detectXSS(req)) {
         threats.push('XSS');
       }
       
       // Check rate limiting violations
       if (await this.detectBruteForce(req)) {
         threats.push('BRUTE_FORCE');
       }
       
       // Check for unusual user agent patterns
       if (this.detectBotActivity(req)) {
         threats.push('BOT_ACTIVITY');
       }
       
       return {
         threats,
         riskScore: this.calculateRiskScore(threats),
         shouldBlock: threats.length > 0 && threats.includes('SQL_INJECTION')
       };
     }
   }
   ```

Requirements:
- JWT token validation with proper error handling
- Role-based access control for all endpoints
- Multi-tier rate limiting (per-user, per-IP, global)
- Comprehensive input sanitization
- Secure secrets management with rotation
- Security headers and CORS configuration
- Detailed audit logging for security events
- Intrusion detection and automated response
- Production-ready Docker configuration
```

## Phase 4: Testing, Deployment & Launch (Prompts 9-10)

### Prompt 9: Comprehensive Testing Suite & Quality Assurance

```
I need you to create a comprehensive testing framework covering unit tests, integration tests, end-to-end tests, and load testing to ensure our AI agent platform is production-ready.

TASKS TO COMPLETE:

1. **Testing Infrastructure Setup:**
   ```json
   // File: package.json (add to existing)
   {
     "devDependencies": {
       "@types/jest": "^29.5.0",
       "jest": "^29.5.0",
       "jest-environment-node": "^29.5.0",
       "@testing-library/react": "^13.4.0",
       "@testing-library/jest-dom": "^5.16.0",
       "supertest": "^6.3.0",
       "msw": "^1.2.0",
       "playwright": "^1.32.0",
       "k6": "latest"
     },
     "scripts": {
       "test": "jest",
       "test:watch": "jest --watch",
       "test:coverage": "jest --coverage",
       "test:integration": "jest --testPathPattern=integration",
       "test:e2e": "playwright test",
       "test:load": "k6 run tests/load/load-test.js"
     }
   }
   
   // File: jest.config.js
   module.exports = {
     testEnvironment: 'node',
     setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
     testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
     coverageThreshold: {
       global: {
         branches: 80,
         functions: 80,
         lines: 80,
         statements: 80
       }
     }
   };
   ```

2. **Unit Tests for Service Layer:**
   ```typescript
   // File: tests/unit/services/AgentService.test.ts
   import { AgentService } from '@/services/agentService';
   import { MockAgentRepository } from '../mocks/MockAgentRepository';
   
   describe('AgentService', () => {
     let agentService: AgentService;
     let mockRepository: MockAgentRepository;
     
     beforeEach(() => {
       mockRepository = new MockAgentRepository();
       agentService = new AgentService(mockRepository);
     });
     
     describe('createAgent', () => {
       it('should create agent with valid data', async () => {
         const agentData = {
           name: 'Test Agent',
           type: 'customer_support',
           base_prompt: 'You are a helpful assistant',
           model: 'gpt-4o'
         };
         
         const result = await agentService.createAgent('user-123', agentData);
         
         expect(result.id).toBeDefined();
         expect(result.name).toBe(agentData.name);
         expect(mockRepository.create).toHaveBeenCalledWith(
           expect.objectContaining({
             ...agentData,
             user_id: 'user-123'
           })
         );
       });
       
       it('should throw validation error for invalid data', async () => {
         const invalidData = {
           name: '', // Invalid: empty name
           type: 'invalid_type', // Invalid type
           base_prompt: 'test'
         };
         
         await expect(
           agentService.createAgent('user-123', invalidData)
         ).rejects.toThrow('Validation failed');
       });
     });
   });
   
   // File: tests/unit/services/LLMService.test.ts
   describe('LLMService', () => {
     describe('generateResponse', () => {
       it('should generate response using correct provider', async () => {
         // Mock LLM provider responses
         // Test provider selection logic
         // Test error handling for provider failures
       });
       
       it('should apply RAG context when enabled', async () => {
         // Test RAG integration
         // Mock vector database responses
         // Verify context is properly included
       });
     });
   });
   ```

3. **Integration Tests:**
   ```typescript
   // File: tests/integration/api/agents.test.ts
   import request from 'supertest';
   import { app } from '@/app';
   import { setupTestDatabase, cleanupTestDatabase } from '../helpers/database';
   
   describe('Agent API Integration', () => {
     beforeAll(async () => {
       await setupTestDatabase();
     });
     
     afterAll(async () => {
       await cleanupTestDatabase();
     });
     
     describe('POST /api/v1/agents', () => {
       it('should create agent with authentication', async () => {
         const response = await request(app)
           .post('/api/v1/agents')
           .set('Authorization', 'Bearer valid-jwt-token')
           .send({
             name: 'Test Agent',
             type: 'customer_support',
             base_prompt: 'You are a helpful assistant'
           });
         
         expect(response.status).toBe(201);
         expect(response.body.data.name).toBe('Test Agent');
       });
       
       it('should return 401 without authentication', async () => {
         const response = await request(app)
           .post('/api/v1/agents')
           .send({
             name: 'Test Agent',
             type: 'customer_support'
           });
         
         expect(response.status).toBe(401);
       });
     });
   });
   
   // File: tests/integration/telegram/webhook.test.ts
   describe('Telegram Webhook Integration', () => {
     it('should process valid telegram update', async () => {
       const telegramUpdate = {
         update_id: 12345,
         message: {
           message_id: 1,
           from: { id: 123, first_name: 'John' },
           chat: { id: 456, type: 'private' },
           date: Date.now(),
           text: 'Hello, how can I help?'
         }
       };
       
       const response = await request(app)
         .post('/api/v1/webhooks/telegram/agent-123')
         .send(telegramUpdate);
       
       expect(response.status).toBe(200);
       // Verify message was queued for processing
       // Verify conversation was created/updated
     });
   });
   ```

4. **End-to-End Tests with Playwright:**
   ```typescript
   // File: tests/e2e/agent-creation.spec.ts
   import { test, expect } from '@playwright/test';
   
   test.describe('Agent Creation Flow', () => {
     test('should create and deploy customer support agent', async ({ page }) => {
       // Login
       await page.goto('/login');
       await page.fill('[data-testid=email]', 'test@example.com');
       await page.fill('[data-testid=password]', 'password123');
       await page.click('[data-testid=login-button]');
       
       // Navigate to agents page
       await page.click('[data-testid=agents-nav]');
       await page.click('[data-testid=create-agent-button]');
       
       // Fill agent form
       await page.fill('[data-testid=agent-name]', 'Test Support Agent');
       await page.selectOption('[data-testid=agent-type]', 'customer_support');
       await page.fill('[data-testid=base-prompt]', 'You are a helpful customer support agent');
       
       // Save agent
       await page.click('[data-testid=save-agent]');
       
       // Verify creation
       await expect(page.locator('[data-testid=success-message]')).toBeVisible();
       await expect(page.locator('[data-testid=agent-name]')).toContainText('Test Support Agent');
     });
   });
   
   // File: tests/e2e/telegram-integration.spec.ts
   test.describe('Telegram Integration', () => {
     test('should setup telegram integration', async ({ page }) => {
       // Navigate to integrations
       await page.goto('/dashboard/agents/test-agent-id/integrations');
       
       // Setup Telegram
       await page.click('[data-testid=telegram-integration]');
       await page.fill('[data-testid=bot-token]', '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11');
       await page.click('[data-testid=setup-webhook]');
       
       // Verify setup
       await expect(page.locator('[data-testid=integration-status]')).toContainText('Connected');
     });
   });
   ```

5. **Load Testing with K6:**
   ```javascript
   // File: tests/load/message-processing.js
   import http from 'k6/http';
   import { check, sleep } from 'k6';
   
   export let options = {
     stages: [
       { duration: '1m', target: 10 }, // Ramp up
       { duration: '5m', target: 50 }, // Stay at 50 users
       { duration: '1m', target: 100 }, // Ramp to 100 users
       { duration: '5m', target: 100 }, // Stay at 100 users
       { duration: '2m', target: 0 }, // Ramp down
     ],
     thresholds: {
       http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
       http_req_failed: ['rate<0.1'], // Less than 10% failure rate
     },
   };
   
   export default function() {
     // Simulate incoming Telegram message
     const payload = {
       update_id: Math.floor(Math.random() * 1000000),
       message: {
         message_id: Math.floor(Math.random() * 10000),
         from: { id: Math.floor(Math.random() * 100000), first_name: 'LoadTest' },
         chat: { id: Math.floor(Math.random() * 100000), type: 'private' },
         date: Date.now(),
         text: `Test message ${Math.random()}`
       }
     };
     
     const response = http.post(
       `${__ENV.BASE_URL}/api/v1/webhooks/telegram/test-agent-id`,
       JSON.stringify(payload),
       {
         headers: { 'Content-Type': 'application/json' },
       }
     );
     
     check(response, {
       'status is 200': (r) => r.status === 200,
       'response time < 500ms': (r) => r.timings.duration < 500,
     });
     
     sleep(1);
   }
   
   // File: tests/load/api-endpoints.js
   export default function() {
     // Test API endpoints under load
     // Test database performance
     // Test LLM provider response times
     // Test queue processing capacity
   }
   ```

6. **Test Database Setup:**
   ```typescript
   // File: tests/helpers/database.ts
   export async function setupTestDatabase() {
     const supabase = createClient(
       process.env.SUPABASE_TEST_URL!,
       process.env.SUPABASE_TEST_SERVICE_KEY!
     );
     
     // Run migrations
     await runMigrations(supabase);
     
     // Seed test data
     await seedTestData(supabase);
   }
   
   export async function cleanupTestDatabase() {
     // Clean up test data
     // Reset sequences
     // Clear Redis cache
   }
   
   export async function seedTestData(supabase: SupabaseClient) {
     // Create test users
     // Create test agents
     // Create test conversations
   }
   ```

7. **Mock Services for Testing:**
   ```typescript
   // File: tests/mocks/MockLLMProvider.ts
   export class MockLLMProvider implements LLMProvider {
     name = 'mock';
     
     async generateResponse(request: LLMRequest): Promise<LLMResponse> {
       return {
         text: `Mock response for: ${request.messages[request.messages.length - 1].content}`,
         tokens: { input: 10, output: 20 },
         model: 'mock-model'
       };
     }
   }
   
   // File: tests/mocks/msw-handlers.ts
   import { rest } from 'msw';
   
   export const handlers = [
     // Mock Telegram API
     rest.post('https://api.telegram.org/bot*/setWebhook', (req, res, ctx) => {
       return res(ctx.json({ ok: true, result: true }));
     }),
     
     // Mock OpenRouter API
     rest.post('https://openrouter.ai/api/v1/chat/completions', (req, res, ctx) => {
       return res(ctx.json({
         choices: [{ message: { content: 'Mock LLM response' } }]
       }));
     })
   ];
   ```

8. **Performance Testing:**
   ```typescript
   // File: tests/performance/database.test.ts
   describe('Database Performance', () => {
     test('should handle concurrent message inserts', async () => {
       const promises = Array.from({ length: 100 }, (_, i) => 
         messageService.createMessage({
           agent_id: 'test-agent',
           content: `Test message ${i}`,
           direction: 'inbound'
         })
       );
       
       const startTime = Date.now();
       await Promise.all(promises);
       const duration = Date.now() - startTime;
       
       expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
     });
   });
   ```

Requirements:
- Achieve 80%+ code coverage
- All tests must pass in CI/CD pipeline
- Load tests must simulate realistic traffic patterns
- Integration tests must cover all critical user flows
- Mock all external dependencies
- Performance tests for database and API endpoints
- E2E tests covering complete user journeys
```

### Prompt 10: Production Deployment & Launch Preparation

```
I need you to create production-ready deployment infrastructure, CI/CD pipelines, monitoring setup, and launch procedures for our AI agent platform.

TASKS TO COMPLETE:

1. **Docker Production Configuration:**
   ```dockerfile
   # File: Dockerfile.production
   # Multi-stage build for production
   FROM node:18-alpine AS base
   
   # Install dependencies only when needed
   FROM base AS deps
   WORKDIR /app
   
   # Install dependencies based on the preferred package manager
   COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
   RUN \
     if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
     elif [ -f package-lock.json ]; then npm ci; \
     elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
     else echo "Lockfile not found." && exit 1; \
     fi
   
   # Rebuild the source code only when needed
   FROM base AS builder
   WORKDIR /app
   COPY --from=deps /app/node_modules ./node_modules
   COPY . .
   
   # Build application
   ENV NEXT_TELEMETRY_DISABLED 1
   ENV NODE_ENV production
   
   RUN npm run build
   
   # Production image, copy all the files and run next
   FROM base AS runner
   WORKDIR /app
   
   ENV NODE_ENV production
   ENV NEXT_TELEMETRY_DISABLED 1
   
   # Create system user
   RUN addgroup --system --gid 1001 nodejs
   RUN adduser --system --uid 1