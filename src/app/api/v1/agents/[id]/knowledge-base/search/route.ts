/**
 * Knowledge Base Search API Route
 * Handles search queries across agent's knowledge base
 */

import { NextRequest, NextResponse } from 'next/server';
import { getKnowledgeBaseService } from '@/services/knowledgeBaseService';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Initialize services
const knowledgeBaseService = getKnowledgeBaseService();
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Search knowledge base
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agentId = params.id;
    
    // Get user from session
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { query, options = {} } = body;
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }
    
    if (query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query cannot be empty' },
        { status: 400 }
      );
    }
    
    // Validate options
    const {
      maxResults = 10,
      threshold = 0.7,
      maxTokens = 2000,
      includeMetadata = true,
      rerank = true,
      hybridSearch = true,
      boostRecent = false,
      filterBySource,
      filterByCategory,
      filterByTags
    } = options;
    
    // Perform search
    const searchResults = await knowledgeBaseService.searchKnowledgeBase(
      agentId,
      query,
      user.id,
      {
        maxResults,
        threshold,
        maxTokens,
        includeMetadata,
        rerank,
        hybridSearch,
        boostRecent,
        filterBySource,
        filterByCategory,
        filterByTags
      }
    );
    
    return NextResponse.json({
      success: true,
      query: searchResults.query,
      results: searchResults.documents.documents.map(doc => ({
        id: doc.id,
        content: doc.content,
        score: doc.score,
        relevanceScore: doc.relevanceScore,
        source: doc.source,
        title: doc.title,
        category: doc.category,
        tags: doc.tags,
        chunkIndex: doc.chunkIndex,
        totalChunks: doc.totalChunks,
        documentId: doc.documentId,
        metadata: includeMetadata ? doc.metadata : undefined
      })),
      totalResults: searchResults.totalResults,
      totalRelevance: searchResults.documents.totalRelevance,
      sources: searchResults.documents.sources,
      searchTime: searchResults.searchTime,
      searchMethod: searchResults.documents.searchMethod,
      tokensUsed: searchResults.documents.tokensUsed,
      suggestions: searchResults.suggestions
    });
    
  } catch (error) {
    console.error('Knowledge base search error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * Get search suggestions
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agentId = params.id;
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    
    // Get user from session
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    // Generate simple suggestions based on query
    const suggestions: string[] = [];
    
    if (query.length > 0) {
      // Add question variations
      if (!query.endsWith('?')) {
        suggestions.push(`${query}?`);
      }
      
      // Add "how to" variation
      if (!query.toLowerCase().startsWith('how')) {
        suggestions.push(`How to ${query.toLowerCase()}`);
      }
      
      // Add "what is" variation
      if (!query.toLowerCase().startsWith('what')) {
        suggestions.push(`What is ${query.toLowerCase()}`);
      }
      
      // Add "why" variation
      if (!query.toLowerCase().startsWith('why')) {
        suggestions.push(`Why ${query.toLowerCase()}`);
      }
      
      // Add "when" variation
      if (!query.toLowerCase().startsWith('when')) {
        suggestions.push(`When ${query.toLowerCase()}`);
      }
    } else {
      // Default suggestions for empty query
      suggestions.push(
        'How do I...',
        'What is...',
        'Why does...',
        'When should...',
        'Where can I...'
      );
    }
    
    return NextResponse.json({
      success: true,
      query,
      suggestions: suggestions.slice(0, 5)
    });
    
  } catch (error) {
    console.error('Search suggestions error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
