# 🚀 RAG System Deployment Guide

## 📋 Prerequisites

Before deploying the RAG system, ensure you have:

- ✅ **Node.js 18+** installed
- ✅ **Docker** installed (for Qdrant)
- ✅ **Redis** instance available
- ✅ **Supabase** project set up
- ✅ **OpenAI API** key for embeddings
- ✅ **OpenRouter API** key for LLM access

## 🔧 Environment Setup

### 1. Copy Environment Configuration
```bash
cp .env.example .env.local
```

### 2. Configure Required Variables
```bash
# Core Application
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Vector Database
QDRANT_HOST=localhost
QDRANT_PORT=6333

# Cache
REDIS_URL=redis://localhost:6379

# LLM Providers
OPENAI_API_KEY=your-openai-key
OPENROUTER_API_KEY=your-openrouter-key
```

## 🐳 Infrastructure Setup

### 1. Start Qdrant Vector Database
```bash
# Using Docker
docker run -p 6333:6333 -p 6334:6334 \
  -v $(pwd)/qdrant_storage:/qdrant/storage:z \
  qdrant/qdrant

# Or using Docker Compose
version: '3.8'
services:
  qdrant:
    image: qdrant/qdrant
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - ./qdrant_storage:/qdrant/storage
```

### 2. Start Redis Cache
```bash
# Using Docker
docker run -p 6379:6379 redis:alpine

# Or install locally
brew install redis  # macOS
sudo apt-get install redis-server  # Ubuntu
```

### 3. Verify Services
```bash
# Check Qdrant
curl http://localhost:6333/health

# Check Redis
redis-cli ping
```

## 🗄️ Database Migration

### 1. Run Supabase Migration
```bash
# Push migration to Supabase
npx supabase db push

# Or apply manually
npx supabase db reset
```

### 2. Verify Tables Created
```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'knowledge_base_documents',
  'knowledge_base_document_versions',
  'document_chunks',
  'llm_usage_logs'
);
```

### 3. Test Vector Extension
```sql
-- Verify vector extension is enabled
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Test vector operations
SELECT 1 - ('[1,2,3]'::vector <=> '[1,2,4]'::vector) as similarity;
```

## 📦 Application Deployment

### 1. Install Dependencies
```bash
npm install
# or
yarn install
```

### 2. Build Application
```bash
npm run build
# or
yarn build
```

### 3. Start Application
```bash
# Development
npm run dev

# Production
npm start
```

## 🧪 Testing the RAG System

### 1. Test Document Upload
```bash
curl -X POST http://localhost:3000/api/v1/agents/{agent-id}/knowledge-base \
  -H "Authorization: Bearer {jwt-token}" \
  -F "files=@test-document.pdf" \
  -F 'options={"chunkingStrategy":"semantic","maxChunkSize":1000}'
```

### 2. Test Search
```bash
curl -X POST http://localhost:3000/api/v1/agents/{agent-id}/knowledge-base/search \
  -H "Authorization: Bearer {jwt-token}" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How do I reset my password?",
    "options": {
      "maxResults": 5,
      "hybridSearch": true,
      "rerank": true
    }
  }'
```

### 3. Test Vector Database
```typescript
import { getVectorDBClient } from '@/vectordb/VectorDBClient';

const vectorDB = getVectorDBClient();
const health = await vectorDB.testConnection();
console.log('Vector DB Health:', health);
```

### 4. Test Embedding Service
```typescript
import { getEmbeddingService } from '@/embeddings/EmbeddingService';

const embeddingService = getEmbeddingService();
const embedding = await embeddingService.generateEmbedding(
  'Test query',
  'text-embedding-3-small'
);
console.log('Embedding generated:', embedding.dimensions);
```

## 🔍 Monitoring & Health Checks

### 1. Health Check Endpoints
```bash
# Application health
curl http://localhost:3000/api/health

# Vector database health
curl http://localhost:6333/health

# Redis health
redis-cli ping
```

### 2. Monitor RAG Performance
```typescript
import { getRAGMonitoring } from '@/monitoring/RAGMonitoring';

const monitoring = getRAGMonitoring();
const metrics = await monitoring.getRAGMetrics();
console.log('RAG Metrics:', metrics);

const alerts = await monitoring.checkPerformanceAlerts();
console.log('Performance Alerts:', alerts);
```

### 3. Check Cache Performance
```typescript
import { getEmbeddingService } from '@/embeddings/EmbeddingService';

const embeddingService = getEmbeddingService();
const stats = await embeddingService.getCacheStats();
console.log('Cache Hit Rate:', (stats.hits / (stats.hits + stats.misses) * 100).toFixed(1) + '%');
```

## 🚀 Production Deployment

### 1. Environment Configuration
```bash
# Production environment variables
NODE_ENV=production
LOG_LEVEL=warn

# Performance settings
VECTOR_DB_BATCH_SIZE=200
EMBEDDING_BATCH_SIZE=20
CACHE_DEFAULT_TTL=86400

# Security settings
RATE_LIMIT_MAX_REQUESTS=1000
CORS_ORIGIN=https://yourdomain.com
```

### 2. Docker Deployment
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

### 3. Docker Compose for Full Stack
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - QDRANT_HOST=qdrant
      - REDIS_URL=redis://redis:6379
    depends_on:
      - qdrant
      - redis

  qdrant:
    image: qdrant/qdrant
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  qdrant_data:
  redis_data:
```

### 4. Kubernetes Deployment
```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: intaj-rag-system
spec:
  replicas: 3
  selector:
    matchLabels:
      app: intaj-rag-system
  template:
    metadata:
      labels:
        app: intaj-rag-system
    spec:
      containers:
      - name: app
        image: intaj/rag-system:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: QDRANT_HOST
          value: "qdrant-service"
        - name: REDIS_URL
          value: "redis://redis-service:6379"
```

## 📊 Performance Optimization

### 1. Vector Database Optimization
```bash
# Optimize Qdrant configuration
curl -X PUT http://localhost:6333/collections/{collection_name} \
  -H "Content-Type: application/json" \
  -d '{
    "optimizers_config": {
      "deleted_threshold": 0.2,
      "vacuum_min_vector_number": 1000,
      "default_segment_number": 0,
      "max_segment_size": 20000,
      "memmap_threshold": 50000,
      "indexing_threshold": 20000
    }
  }'
```

### 2. Cache Optimization
```typescript
// Optimize Redis cache settings
const cacheConfig = {
  ttl: 86400, // 24 hours
  maxSize: 10000, // 10k embeddings
  compression: true,
  evictionPolicy: 'lru'
};
```

### 3. Embedding Optimization
```typescript
// Batch embedding generation
const batchSize = 50;
const embeddings = await embeddingService.batchGenerateEmbeddings(
  texts,
  'text-embedding-3-small'
);
```

## 🔒 Security Considerations

### 1. API Security
- ✅ Use JWT authentication for all endpoints
- ✅ Implement rate limiting
- ✅ Validate all input data
- ✅ Sanitize file uploads
- ✅ Use HTTPS in production

### 2. Database Security
- ✅ Enable Row Level Security (RLS)
- ✅ Use service role key securely
- ✅ Encrypt sensitive data
- ✅ Regular security updates

### 3. Vector Database Security
- ✅ Use API keys for Qdrant
- ✅ Network isolation
- ✅ Regular backups
- ✅ Access logging

## 🚨 Troubleshooting

### Common Issues

#### 1. Vector Database Connection Failed
```bash
# Check if Qdrant is running
docker ps | grep qdrant

# Check logs
docker logs qdrant-container

# Test connection
curl http://localhost:6333/health
```

#### 2. Embedding Generation Fails
```bash
# Check OpenAI API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Check rate limits
# Monitor usage in OpenAI dashboard
```

#### 3. Cache Issues
```bash
# Check Redis connection
redis-cli ping

# Clear cache if needed
redis-cli flushall

# Monitor cache stats
redis-cli info memory
```

#### 4. Document Processing Fails
```bash
# Check file permissions
ls -la uploads/

# Check file size limits
echo $MAX_FILE_SIZE

# Check supported file types
echo $ALLOWED_FILE_TYPES
```

### Performance Issues

#### 1. Slow Search Performance
- Check vector database indexing
- Optimize chunk size and overlap
- Enable result caching
- Use approximate search for large datasets

#### 2. High Memory Usage
- Reduce vector database cache size
- Optimize embedding cache TTL
- Use pagination for large result sets
- Monitor memory usage regularly

#### 3. High API Costs
- Increase embedding cache hit rate
- Use smaller embedding models
- Implement query deduplication
- Monitor usage analytics

## 📈 Scaling Considerations

### 1. Horizontal Scaling
- Load balance application instances
- Use Redis Cluster for caching
- Shard vector database collections
- Implement connection pooling

### 2. Vertical Scaling
- Increase server resources
- Optimize database queries
- Use faster storage (SSD)
- Increase connection limits

### 3. Geographic Distribution
- Deploy in multiple regions
- Use CDN for static assets
- Implement data replication
- Optimize for latency

## 🎯 Success Metrics

### Key Performance Indicators
- ✅ **Search Latency** < 2 seconds
- ✅ **Cache Hit Rate** > 80%
- ✅ **Relevance Score** > 0.75
- ✅ **Uptime** > 99.9%
- ✅ **Cost per Search** < $0.01

### Monitoring Dashboard
- Real-time performance metrics
- Usage analytics and trends
- Error rates and alerts
- Cost tracking and optimization

## 🎉 Deployment Complete!

Your RAG system is now ready for production use with:

- ✅ **Multi-format document processing**
- ✅ **Intelligent chunking strategies**
- ✅ **Hybrid search capabilities**
- ✅ **Production-grade vector database**
- ✅ **Advanced caching system**
- ✅ **Comprehensive monitoring**
- ✅ **Enterprise security**
- ✅ **Scalable architecture**

**Ready to power intelligent AI conversations! 🤖✨**
