/**
 * Individual Document Management API Routes
 * Handles single document operations (get, update, delete)
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
 * Get document details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; documentId: string } }
) {
  try {
    const { id: agentId, documentId } = params;
    
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
    
    // Get document
    const document = await knowledgeBaseService.getDocument(documentId, user.id);
    
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }
    
    // Verify agent ownership
    if (document.agentId !== agentId) {
      return NextResponse.json(
        { error: 'Document does not belong to this agent' },
        { status: 400 }
      );
    }
    
    // Get document versions
    const versions = await knowledgeBaseService.getDocumentVersions(documentId, user.id);
    
    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        agentId: document.agentId,
        title: document.title,
        filename: document.filename,
        fileType: document.fileType,
        fileSize: document.fileSize,
        status: document.status,
        chunksCount: document.chunksCount,
        tokensCount: document.tokensCount,
        embeddingsCount: document.embeddingsCount,
        processingTime: document.processingTime,
        errorMessage: document.errorMessage,
        metadata: document.metadata,
        version: document.version,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt
      },
      versions: versions.map(v => ({
        id: v.id,
        version: v.version,
        filename: v.filename,
        fileSize: v.fileSize,
        chunksCount: v.chunksCount,
        tokensCount: v.tokensCount,
        createdAt: v.createdAt,
        processingResult: v.processingResult
      }))
    });
    
  } catch (error) {
    console.error('Get document error:', error);
    
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
 * Update document (upload new version)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; documentId: string } }
) {
  try {
    const { id: agentId, documentId } = params;
    
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
    const file = formData.get('file') as File;
    const optionsStr = formData.get('options') as string;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Validate file
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
    
    if (file.size > maxFileSize) {
      return NextResponse.json(
        { error: 'File exceeds maximum size of 50MB' },
        { status: 400 }
      );
    }
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `File type ${file.type} is not supported` },
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
    
    // Update document
    const updatedDocument = await knowledgeBaseService.updateDocument(
      agentId,
      documentId,
      file,
      user.id,
      options
    );
    
    return NextResponse.json({
      success: true,
      message: 'Document updated successfully',
      document: {
        id: updatedDocument.id,
        title: updatedDocument.title,
        filename: updatedDocument.filename,
        fileType: updatedDocument.fileType,
        fileSize: updatedDocument.fileSize,
        status: updatedDocument.status,
        version: updatedDocument.version,
        updatedAt: updatedDocument.updatedAt
      }
    });
    
  } catch (error) {
    console.error('Update document error:', error);
    
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
 * Delete document
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; documentId: string } }
) {
  try {
    const { id: agentId, documentId } = params;
    
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
    
    // Delete document
    await knowledgeBaseService.removeDocument(agentId, documentId, user.id);
    
    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
      documentId
    });
    
  } catch (error) {
    console.error('Delete document error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
