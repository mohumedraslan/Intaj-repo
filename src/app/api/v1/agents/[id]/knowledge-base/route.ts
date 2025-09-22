/**
 * Knowledge Base API Routes
 * Handles document upload, management, and search operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getKnowledgeBaseService, KnowledgeBaseService } from '@/services/knowledgeBaseService';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Initialize services
const knowledgeBaseService = getKnowledgeBaseService();
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Upload documents to knowledge base
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
    
    // Parse multipart form data
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const optionsStr = formData.get('options') as string;
    
    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }
    
    // Parse processing options
    let options = {};
    if (optionsStr) {
      try {
        options = JSON.parse(optionsStr);
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid options JSON' },
          { status: 400 }
        );
      }
    }
    
    // Validate file types and sizes
    const maxFileSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv',
      'text/markdown',
      'application/json',
      'text/html'
    ];
    
    for (const file of files) {
      if (file.size > maxFileSize) {
        return NextResponse.json(
          { error: `File ${file.name} exceeds maximum size of 50MB` },
          { status: 400 }
        );
      }
      
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: `File type ${file.type} is not supported` },
          { status: 400 }
        );
      }
    }
    
    // Process files
    const results = [];
    
    for (const file of files) {
      try {
        const metadata = {
          title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
          source: 'upload',
          fileType: file.type,
          fileSize: file.size,
          lastModified: new Date(file.lastModified),
          version: 1
        };
        
        const document = await knowledgeBaseService.addDocument(
          agentId,
          file,
          metadata,
          user.id,
          options
        );
        
        results.push({
          success: true,
          document: {
            id: document.id,
            title: document.title,
            filename: document.filename,
            fileType: document.fileType,
            fileSize: document.fileSize,
            status: document.status,
            createdAt: document.createdAt
          }
        });
        
      } catch (error) {
        results.push({
          success: false,
          filename: file.name,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      results,
      totalFiles: files.length,
      successfulUploads: results.filter(r => r.success).length
    });
    
  } catch (error) {
    console.error('Document upload error:', error);
    
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
 * List documents in knowledge base
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agentId = params.id;
    const { searchParams } = new URL(request.url);
    
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
    
    // Parse query parameters
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status') as any;
    const fileType = searchParams.get('fileType') || undefined;
    
    // Get documents
    const { documents, total } = await knowledgeBaseService.listDocuments(
      agentId,
      user.id,
      { limit, offset, status, fileType }
    );
    
    // Get knowledge base stats
    const stats = await knowledgeBaseService.getKnowledgeBaseStats(agentId, user.id);
    
    return NextResponse.json({
      success: true,
      documents: documents.map(doc => ({
        id: doc.id,
        title: doc.title,
        filename: doc.filename,
        fileType: doc.fileType,
        fileSize: doc.fileSize,
        status: doc.status,
        chunksCount: doc.chunksCount,
        tokensCount: doc.tokensCount,
        processingTime: doc.processingTime,
        errorMessage: doc.errorMessage,
        version: doc.version,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      stats
    });
    
  } catch (error) {
    console.error('List documents error:', error);
    
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
 * Delete all documents (clear knowledge base)
 */
export async function DELETE(
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
    
    // Get all documents
    const { documents } = await knowledgeBaseService.listDocuments(
      agentId,
      user.id,
      { limit: 1000 }
    );
    
    // Delete all documents
    const results = [];
    for (const document of documents) {
      try {
        await knowledgeBaseService.removeDocument(agentId, document.id, user.id);
        results.push({ success: true, documentId: document.id });
      } catch (error) {
        results.push({
          success: false,
          documentId: document.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Knowledge base cleared',
      results,
      totalDocuments: documents.length,
      deletedDocuments: results.filter(r => r.success).length
    });
    
  } catch (error) {
    console.error('Clear knowledge base error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
