/**
 * Semantic Chunking Strategy
 * Splits documents by semantic boundaries while maintaining context
 */

import { ChunkingStrategy, ChunkingOptions } from './ChunkingStrategy';
import { TextChunk } from '../DocumentProcessor';

export class SemanticChunking extends ChunkingStrategy {
  /**
   * Chunk text by semantic boundaries (sentences, paragraphs)
   */
  async chunk(text: string, options: ChunkingOptions = {} as ChunkingOptions): Promise<TextChunk[]> {
    const {
      documentId,
      metadata,
      maxChunkSize = this.defaultMaxChunkSize,
      chunkOverlap = this.defaultChunkOverlap,
      minChunkSize = this.defaultMinChunkSize,
      respectSentenceBoundaries = true,
      respectParagraphBoundaries = true
    } = options;
    
    if (!text.trim()) {
      return [];
    }
    
    console.log('Starting semantic chunking:', {
      textLength: text.length,
      maxChunkSize,
      chunkOverlap,
      respectSentenceBoundaries,
      respectParagraphBoundaries
    });
    
    // First, split by paragraphs if requested
    let textUnits: string[];
    if (respectParagraphBoundaries) {
      textUnits = this.splitByParagraphs(text);
    } else {
      textUnits = [text];
    }
    
    // Further split by sentences if requested
    if (respectSentenceBoundaries) {
      const sentences: string[] = [];
      textUnits.forEach(unit => {
        sentences.push(...this.splitBySentences(unit));
      });
      textUnits = sentences;
    }
    
    // Create semantic chunks with overlap
    const chunkContents = this.createSemanticChunks(textUnits, maxChunkSize, chunkOverlap, minChunkSize);
    
    // Convert to TextChunk objects
    const chunks: TextChunk[] = [];
    let currentOffset = 0;
    
    for (let i = 0; i < chunkContents.length; i++) {
      const content = chunkContents[i];
      const cleanContent = this.cleanChunkContent(content);
      
      if (cleanContent.length < minChunkSize) {
        // Skip chunks that are too small, unless it's the last chunk
        if (i < chunkContents.length - 1) {
          continue;
        }
      }
      
      const startOffset = currentOffset;
      const endOffset = startOffset + cleanContent.length;
      
      // Extract additional metadata
      const headers = this.extractHeaders(cleanContent);
      const keywords = this.extractKeywords(cleanContent);
      const contentType = this.detectContentType(cleanContent);
      
      const chunk = this.createTextChunk(
        cleanContent,
        documentId,
        chunks.length,
        chunkContents.length,
        startOffset,
        endOffset,
        {
          ...metadata,
          headers,
          keywords,
          contentType,
          section: this.detectSection(cleanContent, headers)
        }
      );
      
      chunks.push(chunk);
      currentOffset = endOffset;
    }
    
    // Update total chunks count
    chunks.forEach(chunk => {
      chunk.totalChunks = chunks.length;
    });
    
    console.log('Semantic chunking completed:', {
      originalLength: text.length,
      chunksCreated: chunks.length,
      averageChunkSize: chunks.reduce((sum, chunk) => sum + chunk.content.length, 0) / chunks.length,
      totalTokens: chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0)
    });
    
    return chunks;
  }
  
  /**
   * Create semantic chunks with intelligent splitting
   */
  private createSemanticChunks(
    textUnits: string[],
    maxChunkSize: number,
    overlapSize: number,
    minChunkSize: number
  ): string[] {
    const chunks: string[] = [];
    let currentChunk = '';
    let previousChunkEnd = '';
    
    for (let i = 0; i < textUnits.length; i++) {
      const unit = textUnits[i].trim();
      if (!unit) continue;
      
      const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + unit;
      
      // Check if adding this unit would exceed the max size
      if (potentialChunk.length > maxChunkSize && currentChunk.length > 0) {
        // Finalize current chunk
        const finalChunk = this.addOverlapToChunk(currentChunk, previousChunkEnd, overlapSize);
        chunks.push(finalChunk);
        
        // Prepare overlap for next chunk
        previousChunkEnd = this.extractChunkEnd(currentChunk, overlapSize);
        
        // Start new chunk with current unit
        currentChunk = unit;
      } else {
        currentChunk = potentialChunk;
      }
    }
    
    // Add the last chunk
    if (currentChunk.trim().length >= minChunkSize) {
      const finalChunk = this.addOverlapToChunk(currentChunk, previousChunkEnd, overlapSize);
      chunks.push(finalChunk);
    } else if (chunks.length > 0) {
      // Merge small last chunk with previous chunk
      const lastChunk = chunks.pop()!;
      const mergedChunk = lastChunk + ' ' + currentChunk;
      chunks.push(mergedChunk);
    }
    
    return chunks.filter(chunk => chunk.trim().length > 0);
  }
  
  /**
   * Add overlap from previous chunk to current chunk
   */
  private addOverlapToChunk(currentChunk: string, previousChunkEnd: string, overlapSize: number): string {
    if (!previousChunkEnd || overlapSize <= 0) {
      return currentChunk;
    }
    
    // Avoid duplicate content
    if (currentChunk.startsWith(previousChunkEnd.substring(0, Math.min(50, previousChunkEnd.length)))) {
      return currentChunk;
    }
    
    return previousChunkEnd + ' ' + currentChunk;
  }
  
  /**
   * Extract the end portion of a chunk for overlap
   */
  private extractChunkEnd(chunk: string, overlapSize: number): string {
    if (overlapSize <= 0 || chunk.length <= overlapSize) {
      return '';
    }
    
    // Try to find a good breaking point (sentence boundary)
    const sentences = this.splitBySentences(chunk);
    if (sentences.length > 1) {
      // Take the last sentence(s) that fit within overlap size
      let overlap = '';
      for (let i = sentences.length - 1; i >= 0; i--) {
        const potentialOverlap = sentences[i] + (overlap ? ' ' : '') + overlap;
        if (potentialOverlap.length <= overlapSize) {
          overlap = potentialOverlap;
        } else {
          break;
        }
      }
      if (overlap) {
        return overlap;
      }
    }
    
    // Fallback to character-based overlap
    const words = chunk.split(' ');
    let overlap = '';
    for (let i = words.length - 1; i >= 0; i--) {
      const potentialOverlap = words[i] + (overlap ? ' ' : '') + overlap;
      if (potentialOverlap.length <= overlapSize) {
        overlap = potentialOverlap;
      } else {
        break;
      }
    }
    
    return overlap;
  }
  
  /**
   * Detect section name from content and headers
   */
  private detectSection(content: string, headers: string[]): string | undefined {
    if (headers.length > 0) {
      return headers[0];
    }
    
    // Try to detect section from content patterns
    const lines = content.split('\n').map(line => line.trim());
    for (const line of lines.slice(0, 3)) { // Check first 3 lines
      if (line.length > 0 && line.length < 100) {
        // Check if it looks like a section header
        if (/^[A-Z][^.!?]*$/.test(line) || /^\d+\.?\s+[A-Z]/.test(line)) {
          return line;
        }
      }
    }
    
    return undefined;
  }
  
  /**
   * Enhanced sentence splitting with better boundary detection
   */
  protected splitBySentences(text: string): string[] {
    // More sophisticated sentence splitting
    const sentences: string[] = [];
    
    // Split by common sentence endings, but be careful with abbreviations
    const parts = text.split(/([.!?]+\s+)/);
    
    let currentSentence = '';
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      
      if (/[.!?]+\s+/.test(part)) {
        // This is a sentence ending
        currentSentence += part.replace(/\s+$/, ''); // Remove trailing whitespace
        if (currentSentence.trim().length > 0) {
          sentences.push(currentSentence.trim());
        }
        currentSentence = '';
      } else {
        currentSentence += part;
      }
    }
    
    // Add any remaining content
    if (currentSentence.trim().length > 0) {
      sentences.push(currentSentence.trim());
    }
    
    return sentences.filter(sentence => sentence.length > 0);
  }
  
  /**
   * Enhanced paragraph splitting
   */
  protected splitByParagraphs(text: string): string[] {
    return text
      .split(/\n\s*\n/)
      .map(paragraph => paragraph.replace(/\n/g, ' ').trim())
      .filter(paragraph => paragraph.length > 0);
  }
}
