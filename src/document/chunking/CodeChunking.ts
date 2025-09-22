/**
 * Code Chunking Strategy
 * Specialized chunking for code documents, preserving structure and context
 */

import { ChunkingStrategy, ChunkingOptions } from './ChunkingStrategy';
import { TextChunk } from '../DocumentProcessor';

export interface CodeBlock {
  content: string;
  language?: string;
  type: 'function' | 'class' | 'method' | 'variable' | 'comment' | 'import' | 'block';
  name?: string;
  startLine: number;
  endLine: number;
  startOffset: number;
  endOffset: number;
  indentLevel: number;
}

export class CodeChunking extends ChunkingStrategy {
  /**
   * Chunk code by logical blocks (functions, classes, etc.)
   */
  async chunk(text: string, options: ChunkingOptions = {} as ChunkingOptions): Promise<TextChunk[]> {
    const {
      documentId,
      metadata,
      maxChunkSize = this.defaultMaxChunkSize,
      minChunkSize = this.defaultMinChunkSize,
      preserveFormatting = true
    } = options;
    
    if (!text.trim()) {
      return [];
    }
    
    console.log('Starting code chunking:', {
      textLength: text.length,
      maxChunkSize,
      minChunkSize,
      preserveFormatting
    });
    
    // Detect programming language
    const language = this.detectLanguage(text);
    
    // Extract code blocks based on language
    const codeBlocks = this.extractCodeBlocks(text, language);
    
    if (codeBlocks.length === 0) {
      console.warn('No code blocks found, falling back to line-based chunking');
      return this.fallbackLineChunking(text, options);
    }
    
    // Convert code blocks to chunks
    const chunks: TextChunk[] = [];
    
    for (let i = 0; i < codeBlocks.length; i++) {
      const block = codeBlocks[i];
      let content = block.content;
      
      // Add context from surrounding blocks if needed
      if (block.type === 'method' || block.type === 'function') {
        content = this.addContextToBlock(block, codeBlocks, text);
      }
      
      // Skip if content is too small (unless it's important like imports)
      if (content.length < minChunkSize && !['import', 'variable'].includes(block.type)) {
        continue;
      }
      
      // Split large blocks if they exceed max size
      if (content.length > maxChunkSize) {
        const subChunks = this.splitLargeCodeBlock(block, maxChunkSize, documentId, chunks.length, language);
        chunks.push(...subChunks);
      } else {
        const chunk = this.createTextChunk(
          preserveFormatting ? content : this.cleanChunkContent(content),
          documentId,
          chunks.length,
          codeBlocks.length,
          block.startOffset,
          block.endOffset,
          {
            ...metadata,
            contentType: 'code',
            language,
            section: block.name || `${block.type}_${chunks.length}`,
            keywords: this.extractCodeKeywords(content, language),
            title: this.generateCodeTitle(block)
          }
        );
        
        chunks.push(chunk);
      }
    }
    
    // Group small related chunks (imports, variables, etc.)
    const groupedChunks = this.groupSmallChunks(chunks, maxChunkSize);
    
    // Update total chunks count
    groupedChunks.forEach(chunk => {
      chunk.totalChunks = groupedChunks.length;
    });
    
    console.log('Code chunking completed:', {
      originalLength: text.length,
      codeBlocksFound: codeBlocks.length,
      chunksCreated: groupedChunks.length,
      language,
      averageChunkSize: groupedChunks.reduce((sum, chunk) => sum + chunk.content.length, 0) / groupedChunks.length
    });
    
    return groupedChunks;
  }
  
  /**
   * Detect programming language from code content
   */
  private detectLanguage(text: string): string {
    const patterns = {
      javascript: [/function\s+\w+/, /const\s+\w+\s*=/, /import\s+.*from/, /export\s+(default\s+)?/],
      typescript: [/interface\s+\w+/, /type\s+\w+\s*=/, /export\s+type/, /:\s*\w+(\[\])?/],
      python: [/def\s+\w+\s*\(/, /class\s+\w+/, /import\s+\w+/, /from\s+\w+\s+import/],
      java: [/public\s+class/, /private\s+\w+/, /public\s+static\s+void\s+main/, /import\s+java\./],
      csharp: [/public\s+class/, /using\s+System/, /namespace\s+\w+/, /public\s+static\s+void/],
      cpp: [/#include\s*</, /using\s+namespace/, /int\s+main\s*\(/, /class\s+\w+/],
      go: [/func\s+\w+\s*\(/, /package\s+\w+/, /import\s+\(/, /type\s+\w+\s+struct/],
      rust: [/fn\s+\w+\s*\(/, /use\s+\w+/, /struct\s+\w+/, /impl\s+\w+/],
      php: [/<\?php/, /function\s+\w+\s*\(/, /class\s+\w+/, /namespace\s+\w+/],
      ruby: [/def\s+\w+/, /class\s+\w+/, /require\s+/, /module\s+\w+/],
      swift: [/func\s+\w+\s*\(/, /class\s+\w+/, /import\s+\w+/, /var\s+\w+:/],
      kotlin: [/fun\s+\w+\s*\(/, /class\s+\w+/, /import\s+\w+/, /val\s+\w+:/]
    };
    
    for (const [lang, langPatterns] of Object.entries(patterns)) {
      const matches = langPatterns.filter(pattern => pattern.test(text)).length;
      if (matches >= 2) {
        return lang;
      }
    }
    
    return 'unknown';
  }
  
  /**
   * Extract code blocks from text
   */
  private extractCodeBlocks(text: string, language: string): CodeBlock[] {
    const lines = text.split('\n');
    const blocks: CodeBlock[] = [];
    
    switch (language) {
      case 'javascript':
      case 'typescript':
        return this.extractJSBlocks(lines, text);
      case 'python':
        return this.extractPythonBlocks(lines, text);
      case 'java':
      case 'csharp':
        return this.extractCStyleBlocks(lines, text);
      default:
        return this.extractGenericBlocks(lines, text);
    }
  }
  
  /**
   * Extract JavaScript/TypeScript blocks
   */
  private extractJSBlocks(lines: string[], text: string): CodeBlock[] {
    const blocks: CodeBlock[] = [];
    let currentOffset = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Function declarations
      if (/^(export\s+)?(async\s+)?function\s+(\w+)/.test(trimmed)) {
        const match = trimmed.match(/function\s+(\w+)/);
        const name = match ? match[1] : 'anonymous';
        const block = this.extractBlockFromLine(lines, i, text, currentOffset, 'function', name);
        if (block) blocks.push(block);
      }
      
      // Arrow functions
      else if (/^(export\s+)?const\s+(\w+)\s*=\s*(\([^)]*\)\s*)?=>/.test(trimmed)) {
        const match = trimmed.match(/const\s+(\w+)/);
        const name = match ? match[1] : 'anonymous';
        const block = this.extractBlockFromLine(lines, i, text, currentOffset, 'function', name);
        if (block) blocks.push(block);
      }
      
      // Class declarations
      else if (/^(export\s+)?(abstract\s+)?class\s+(\w+)/.test(trimmed)) {
        const match = trimmed.match(/class\s+(\w+)/);
        const name = match ? match[1] : 'anonymous';
        const block = this.extractBlockFromLine(lines, i, text, currentOffset, 'class', name);
        if (block) blocks.push(block);
      }
      
      // Interface declarations (TypeScript)
      else if (/^(export\s+)?interface\s+(\w+)/.test(trimmed)) {
        const match = trimmed.match(/interface\s+(\w+)/);
        const name = match ? match[1] : 'anonymous';
        const block = this.extractBlockFromLine(lines, i, text, currentOffset, 'class', name);
        if (block) blocks.push(block);
      }
      
      // Import statements
      else if (/^import\s+/.test(trimmed)) {
        const block: CodeBlock = {
          content: line,
          type: 'import',
          startLine: i,
          endLine: i,
          startOffset: currentOffset,
          endOffset: currentOffset + line.length,
          indentLevel: this.getIndentLevel(line)
        };
        blocks.push(block);
      }
      
      currentOffset += line.length + 1; // +1 for newline
    }
    
    return blocks;
  }
  
  /**
   * Extract Python blocks
   */
  private extractPythonBlocks(lines: string[], text: string): CodeBlock[] {
    const blocks: CodeBlock[] = [];
    let currentOffset = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Function definitions
      if (/^def\s+(\w+)/.test(trimmed)) {
        const match = trimmed.match(/def\s+(\w+)/);
        const name = match ? match[1] : 'anonymous';
        const block = this.extractPythonBlock(lines, i, text, currentOffset, 'function', name);
        if (block) blocks.push(block);
      }
      
      // Class definitions
      else if (/^class\s+(\w+)/.test(trimmed)) {
        const match = trimmed.match(/class\s+(\w+)/);
        const name = match ? match[1] : 'anonymous';
        const block = this.extractPythonBlock(lines, i, text, currentOffset, 'class', name);
        if (block) blocks.push(block);
      }
      
      // Import statements
      else if (/^(import\s+|from\s+)/.test(trimmed)) {
        const block: CodeBlock = {
          content: line,
          type: 'import',
          startLine: i,
          endLine: i,
          startOffset: currentOffset,
          endOffset: currentOffset + line.length,
          indentLevel: this.getIndentLevel(line)
        };
        blocks.push(block);
      }
      
      currentOffset += line.length + 1;
    }
    
    return blocks;
  }
  
  /**
   * Extract C-style blocks (Java, C#, etc.)
   */
  private extractCStyleBlocks(lines: string[], text: string): CodeBlock[] {
    const blocks: CodeBlock[] = [];
    let currentOffset = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Method/function declarations
      if (/^(public|private|protected|static).*\s+(\w+)\s*\(/.test(trimmed)) {
        const match = trimmed.match(/\s+(\w+)\s*\(/);
        const name = match ? match[1] : 'anonymous';
        const block = this.extractBlockFromLine(lines, i, text, currentOffset, 'method', name);
        if (block) blocks.push(block);
      }
      
      // Class declarations
      else if (/^(public|private|protected)?\s*(abstract\s+)?class\s+(\w+)/.test(trimmed)) {
        const match = trimmed.match(/class\s+(\w+)/);
        const name = match ? match[1] : 'anonymous';
        const block = this.extractBlockFromLine(lines, i, text, currentOffset, 'class', name);
        if (block) blocks.push(block);
      }
      
      // Import/using statements
      else if (/^(import\s+|using\s+)/.test(trimmed)) {
        const block: CodeBlock = {
          content: line,
          type: 'import',
          startLine: i,
          endLine: i,
          startOffset: currentOffset,
          endOffset: currentOffset + line.length,
          indentLevel: this.getIndentLevel(line)
        };
        blocks.push(block);
      }
      
      currentOffset += line.length + 1;
    }
    
    return blocks;
  }
  
  /**
   * Extract generic code blocks
   */
  private extractGenericBlocks(lines: string[], text: string): CodeBlock[] {
    const blocks: CodeBlock[] = [];
    let currentOffset = 0;
    let currentBlock = '';
    let blockStart = 0;
    let blockStartOffset = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.trim() === '') {
        // Empty line - potential block boundary
        if (currentBlock.trim()) {
          const block: CodeBlock = {
            content: currentBlock.trim(),
            type: 'block',
            startLine: blockStart,
            endLine: i - 1,
            startOffset: blockStartOffset,
            endOffset: currentOffset,
            indentLevel: this.getIndentLevel(lines[blockStart])
          };
          blocks.push(block);
          
          currentBlock = '';
        }
      } else {
        if (!currentBlock) {
          blockStart = i;
          blockStartOffset = currentOffset;
        }
        currentBlock += line + '\n';
      }
      
      currentOffset += line.length + 1;
    }
    
    // Add the last block
    if (currentBlock.trim()) {
      const block: CodeBlock = {
        content: currentBlock.trim(),
        type: 'block',
        startLine: blockStart,
        endLine: lines.length - 1,
        startOffset: blockStartOffset,
        endOffset: currentOffset,
        indentLevel: this.getIndentLevel(lines[blockStart])
      };
      blocks.push(block);
    }
    
    return blocks;
  }
  
  /**
   * Extract block from a starting line (for brace-based languages)
   */
  private extractBlockFromLine(
    lines: string[],
    startLine: number,
    text: string,
    currentOffset: number,
    type: CodeBlock['type'],
    name?: string
  ): CodeBlock | null {
    let braceCount = 0;
    let endLine = startLine;
    let blockContent = '';
    let blockOffset = currentOffset;
    
    // Calculate offset to start line
    for (let i = 0; i < startLine; i++) {
      blockOffset += lines[i].length + 1;
    }
    
    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];
      blockContent += line + '\n';
      
      // Count braces
      for (const char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
      }
      
      endLine = i;
      
      // If we've closed all braces, we're done
      if (braceCount === 0 && i > startLine) {
        break;
      }
    }
    
    return {
      content: blockContent.trim(),
      type,
      name,
      startLine,
      endLine,
      startOffset: blockOffset,
      endOffset: blockOffset + blockContent.length,
      indentLevel: this.getIndentLevel(lines[startLine])
    };
  }
  
  /**
   * Extract Python block (indentation-based)
   */
  private extractPythonBlock(
    lines: string[],
    startLine: number,
    text: string,
    currentOffset: number,
    type: CodeBlock['type'],
    name?: string
  ): CodeBlock | null {
    const startIndent = this.getIndentLevel(lines[startLine]);
    let endLine = startLine;
    let blockContent = '';
    let blockOffset = currentOffset;
    
    // Calculate offset to start line
    for (let i = 0; i < startLine; i++) {
      blockOffset += lines[i].length + 1;
    }
    
    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];
      const lineIndent = this.getIndentLevel(line);
      
      // If we hit a line with same or less indentation (and it's not empty), we're done
      if (i > startLine && line.trim() && lineIndent <= startIndent) {
        break;
      }
      
      blockContent += line + '\n';
      endLine = i;
    }
    
    return {
      content: blockContent.trim(),
      type,
      name,
      startLine,
      endLine,
      startOffset: blockOffset,
      endOffset: blockOffset + blockContent.length,
      indentLevel: startIndent
    };
  }
  
  /**
   * Get indentation level of a line
   */
  private getIndentLevel(line: string): number {
    let indent = 0;
    for (const char of line) {
      if (char === ' ') indent++;
      else if (char === '\t') indent += 4; // Treat tab as 4 spaces
      else break;
    }
    return indent;
  }
  
  /**
   * Add context to a code block
   */
  private addContextToBlock(block: CodeBlock, allBlocks: CodeBlock[], text: string): string {
    let context = block.content;
    
    // Add imports at the beginning
    const imports = allBlocks
      .filter(b => b.type === 'import' && b.startLine < block.startLine)
      .map(b => b.content)
      .join('\n');
    
    if (imports) {
      context = imports + '\n\n' + context;
    }
    
    return context;
  }
  
  /**
   * Split large code blocks
   */
  private splitLargeCodeBlock(
    block: CodeBlock,
    maxChunkSize: number,
    documentId: string,
    startIndex: number,
    language: string
  ): TextChunk[] {
    const chunks: TextChunk[] = [];
    const lines = block.content.split('\n');
    
    let currentChunk = '';
    let chunkStartLine = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const potentialChunk = currentChunk + (currentChunk ? '\n' : '') + line;
      
      if (potentialChunk.length > maxChunkSize && currentChunk.length > 0) {
        // Create chunk from current content
        const chunk = this.createTextChunk(
          currentChunk,
          documentId,
          startIndex + chunks.length,
          0, // Will be updated later
          block.startOffset,
          block.endOffset,
          {
            contentType: 'code',
            language,
            section: `${block.name || block.type}_part_${chunks.length + 1}`,
            keywords: this.extractCodeKeywords(currentChunk, language),
            title: `${this.generateCodeTitle(block)} (Part ${chunks.length + 1})`
          }
        );
        chunks.push(chunk);
        
        currentChunk = line;
        chunkStartLine = i;
      } else {
        currentChunk = potentialChunk;
      }
    }
    
    // Add the last chunk
    if (currentChunk.trim()) {
      const chunk = this.createTextChunk(
        currentChunk,
        documentId,
        startIndex + chunks.length,
        0,
        block.startOffset,
        block.endOffset,
        {
          contentType: 'code',
          language,
          section: `${block.name || block.type}_part_${chunks.length + 1}`,
          keywords: this.extractCodeKeywords(currentChunk, language),
          title: `${this.generateCodeTitle(block)} (Part ${chunks.length + 1})`
        }
      );
      chunks.push(chunk);
    }
    
    return chunks;
  }
  
  /**
   * Group small related chunks together
   */
  private groupSmallChunks(chunks: TextChunk[], maxChunkSize: number): TextChunk[] {
    const grouped: TextChunk[] = [];
    let currentGroup: TextChunk[] = [];
    let currentGroupSize = 0;
    
    for (const chunk of chunks) {
      // If adding this chunk would exceed max size, finalize current group
      if (currentGroupSize + chunk.content.length > maxChunkSize && currentGroup.length > 0) {
        if (currentGroup.length === 1) {
          grouped.push(currentGroup[0]);
        } else {
          grouped.push(this.mergeChunks(currentGroup));
        }
        
        currentGroup = [chunk];
        currentGroupSize = chunk.content.length;
      } else {
        currentGroup.push(chunk);
        currentGroupSize += chunk.content.length;
      }
    }
    
    // Add the last group
    if (currentGroup.length > 0) {
      if (currentGroup.length === 1) {
        grouped.push(currentGroup[0]);
      } else {
        grouped.push(this.mergeChunks(currentGroup));
      }
    }
    
    return grouped;
  }
  
  /**
   * Merge multiple chunks into one
   */
  private mergeChunks(chunks: TextChunk[]): TextChunk {
    const mergedContent = chunks.map(chunk => chunk.content).join('\n\n');
    const firstChunk = chunks[0];
    const lastChunk = chunks[chunks.length - 1];
    
    return {
      ...firstChunk,
      content: mergedContent,
      endOffset: lastChunk.endOffset,
      tokenCount: this.estimateTokenCount(mergedContent),
      metadata: {
        ...firstChunk.metadata,
        title: `Merged: ${chunks.map(c => c.metadata.title || c.metadata.section).join(', ')}`,
        keywords: Array.from(new Set(chunks.flatMap(c => c.metadata.keywords || [])))
      }
    };
  }
  
  /**
   * Extract code-specific keywords
   */
  private extractCodeKeywords(content: string, language: string): string[] {
    const keywords: string[] = [];
    
    // Language-specific keywords
    const languageKeywords = {
      javascript: ['function', 'const', 'let', 'var', 'class', 'import', 'export', 'async', 'await'],
      typescript: ['interface', 'type', 'enum', 'namespace', 'generic', 'extends', 'implements'],
      python: ['def', 'class', 'import', 'from', 'async', 'await', 'lambda', 'yield'],
      java: ['public', 'private', 'protected', 'static', 'final', 'abstract', 'interface'],
      csharp: ['public', 'private', 'protected', 'static', 'readonly', 'virtual', 'override']
    };
    
    const langKeywords = languageKeywords[language as keyof typeof languageKeywords] || [];
    
    for (const keyword of langKeywords) {
      if (content.includes(keyword)) {
        keywords.push(keyword);
      }
    }
    
    // Extract function/class names
    const names = content.match(/(?:function|class|def|interface)\s+(\w+)/g);
    if (names) {
      keywords.push(...names.map(name => name.split(' ')[1]));
    }
    
    return Array.from(new Set(keywords));
  }
  
  /**
   * Generate title for code block
   */
  private generateCodeTitle(block: CodeBlock): string {
    if (block.name) {
      return `${block.type}: ${block.name}`;
    }
    
    return `${block.type} (line ${block.startLine + 1})`;
  }
  
  /**
   * Fallback line-based chunking
   */
  private fallbackLineChunking(text: string, options: ChunkingOptions): TextChunk[] {
    const lines = text.split('\n');
    const chunks: TextChunk[] = [];
    const maxLines = Math.floor(options.maxChunkSize! / 50); // Rough estimate
    
    for (let i = 0; i < lines.length; i += maxLines) {
      const chunkLines = lines.slice(i, i + maxLines);
      const content = chunkLines.join('\n');
      
      if (content.trim()) {
        const chunk = this.createTextChunk(
          content,
          options.documentId,
          chunks.length,
          0,
          0,
          content.length,
          {
            ...options.metadata,
            contentType: 'code',
            section: `lines_${i + 1}_to_${Math.min(i + maxLines, lines.length)}`,
            keywords: this.extractKeywords(content)
          }
        );
        chunks.push(chunk);
      }
    }
    
    // Update total chunks count
    chunks.forEach(chunk => {
      chunk.totalChunks = chunks.length;
    });
    
    return chunks;
  }
}
