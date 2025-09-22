/**
 * FAQ Chunking Strategy
 * Specialized chunking for FAQ documents where each Q&A pair becomes a chunk
 */

import { ChunkingStrategy, ChunkingOptions } from './ChunkingStrategy';
import { TextChunk } from '../DocumentProcessor';

export interface FAQPair {
  question: string;
  answer: string;
  category?: string;
  tags?: string[];
  startOffset: number;
  endOffset: number;
}

export class FAQChunking extends ChunkingStrategy {
  /**
   * Chunk FAQ text by Q&A pairs
   */
  async chunk(text: string, options: ChunkingOptions = {} as ChunkingOptions): Promise<TextChunk[]> {
    const {
      documentId,
      metadata,
      maxChunkSize = this.defaultMaxChunkSize,
      minChunkSize = this.defaultMinChunkSize
    } = options;
    
    if (!text.trim()) {
      return [];
    }
    
    console.log('Starting FAQ chunking:', {
      textLength: text.length,
      maxChunkSize,
      minChunkSize
    });
    
    // Extract FAQ pairs from text
    const faqPairs = this.extractFAQPairs(text);
    
    if (faqPairs.length === 0) {
      console.warn('No FAQ pairs found, falling back to semantic chunking');
      // Fallback to basic chunking if no FAQ structure is detected
      return this.fallbackChunking(text, options);
    }
    
    // Convert FAQ pairs to chunks
    const chunks: TextChunk[] = [];
    
    for (let i = 0; i < faqPairs.length; i++) {
      const faqPair = faqPairs[i];
      const content = this.formatFAQContent(faqPair);
      
      // Skip if content is too small
      if (content.length < minChunkSize) {
        continue;
      }
      
      // Split large FAQ pairs if they exceed max size
      if (content.length > maxChunkSize) {
        const subChunks = this.splitLargeFAQ(faqPair, maxChunkSize, documentId, chunks.length);
        chunks.push(...subChunks);
      } else {
        const chunk = this.createTextChunk(
          content,
          documentId,
          chunks.length,
          faqPairs.length,
          faqPair.startOffset,
          faqPair.endOffset,
          {
            ...metadata,
            contentType: 'faq',
            section: faqPair.category,
            keywords: faqPair.tags || this.extractKeywords(content),
            title: this.truncateQuestion(faqPair.question)
          }
        );
        
        chunks.push(chunk);
      }
    }
    
    // Update total chunks count
    chunks.forEach(chunk => {
      chunk.totalChunks = chunks.length;
    });
    
    console.log('FAQ chunking completed:', {
      originalLength: text.length,
      faqPairsFound: faqPairs.length,
      chunksCreated: chunks.length,
      averageChunkSize: chunks.reduce((sum, chunk) => sum + chunk.content.length, 0) / chunks.length
    });
    
    return chunks;
  }
  
  /**
   * Extract FAQ pairs from text using various patterns
   */
  private extractFAQPairs(text: string): FAQPair[] {
    const faqPairs: FAQPair[] = [];
    
    // Try different FAQ patterns
    const patterns = [
      this.extractQAPattern(text),
      this.extractQuestionAnswerPattern(text),
      this.extractNumberedPattern(text),
      this.extractBulletPattern(text)
    ];
    
    // Use the pattern that found the most FAQ pairs
    let bestPattern: FAQPair[] = [];
    for (const pattern of patterns) {
      if (pattern.length > bestPattern.length) {
        bestPattern = pattern;
      }
    }
    
    return bestPattern;
  }
  
  /**
   * Extract Q: A: pattern
   */
  private extractQAPattern(text: string): FAQPair[] {
    const faqPairs: FAQPair[] = [];
    const regex = /(?:^|\n)\s*Q\s*[:.]?\s*(.*?)(?:\n|\r\n)\s*A\s*[:.]?\s*(.*?)(?=(?:\n\s*Q\s*[:.])|$)/gims;
    
    let match;
    while ((match = regex.exec(text)) !== null) {
      const question = match[1].trim();
      const answer = match[2].trim();
      
      if (question && answer) {
        faqPairs.push({
          question,
          answer,
          startOffset: match.index,
          endOffset: match.index + match[0].length,
          tags: this.extractTagsFromQA(question, answer)
        });
      }
    }
    
    return faqPairs;
  }
  
  /**
   * Extract Question: Answer: pattern
   */
  private extractQuestionAnswerPattern(text: string): FAQPair[] {
    const faqPairs: FAQPair[] = [];
    const regex = /(?:^|\n)\s*(?:Question|Q)\s*[:.]?\s*(.*?)(?:\n|\r\n)\s*(?:Answer|A)\s*[:.]?\s*(.*?)(?=(?:\n\s*(?:Question|Q)\s*[:.])|$)/gims;
    
    let match;
    while ((match = regex.exec(text)) !== null) {
      const question = match[1].trim();
      const answer = match[2].trim();
      
      if (question && answer) {
        faqPairs.push({
          question,
          answer,
          startOffset: match.index,
          endOffset: match.index + match[0].length,
          tags: this.extractTagsFromQA(question, answer)
        });
      }
    }
    
    return faqPairs;
  }
  
  /**
   * Extract numbered FAQ pattern (1. Question... Answer...)
   */
  private extractNumberedPattern(text: string): FAQPair[] {
    const faqPairs: FAQPair[] = [];
    const regex = /(?:^|\n)\s*\d+\.\s*(.*?\?)\s*(.*?)(?=(?:\n\s*\d+\.)|$)/gims;
    
    let match;
    while ((match = regex.exec(text)) !== null) {
      const question = match[1].trim();
      const answer = match[2].trim();
      
      if (question && answer && question.endsWith('?')) {
        faqPairs.push({
          question,
          answer,
          startOffset: match.index,
          endOffset: match.index + match[0].length,
          tags: this.extractTagsFromQA(question, answer)
        });
      }
    }
    
    return faqPairs;
  }
  
  /**
   * Extract bullet point FAQ pattern
   */
  private extractBulletPattern(text: string): FAQPair[] {
    const faqPairs: FAQPair[] = [];
    const regex = /(?:^|\n)\s*[-*•]\s*(.*?\?)\s*(.*?)(?=(?:\n\s*[-*•])|$)/gims;
    
    let match;
    while ((match = regex.exec(text)) !== null) {
      const question = match[1].trim();
      const answer = match[2].trim();
      
      if (question && answer && question.endsWith('?')) {
        faqPairs.push({
          question,
          answer,
          startOffset: match.index,
          endOffset: match.index + match[0].length,
          tags: this.extractTagsFromQA(question, answer)
        });
      }
    }
    
    return faqPairs;
  }
  
  /**
   * Format FAQ content for chunk
   */
  private formatFAQContent(faqPair: FAQPair): string {
    let content = `Question: ${faqPair.question}\n\nAnswer: ${faqPair.answer}`;
    
    if (faqPair.category) {
      content = `Category: ${faqPair.category}\n\n${content}`;
    }
    
    if (faqPair.tags && faqPair.tags.length > 0) {
      content += `\n\nTags: ${faqPair.tags.join(', ')}`;
    }
    
    return content;
  }
  
  /**
   * Split large FAQ pairs into smaller chunks
   */
  private splitLargeFAQ(
    faqPair: FAQPair,
    maxChunkSize: number,
    documentId: string,
    startIndex: number
  ): TextChunk[] {
    const chunks: TextChunk[] = [];
    
    // If the question itself is too long, split it
    if (faqPair.question.length > maxChunkSize / 2) {
      const questionChunks = this.splitLongText(faqPair.question, maxChunkSize / 2);
      const answerChunks = this.splitLongText(faqPair.answer, maxChunkSize / 2);
      
      // Create chunks for question parts
      questionChunks.forEach((questionPart, index) => {
        const content = `Question (Part ${index + 1}): ${questionPart}`;
        const chunk = this.createTextChunk(
          content,
          documentId,
          startIndex + chunks.length,
          questionChunks.length + answerChunks.length,
          faqPair.startOffset,
          faqPair.endOffset,
          {
            contentType: 'faq',
            section: faqPair.category,
            title: this.truncateQuestion(faqPair.question),
            keywords: faqPair.tags || this.extractKeywords(content)
          }
        );
        chunks.push(chunk);
      });
      
      // Create chunks for answer parts
      answerChunks.forEach((answerPart, index) => {
        const content = `Answer (Part ${index + 1}): ${answerPart}`;
        const chunk = this.createTextChunk(
          content,
          documentId,
          startIndex + chunks.length,
          questionChunks.length + answerChunks.length,
          faqPair.startOffset,
          faqPair.endOffset,
          {
            contentType: 'faq',
            section: faqPair.category,
            title: this.truncateQuestion(faqPair.question),
            keywords: faqPair.tags || this.extractKeywords(content)
          }
        );
        chunks.push(chunk);
      });
    } else {
      // Split the answer while keeping the question intact
      const answerChunks = this.splitLongText(faqPair.answer, maxChunkSize - faqPair.question.length - 50);
      
      answerChunks.forEach((answerPart, index) => {
        const content = `Question: ${faqPair.question}\n\nAnswer (Part ${index + 1}): ${answerPart}`;
        const chunk = this.createTextChunk(
          content,
          documentId,
          startIndex + chunks.length,
          answerChunks.length,
          faqPair.startOffset,
          faqPair.endOffset,
          {
            contentType: 'faq',
            section: faqPair.category,
            title: this.truncateQuestion(faqPair.question),
            keywords: faqPair.tags || this.extractKeywords(content)
          }
        );
        chunks.push(chunk);
      });
    }
    
    return chunks;
  }
  
  /**
   * Split long text into smaller parts
   */
  private splitLongText(text: string, maxLength: number): string[] {
    if (text.length <= maxLength) {
      return [text];
    }
    
    const parts: string[] = [];
    const sentences = this.splitBySentences(text);
    
    let currentPart = '';
    for (const sentence of sentences) {
      if ((currentPart + sentence).length > maxLength && currentPart.length > 0) {
        parts.push(currentPart.trim());
        currentPart = sentence;
      } else {
        currentPart += (currentPart ? ' ' : '') + sentence;
      }
    }
    
    if (currentPart.trim()) {
      parts.push(currentPart.trim());
    }
    
    return parts;
  }
  
  /**
   * Extract tags from question and answer
   */
  private extractTagsFromQA(question: string, answer: string): string[] {
    const combinedText = question + ' ' + answer;
    const keywords = this.extractKeywords(combinedText);
    
    // Add question-specific tags
    const questionTags: string[] = [];
    
    // Detect question type
    if (question.toLowerCase().startsWith('how')) {
      questionTags.push('how-to');
    } else if (question.toLowerCase().startsWith('what')) {
      questionTags.push('definition');
    } else if (question.toLowerCase().startsWith('why')) {
      questionTags.push('explanation');
    } else if (question.toLowerCase().startsWith('when')) {
      questionTags.push('timing');
    } else if (question.toLowerCase().startsWith('where')) {
      questionTags.push('location');
    }
    
    return [...questionTags, ...keywords.slice(0, 5)];
  }
  
  /**
   * Truncate question for title
   */
  private truncateQuestion(question: string): string {
    if (question.length <= 100) {
      return question;
    }
    
    return question.substring(0, 97) + '...';
  }
  
  /**
   * Fallback chunking when no FAQ structure is detected
   */
  private async fallbackChunking(text: string, options: ChunkingOptions): Promise<TextChunk[]> {
    // Simple sentence-based chunking as fallback
    const sentences = this.splitBySentences(text);
    const chunks: TextChunk[] = [];
    
    let currentChunk = '';
    let currentOffset = 0;
    
    for (const sentence of sentences) {
      const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;
      
      if (potentialChunk.length > options.maxChunkSize! && currentChunk.length > 0) {
        const chunk = this.createTextChunk(
          currentChunk.trim(),
          options.documentId,
          chunks.length,
          0, // Will be updated later
          currentOffset,
          currentOffset + currentChunk.length,
          {
            ...options.metadata,
            contentType: 'text',
            keywords: this.extractKeywords(currentChunk)
          }
        );
        chunks.push(chunk);
        
        currentOffset += currentChunk.length;
        currentChunk = sentence;
      } else {
        currentChunk = potentialChunk;
      }
    }
    
    // Add the last chunk
    if (currentChunk.trim()) {
      const chunk = this.createTextChunk(
        currentChunk.trim(),
        options.documentId,
        chunks.length,
        0,
        currentOffset,
        currentOffset + currentChunk.length,
        {
          ...options.metadata,
          contentType: 'text',
          keywords: this.extractKeywords(currentChunk)
        }
      );
      chunks.push(chunk);
    }
    
    // Update total chunks count
    chunks.forEach(chunk => {
      chunk.totalChunks = chunks.length;
    });
    
    return chunks;
  }
}
