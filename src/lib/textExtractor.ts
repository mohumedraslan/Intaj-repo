import { StorageService } from './storage';
import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import * as cheerio from 'cheerio';

export class TextExtractor {
  private storageService: StorageService;

  constructor() {
    this.storageService = new StorageService();
  }

  async extractText(filePath: string, fileType: string): Promise<string> {
    const fileUrl = await this.storageService.getFileUrl(filePath);

    switch (fileType) {
      case 'application/pdf':
        return await this.extractFromPdf(fileUrl);
      case 'text/plain':
        return await this.storageService.getFileContent(filePath);
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return await this.extractFromDocx(fileUrl);
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  private async extractFromPdf(fileUrl: string): Promise<string> {
    // Load the PDF document
    const pdf = await pdfjsLib.getDocument(fileUrl).promise;
    let fullText = '';

    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }

    return fullText;
  }

  private async extractFromDocx(fileUrl: string): Promise<string> {
    const response = await fetch(fileUrl);
    const buffer = await response.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return result.value;
  }

  async extractFromImage(fileUrl: string): Promise<string> {
    const worker = await createWorker('eng');
    const { data: { text } } = await worker.recognize(fileUrl);
    await worker.terminate();
    return text;
  }

  // Clean and normalize extracted text
  cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/[^\w\s.,!?-]/g, '') // Remove special characters except punctuation
      .trim();
  }

  // Extract text from a website URL
  async extractFromWebsite(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      const html = await response.text();
      const $ = cheerio.load(html);
      
      // Remove script and style elements
      $('script, style').remove();
      
      // Get text from body
      const text = $('body').text();
      
      // Clean up text (remove excessive whitespace, etc.)
      return text
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, '\n')
        .trim();
    } catch (error) {
      console.error('Error extracting text from URL:', error);
      throw new Error(`Failed to extract text from ${url}: ${error.message}`);
    }
  }

  // Split text into chunks with overlap
  chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
    const chunks: string[] = [];
    let i = 0;
    
    while (i < text.length) {
      // If this is not the first chunk, include overlap
      const start = i === 0 ? 0 : i - overlap;
      const end = Math.min(start + chunkSize, text.length);
      
      chunks.push(text.slice(start, end));
      
      i = end;
    }
    
    return chunks;
  }
}
