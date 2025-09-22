/**
 * Document Processing Pipeline
 * Handles document ingestion, text extraction, chunking, and embedding generation
 */

import { VectorDBClient, getVectorDBClient, VectorDocument, DocumentMetadata } from '../vectordb/VectorDBClient';
import { EmbeddingService, getEmbeddingService } from '../embeddings/EmbeddingService';
import { ChunkingStrategy } from './chunking/ChunkingStrategy';
import { SemanticChunking } from './chunking/SemanticChunking';
import { FAQChunking } from './chunking/FAQChunking';
import { CodeChunking } from './chunking/CodeChunking';
import { ErrorFactory } from '@/lib/errors';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import Papa from 'papaparse';

export interface TextChunk {
  id: string;
  content: string;
  metadata: ChunkMetadata;
  chunkIndex: number;
  totalChunks: number;
  tokenCount: number;
  startOffset: number;
  endOffset: number;
}

export interface ChunkMetadata {
  documentId: string;
  title?: string;
  section?: string;
  pageNumber?: number;
  headers?: string[];
  keywords?: string[];
  language?: string;
  contentType?: 'text' | 'code' | 'table' | 'list' | 'faq';
}

export interface ProcessingResult {
  success: boolean;
  documentId: string;
  chunksProcessed: number;
  tokensGenerated: number;
  embeddingsCreated: number;
  processingTime: number;
  fileSize: number;
  error?: string;
  warnings?: string[];
}

export interface ProcessingOptions {
  chunkingStrategy?: 'semantic' | 'faq' | 'code' | 'fixed';
  maxChunkSize?: number;
  chunkOverlap?: number;
  preserveFormatting?: boolean;
  extractMetadata?: boolean;
  generateSummary?: boolean;
  detectLanguage?: boolean;
}

export class DocumentProcessingError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'DocumentProcessingError';
  }
}

export class UnsupportedFileTypeError extends Error {
  constructor(fileType: string) {
    super(`Unsupported file type: ${fileType}`);
    this.name = 'UnsupportedFileTypeError';
  }
}

export class DocumentProcessor {
  private vectorDB: VectorDBClient;
  private embeddingService: EmbeddingService;
  private chunkingStrategies: Map<string, ChunkingStrategy> = new Map();
  private readonly maxFileSize = 50 * 1024 * 1024; // 50MB
  private readonly supportedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv',
    'text/markdown',
    'application/json',
    'text/html',
    'text/xml'
  ];
  
  constructor() {
    this.vectorDB = getVectorDBClient();
    this.embeddingService = getEmbeddingService();
    
    // Initialize chunking strategies
    this.chunkingStrategies.set('semantic', new SemanticChunking());
    this.chunkingStrategies.set('faq', new FAQChunking());
    this.chunkingStrategies.set('code', new CodeChunking());
    
    console.log('Document processor initialized with strategies:', 
      Array.from(this.chunkingStrategies.keys()));
  }
  
  /**
   * Process a document file
   */
  async processDocument(
    file: File,
    agentId: string,
    metadata: DocumentMetadata,
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const documentId = this.generateDocumentId();
    const warnings: string[] = [];
    
    try {
      console.log('Starting document processing:', {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        agentId,
        documentId,
        options
      });
      
      // Validate file
      this.validateFile(file);
      
      // Extract text based on file type
      const extractedText = await this.extractText(file);
      
      if (!extractedText.trim()) {
        throw new DocumentProcessingError('No text content extracted from file');
      }
      
      // Clean and normalize text
      const cleanedText = this.cleanText(extractedText);
      
      // Detect language if requested
      if (options.detectLanguage) {
        metadata.language = this.detectLanguage(cleanedText);
      }
      
      // Choose chunking strategy
      const strategy = this.selectChunkingStrategy(file.type, options.chunkingStrategy);
      
      // Chunk document intelligently
      const chunks = await this.chunkDocument(
        cleanedText,
        documentId,
        metadata,
        strategy,
        options
      );
      
      if (chunks.length === 0) {
        throw new DocumentProcessingError('No chunks generated from document');
      }
      
      // Generate embeddings for each chunk
      const vectorDocuments = await this.generateEmbeddings(chunks, agentId);
      
      // Store in vector database
      await this.vectorDB.upsertDocuments(agentId, vectorDocuments);
      
      // Update agent's knowledge base metadata
      await this.updateKnowledgeBaseMetadata(agentId, documentId, metadata, chunks.length);
      
      const processingTime = Date.now() - startTime;
      const totalTokens = chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0);
      
      const result: ProcessingResult = {
        success: true,
        documentId,
        chunksProcessed: chunks.length,
        tokensGenerated: totalTokens,
        embeddingsCreated: vectorDocuments.length,
        processingTime,
        fileSize: file.size,
        warnings: warnings.length > 0 ? warnings : undefined
      };
      
      console.log('Document processing completed successfully:', result);
      
      return result;
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.error('Document processing failed:', {
        fileName: file.name,
        agentId,
        documentId,
        error: errorMessage,
        processingTime
      });
      
      return {
        success: false,
        documentId,
        chunksProcessed: 0,
        tokensGenerated: 0,
        embeddingsCreated: 0,
        processingTime,
        fileSize: file.size,
        error: errorMessage,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    }
  }
  
  /**
   * Extract text from various file formats
   */
  private async extractText(file: File): Promise<string> {
    console.log('Extracting text from file:', { type: file.type, size: file.size });
    
    switch (file.type) {
      case 'application/pdf':
        return this.extractFromPDF(file);
        
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return this.extractFromDOCX(file);
        
      case 'text/csv':
        return this.extractFromCSV(file);
        
      case 'text/plain':
      case 'text/markdown':
        return this.extractFromText(file);
        
      case 'application/json':
        return this.extractFromJSON(file);
        
      case 'text/html':
        return this.extractFromHTML(file);
        
      case 'text/xml':
        return this.extractFromXML(file);
        
      default:
        throw new UnsupportedFileTypeError(file.type);
    }
  }
  
  /**
   * Extract text from PDF files
   */
  private async extractFromPDF(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        fullText += `\n\n--- Page ${pageNum} ---\n${pageText}`;
      }
      
      console.log('PDF extraction completed:', {
        pages: pdf.numPages,
        textLength: fullText.length
      });
      
      return fullText.trim();
      
    } catch (error) {
      console.error('PDF extraction failed:', error);
      throw new DocumentProcessingError(
        `Failed to extract text from PDF: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  /**
   * Extract text from DOCX files
   */
  private async extractFromDOCX(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      
      if (result.messages.length > 0) {
        console.warn('DOCX extraction warnings:', result.messages);
      }
      
      console.log('DOCX extraction completed:', {
        textLength: result.value.length,
        warnings: result.messages.length
      });
      
      return result.value;
      
    } catch (error) {
      console.error('DOCX extraction failed:', error);
      throw new DocumentProcessingError(
        `Failed to extract text from DOCX: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  /**
   * Extract text from CSV files
   */
  private async extractFromCSV(file: File): Promise<string> {
    try {
      const text = await file.text();
      const parsed = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        transform: (value) => value.trim()
      });
      
      if (parsed.errors.length > 0) {
        console.warn('CSV parsing warnings:', parsed.errors);
      }
      
      // Convert CSV data to readable text format
      const headers = Object.keys(parsed.data[0] || {});
      let formattedText = `CSV Data with columns: ${headers.join(', ')}\n\n`;
      
      parsed.data.forEach((row: any, index: number) => {
        formattedText += `Row ${index + 1}:\n`;
        headers.forEach(header => {
          if (row[header]) {
            formattedText += `${header}: ${row[header]}\n`;
          }
        });
        formattedText += '\n';
      });
      
      console.log('CSV extraction completed:', {
        rows: parsed.data.length,
        columns: headers.length,
        textLength: formattedText.length
      });
      
      return formattedText;
      
    } catch (error) {
      console.error('CSV extraction failed:', error);
      throw new DocumentProcessingError(
        `Failed to extract text from CSV: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  /**
   * Extract text from plain text files
   */
  private async extractFromText(file: File): Promise<string> {
    try {
      const text = await file.text();
      
      console.log('Text extraction completed:', {
        textLength: text.length
      });
      
      return text;
      
    } catch (error) {
      console.error('Text extraction failed:', error);
      throw new DocumentProcessingError(
        `Failed to extract text: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  /**
   * Extract text from JSON files
   */
  private async extractFromJSON(file: File): Promise<string> {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Convert JSON to readable text format
      const formattedText = this.jsonToText(data);
      
      console.log('JSON extraction completed:', {
        textLength: formattedText.length
      });
      
      return formattedText;
      
    } catch (error) {
      console.error('JSON extraction failed:', error);
      throw new DocumentProcessingError(
        `Failed to extract text from JSON: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  /**
   * Extract text from HTML files
   */
  private async extractFromHTML(file: File): Promise<string> {
    try {
      const html = await file.text();
      
      // Simple HTML tag removal (in production, use a proper HTML parser)
      const text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      console.log('HTML extraction completed:', {
        originalLength: html.length,
        textLength: text.length
      });
      
      return text;
      
    } catch (error) {
      console.error('HTML extraction failed:', error);
      throw new DocumentProcessingError(
        `Failed to extract text from HTML: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  /**
   * Extract text from XML files
   */
  private async extractFromXML(file: File): Promise<string> {
    try {
      const xml = await file.text();
      
      // Simple XML tag removal (in production, use a proper XML parser)
      const text = xml
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      console.log('XML extraction completed:', {
        originalLength: xml.length,
        textLength: text.length
      });
      
      return text;
      
    } catch (error) {
      console.error('XML extraction failed:', error);
      throw new DocumentProcessingError(
        `Failed to extract text from XML: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  /**
   * Clean and normalize text
   */
  private cleanText(text: string): string {
    return text
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Remove excessive line breaks
      .replace(/\n{3,}/g, '\n\n')
      // Remove control characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Trim
      .trim();
  }
  
  /**
   * Detect text language (simplified implementation)
   */
  private detectLanguage(text: string): string {
    // Simple language detection based on common words
    // In production, use a proper language detection library
    const sample = text.toLowerCase().substring(0, 1000);
    
    const englishWords = ['the', 'and', 'is', 'in', 'to', 'of', 'a', 'that', 'it', 'with'];
    const englishCount = englishWords.reduce((count, word) => 
      count + (sample.split(word).length - 1), 0);
    
    if (englishCount > 5) {
      return 'en';
    }
    
    return 'unknown';
  }
  
  /**
   * Select appropriate chunking strategy
   */
  private selectChunkingStrategy(
    fileType: string,
    preferredStrategy?: string
  ): ChunkingStrategy {
    if (preferredStrategy && this.chunkingStrategies.has(preferredStrategy)) {
      return this.chunkingStrategies.get(preferredStrategy)!;
    }
    
    // Auto-select based on file type
    switch (fileType) {
      case 'application/json':
      case 'text/html':
      case 'text/xml':
        return this.chunkingStrategies.get('code')!;
      default:
        return this.chunkingStrategies.get('semantic')!;
    }
  }
  
  /**
   * Chunk document using selected strategy
   */
  private async chunkDocument(
    text: string,
    documentId: string,
    metadata: DocumentMetadata,
    strategy: ChunkingStrategy,
    options: ProcessingOptions
  ): Promise<TextChunk[]> {
    const chunks = await strategy.chunk(text, {
      documentId,
      metadata,
      maxChunkSize: options.maxChunkSize || 1000,
      chunkOverlap: options.chunkOverlap || 200,
      preserveFormatting: options.preserveFormatting || false
    });
    
    console.log('Document chunking completed:', {
      strategy: strategy.constructor.name,
      totalChunks: chunks.length,
      averageChunkSize: chunks.reduce((sum, chunk) => sum + chunk.content.length, 0) / chunks.length
    });
    
    return chunks;
  }
  
  /**
   * Generate embeddings for chunks
   */
  private async generateEmbeddings(
    chunks: TextChunk[],
    agentId: string
  ): Promise<VectorDocument[]> {
    const vectorDocuments: VectorDocument[] = [];
    
    // Process chunks in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const batchTexts = batch.map(chunk => chunk.content);
      
      // Generate embeddings for the batch
      const embeddings = await this.embeddingService.batchGenerateEmbeddings(
        batchTexts,
        'text-embedding-3-small'
      );
      
      // Create vector documents
      for (let j = 0; j < batch.length; j++) {
        const chunk = batch[j];
        const embedding = embeddings[j];
        
        vectorDocuments.push({
          id: chunk.id,
          vector: embedding,
          payload: {
            agentId,
            documentId: chunk.metadata.documentId,
            chunkIndex: chunk.chunkIndex,
            totalChunks: chunk.totalChunks,
            content: chunk.content,
            metadata: chunk.metadata,
            tokenCount: chunk.tokenCount,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        });
      }
      
      console.log(`Generated embeddings for batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`);
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < chunks.length) {
        await this.sleep(100);
      }
    }
    
    return vectorDocuments;
  }
  
  /**
   * Update knowledge base metadata
   */
  private async updateKnowledgeBaseMetadata(
    agentId: string,
    documentId: string,
    metadata: DocumentMetadata,
    chunkCount: number
  ): Promise<void> {
    // This would typically update a database table with document metadata
    // For now, we'll log the information
    console.log('Knowledge base metadata updated:', {
      agentId,
      documentId,
      metadata,
      chunkCount
    });
  }
  
  /**
   * Validate file before processing
   */
  private validateFile(file: File): void {
    if (file.size > this.maxFileSize) {
      throw new DocumentProcessingError(
        `File size ${file.size} exceeds maximum allowed size of ${this.maxFileSize} bytes`
      );
    }
    
    if (!this.supportedTypes.includes(file.type)) {
      throw new UnsupportedFileTypeError(file.type);
    }
  }
  
  /**
   * Convert JSON to readable text
   */
  private jsonToText(obj: any, depth: number = 0): string {
    const indent = '  '.repeat(depth);
    let text = '';
    
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        text += `${indent}Item ${index + 1}:\n`;
        text += this.jsonToText(item, depth + 1);
      });
    } else if (typeof obj === 'object' && obj !== null) {
      Object.entries(obj).forEach(([key, value]) => {
        text += `${indent}${key}: `;
        if (typeof value === 'object') {
          text += '\n' + this.jsonToText(value, depth + 1);
        } else {
          text += `${value}\n`;
        }
      });
    } else {
      text += `${indent}${obj}\n`;
    }
    
    return text;
  }
  
  /**
   * Generate unique document ID
   */
  private generateDocumentId(): string {
    return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
let documentProcessorInstance: DocumentProcessor | null = null;

/**
 * Get or create document processor singleton
 */
export function getDocumentProcessor(): DocumentProcessor {
  if (!documentProcessorInstance) {
    documentProcessorInstance = new DocumentProcessor();
  }
  return documentProcessorInstance;
}

// Export types
export type {
  TextChunk,
  ChunkMetadata,
  ProcessingResult,
  ProcessingOptions
};
