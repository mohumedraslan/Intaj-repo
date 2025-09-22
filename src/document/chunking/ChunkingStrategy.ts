/**
 * Base Chunking Strategy
 * Abstract class for different document chunking approaches
 */

import { TextChunk, ChunkMetadata } from '../DocumentProcessor';

export interface ChunkingOptions {
  documentId: string;
  metadata: any;
  maxChunkSize?: number;
  chunkOverlap?: number;
  preserveFormatting?: boolean;
  minChunkSize?: number;
  respectSentenceBoundaries?: boolean;
  respectParagraphBoundaries?: boolean;
}

export abstract class ChunkingStrategy {
  protected readonly defaultMaxChunkSize = 1000;
  protected readonly defaultChunkOverlap = 200;
  protected readonly defaultMinChunkSize = 100;
  
  /**
   * Chunk text according to the strategy
   */
  abstract chunk(text: string, options?: ChunkingOptions): Promise<TextChunk[]>;
  
  /**
   * Estimate token count for text (rough approximation)
   */
  protected estimateTokenCount(text: string): number {
    // Rough approximation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }
  
  /**
   * Generate chunk ID
   */
  protected generateChunkId(documentId: string, chunkIndex: number): string {
    return `${documentId}_chunk_${chunkIndex}`;
  }
  
  /**
   * Create text chunk object
   */
  protected createTextChunk(
    content: string,
    documentId: string,
    chunkIndex: number,
    totalChunks: number,
    startOffset: number,
    endOffset: number,
    additionalMetadata: Partial<ChunkMetadata> = {}
  ): TextChunk {
    return {
      id: this.generateChunkId(documentId, chunkIndex),
      content: content.trim(),
      metadata: {
        documentId,
        ...additionalMetadata
      },
      chunkIndex,
      totalChunks,
      tokenCount: this.estimateTokenCount(content),
      startOffset,
      endOffset
    };
  }
  
  /**
   * Split text while respecting sentence boundaries
   */
  protected splitBySentences(text: string): string[] {
    // Simple sentence splitting - in production, use a proper NLP library
    return text
      .split(/[.!?]+/)
      .map(sentence => sentence.trim())
      .filter(sentence => sentence.length > 0);
  }
  
  /**
   * Split text while respecting paragraph boundaries
   */
  protected splitByParagraphs(text: string): string[] {
    return text
      .split(/\n\s*\n/)
      .map(paragraph => paragraph.trim())
      .filter(paragraph => paragraph.length > 0);
  }
  
  /**
   * Split text while respecting word boundaries
   */
  protected splitByWords(text: string): string[] {
    return text
      .split(/\s+/)
      .filter(word => word.length > 0);
  }
  
  /**
   * Create overlapping chunks
   */
  protected createOverlappingChunks(
    sentences: string[],
    maxChunkSize: number,
    overlapSize: number
  ): string[] {
    const chunks: string[] = [];
    let currentChunk = '';
    let overlapBuffer = '';
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;
      
      if (potentialChunk.length > maxChunkSize && currentChunk.length > 0) {
        // Add current chunk
        chunks.push(currentChunk.trim());
        
        // Create overlap for next chunk
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.floor(overlapSize / 4)); // Approximate word count for overlap
        overlapBuffer = overlapWords.join(' ');
        
        // Start new chunk with overlap
        currentChunk = overlapBuffer + (overlapBuffer ? ' ' : '') + sentence;
      } else {
        currentChunk = potentialChunk;
      }
    }
    
    // Add the last chunk if it has content
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }
  
  /**
   * Clean and normalize chunk content
   */
  protected cleanChunkContent(content: string): string {
    return content
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
  
  /**
   * Extract headers from text (simple implementation)
   */
  protected extractHeaders(text: string): string[] {
    const headers: string[] = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      // Simple header detection - lines that are short and don't end with punctuation
      if (trimmed.length > 0 && trimmed.length < 100 && !/[.!?]$/.test(trimmed)) {
        // Check if it looks like a header (starts with capital, contains few words)
        const words = trimmed.split(' ');
        if (words.length <= 10 && /^[A-Z]/.test(trimmed)) {
          headers.push(trimmed);
        }
      }
    }
    
    return headers;
  }
  
  /**
   * Detect content type of chunk
   */
  protected detectContentType(content: string): ChunkMetadata['contentType'] {
    const lowerContent = content.toLowerCase();
    
    // Check for code patterns
    if (this.isCodeContent(content)) {
      return 'code';
    }
    
    // Check for FAQ patterns
    if (lowerContent.includes('question:') || lowerContent.includes('q:') || 
        lowerContent.includes('answer:') || lowerContent.includes('a:')) {
      return 'faq';
    }
    
    // Check for table patterns
    if (content.includes('|') || content.includes('\t')) {
      return 'table';
    }
    
    // Check for list patterns
    if (/^\s*[-*•]\s/.test(content) || /^\s*\d+\.\s/.test(content)) {
      return 'list';
    }
    
    return 'text';
  }
  
  /**
   * Check if content appears to be code
   */
  protected isCodeContent(content: string): boolean {
    const codeIndicators = [
      /function\s+\w+\s*\(/,
      /class\s+\w+/,
      /import\s+.*from/,
      /export\s+(default\s+)?/,
      /const\s+\w+\s*=/,
      /let\s+\w+\s*=/,
      /var\s+\w+\s*=/,
      /if\s*\(/,
      /for\s*\(/,
      /while\s*\(/,
      /\{[\s\S]*\}/,
      /^\s*\/\//m,
      /^\s*\/\*/m,
      /^\s*#/m
    ];
    
    return codeIndicators.some(pattern => pattern.test(content));
  }
  
  /**
   * Extract keywords from content
   */
  protected extractKeywords(content: string): string[] {
    // Simple keyword extraction - in production, use proper NLP
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word));
    
    // Get unique words and sort by frequency
    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });
    
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }
  
  /**
   * Check if word is a stop word
   */
  protected isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
      'before', 'after', 'above', 'below', 'between', 'among', 'this', 'that',
      'these', 'those', 'is', 'was', 'are', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'can', 'shall'
    ]);
    
    return stopWords.has(word.toLowerCase());
  }
}
