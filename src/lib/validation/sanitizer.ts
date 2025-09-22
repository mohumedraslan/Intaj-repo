/**
 * Input Validation & Sanitization System
 * Provides comprehensive input validation and sanitization for security
 */

import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';
import { z } from 'zod';
import { createLogger } from '../logging/Logger';
import { getMetricsCollector } from '../metrics/MetricsCollector';
import { captureError } from '../monitoring/errorTracking';

const logger = createLogger('InputSanitizer');
const metrics = getMetricsCollector();

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedValue?: any;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface FileValidationResult extends ValidationResult {
  fileInfo?: {
    originalName: string;
    size: number;
    mimeType: string;
    extension: string;
  };
  securityChecks?: {
    hasValidHeader: boolean;
    extensionMatches: boolean;
    noMaliciousContent: boolean;
  };
}

/**
 * Main Input Sanitizer class
 */
export class InputSanitizer {
  private static readonly MAX_STRING_LENGTH = 10000;
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  
  private static readonly ALLOWED_HTML_TAGS = [
    'b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'a', 'span'
  ];
  
  private static readonly ALLOWED_HTML_ATTRIBUTES = {
    'a': ['href', 'title'],
    'span': ['class']
  };

  private static readonly DANGEROUS_PATTERNS = [
    // SQL Injection patterns
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
    /((\%27)|(\')|(\\x27))(((\%6F)|o|(\%4F))((\%72)|r|(\%52)))/gi,
    /((\%27)|(\')|(\\x27))(((\%55)|u|(\%55))((\%4E)|n|(\%4E))((\%49)|i|(\%49))((\%4F)|o|(\%4F))((\%4E)|n|(\%4E)))/gi,
    
    // XSS patterns
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b[^>]*>/gi,
    /<object\b[^>]*>/gi,
    /<embed\b[^>]*>/gi,
    
    // Command injection patterns
    /(\||;|&|\$\(|\`)/g,
    /(wget|curl|nc|netcat|python|perl|ruby|php|bash|sh|cmd|powershell)/gi,
    
    // Path traversal patterns
    /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c)/gi,
    
    // LDAP injection patterns
    /(\(|\)|\*|\||&)/g,
    
    // NoSQL injection patterns
    /(\$where|\$ne|\$gt|\$lt|\$gte|\$lte|\$in|\$nin|\$regex)/gi
  ];

  private static readonly PROMPT_INJECTION_PATTERNS = [
    // Common prompt injection attempts
    /ignore\s+(previous|all)\s+(instructions|prompts|commands)/gi,
    /forget\s+(everything|all|previous)/gi,
    /act\s+as\s+(if\s+you\s+are|a)/gi,
    /pretend\s+(to\s+be|you\s+are)/gi,
    /roleplay\s+as/gi,
    /simulate\s+(being|a)/gi,
    /override\s+(your|the)\s+(instructions|programming|rules)/gi,
    /jailbreak/gi,
    /developer\s+mode/gi,
    /admin\s+mode/gi,
    /god\s+mode/gi,
    /sudo\s+mode/gi,
    /root\s+access/gi,
    /system\s+(prompt|message|instruction)/gi,
    /\[SYSTEM\]/gi,
    /\[ADMIN\]/gi,
    /\[ROOT\]/gi
  ];

  /**
   * Sanitize HTML content
   */
  static sanitizeHTML(input: string, options?: {
    allowedTags?: string[];
    allowedAttributes?: Record<string, string[]>;
    stripTags?: boolean;
  }): string {
    try {
      if (!input || typeof input !== 'string') {
        return '';
      }

      const config = {
        ALLOWED_TAGS: options?.allowedTags || this.ALLOWED_HTML_TAGS,
        ALLOWED_ATTR: options?.allowedAttributes || this.ALLOWED_HTML_ATTRIBUTES,
        KEEP_CONTENT: !options?.stripTags,
        RETURN_DOM: false,
        RETURN_DOM_FRAGMENT: false,
        RETURN_DOM_IMPORT: false
      };

      const sanitized = DOMPurify.sanitize(input, config);
      
      metrics.incrementCounter('input_sanitization_html', {
        originalLength: input.length.toString(),
        sanitizedLength: sanitized.length.toString()
      });

      return sanitized;

    } catch (error) {
      logger.error('HTML sanitization failed', { error, input: input.substring(0, 100) });
      captureError(error as Error, { context: 'html_sanitization' });
      return '';
    }
  }

  /**
   * Sanitize SQL input (additional protection beyond parameterized queries)
   */
  static sanitizeSQL(input: string): string {
    try {
      if (!input || typeof input !== 'string') {
        return '';
      }

      // Remove dangerous SQL characters and keywords
      let sanitized = input
        .replace(/['";\\]/g, '') // Remove quotes and backslashes
        .replace(/--/g, '') // Remove SQL comments
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
        .replace(/\b(EXEC|EXECUTE|SP_|XP_)\b/gi, ''); // Remove stored procedure calls

      // Limit length
      sanitized = sanitized.substring(0, this.MAX_STRING_LENGTH);

      metrics.incrementCounter('input_sanitization_sql');

      return sanitized;

    } catch (error) {
      logger.error('SQL sanitization failed', { error });
      return '';
    }
  }

  /**
   * Validate and sanitize file upload
   */
  static async validateFileUpload(
    file: File,
    options?: {
      allowedTypes?: string[];
      maxSize?: number;
      scanContent?: boolean;
    }
  ): Promise<FileValidationResult> {
    const startTime = Date.now();
    const result: FileValidationResult = {
      isValid: true,
      errors: [],
      riskLevel: 'low',
      fileInfo: {
        originalName: file.name,
        size: file.size,
        mimeType: file.type,
        extension: this.getFileExtension(file.name)
      },
      securityChecks: {
        hasValidHeader: false,
        extensionMatches: false,
        noMaliciousContent: false
      }
    };

    try {
      // Check file size
      const maxSize = options?.maxSize || this.MAX_FILE_SIZE;
      if (file.size > maxSize) {
        result.isValid = false;
        result.errors.push(`File size exceeds limit of ${maxSize} bytes`);
        result.riskLevel = 'medium';
      }

      // Check file type
      const allowedTypes = options?.allowedTypes || [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'text/plain', 'text/csv',
        'application/json', 'application/xml'
      ];

      if (!allowedTypes.includes(file.type)) {
        result.isValid = false;
        result.errors.push(`File type ${file.type} is not allowed`);
        result.riskLevel = 'high';
      }

      // Check file extension matches MIME type
      const extension = this.getFileExtension(file.name);
      const expectedMimeTypes = this.getMimeTypesForExtension(extension);
      
      if (expectedMimeTypes.length > 0 && !expectedMimeTypes.includes(file.type)) {
        result.isValid = false;
        result.errors.push('File extension does not match content type');
        result.riskLevel = 'high';
        result.securityChecks!.extensionMatches = false;
      } else {
        result.securityChecks!.extensionMatches = true;
      }

      // Validate file header (magic bytes)
      if (file.size > 0) {
        const headerValid = await this.validateFileHeader(file);
        result.securityChecks!.hasValidHeader = headerValid;
        
        if (!headerValid) {
          result.isValid = false;
          result.errors.push('File header does not match expected format');
          result.riskLevel = 'high';
        }
      }

      // Scan file content for malicious patterns
      if (options?.scanContent !== false) {
        const contentSafe = await this.scanFileContent(file);
        result.securityChecks!.noMaliciousContent = contentSafe;
        
        if (!contentSafe) {
          result.isValid = false;
          result.errors.push('File contains potentially malicious content');
          result.riskLevel = 'high';
        }
      }

      // Check filename for dangerous patterns
      if (this.hasUnsafeFilename(file.name)) {
        result.isValid = false;
        result.errors.push('Filename contains unsafe characters');
        result.riskLevel = 'medium';
      }

      metrics.incrementCounter('file_validation', {
        valid: result.isValid.toString(),
        fileType: file.type,
        riskLevel: result.riskLevel
      });

      metrics.recordHistogram('file_validation_duration', Date.now() - startTime);

      return result;

    } catch (error) {
      logger.error('File validation failed', { error, fileName: file.name });
      captureError(error as Error, { context: 'file_validation' });
      
      return {
        isValid: false,
        errors: ['File validation failed'],
        riskLevel: 'high'
      };
    }
  }

  /**
   * Sanitize user message for LLM processing
   */
  static sanitizeUserMessage(message: string): ValidationResult {
    try {
      if (!message || typeof message !== 'string') {
        return {
          isValid: false,
          errors: ['Message is required'],
          riskLevel: 'low'
        };
      }

      const result: ValidationResult = {
        isValid: true,
        errors: [],
        riskLevel: 'low'
      };

      // Check message length
      if (message.length > this.MAX_STRING_LENGTH) {
        result.isValid = false;
        result.errors.push(`Message exceeds maximum length of ${this.MAX_STRING_LENGTH} characters`);
        result.riskLevel = 'medium';
      }

      // Check for dangerous patterns
      const dangerousPatterns = this.detectDangerousPatterns(message);
      if (dangerousPatterns.length > 0) {
        result.isValid = false;
        result.errors.push(`Potentially dangerous content detected: ${dangerousPatterns.join(', ')}`);
        result.riskLevel = 'high';
      }

      // Check for prompt injection attempts
      const promptInjection = this.detectPromptInjection(message);
      if (promptInjection.detected) {
        result.isValid = false;
        result.errors.push('Prompt injection attempt detected');
        result.riskLevel = 'high';
        
        logger.warn('Prompt injection detected', {
          message: message.substring(0, 200),
          patterns: promptInjection.patterns
        });
      }

      // Sanitize the message
      let sanitized = message
        .trim()
        .replace(/\r\n/g, '\n') // Normalize line endings
        .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines
        .replace(/\s{2,}/g, ' '); // Normalize whitespace

      // Remove or escape potentially dangerous characters
      sanitized = sanitized
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
        .replace(/[<>]/g, (match) => match === '<' ? '&lt;' : '&gt;'); // Escape HTML brackets

      result.sanitizedValue = sanitized;

      metrics.incrementCounter('message_sanitization', {
        valid: result.isValid.toString(),
        riskLevel: result.riskLevel
      });

      return result;

    } catch (error) {
      logger.error('Message sanitization failed', { error });
      return {
        isValid: false,
        errors: ['Message sanitization failed'],
        riskLevel: 'high'
      };
    }
  }

  /**
   * Validate email address
   */
  static validateEmail(email: string): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      riskLevel: 'low'
    };

    if (!email || typeof email !== 'string') {
      result.isValid = false;
      result.errors.push('Email is required');
      return result;
    }

    // Basic email validation
    if (!validator.isEmail(email)) {
      result.isValid = false;
      result.errors.push('Invalid email format');
      result.riskLevel = 'medium';
    }

    // Check for suspicious patterns
    if (this.hasSuspiciousEmailPattern(email)) {
      result.isValid = false;
      result.errors.push('Email contains suspicious patterns');
      result.riskLevel = 'high';
    }

    // Normalize and sanitize
    result.sanitizedValue = validator.normalizeEmail(email) || email.toLowerCase().trim();

    return result;
  }

  /**
   * Validate URL
   */
  static validateURL(url: string, options?: { allowedProtocols?: string[] }): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      riskLevel: 'low'
    };

    if (!url || typeof url !== 'string') {
      result.isValid = false;
      result.errors.push('URL is required');
      return result;
    }

    const allowedProtocols = options?.allowedProtocols || ['http', 'https'];

    try {
      const urlObj = new URL(url);
      
      // Check protocol
      const protocol = urlObj.protocol.slice(0, -1); // Remove trailing colon
      if (!allowedProtocols.includes(protocol)) {
        result.isValid = false;
        result.errors.push(`Protocol ${protocol} is not allowed`);
        result.riskLevel = 'high';
      }

      // Check for suspicious domains
      if (this.hasSuspiciousDomain(urlObj.hostname)) {
        result.isValid = false;
        result.errors.push('Suspicious domain detected');
        result.riskLevel = 'high';
      }

      // Check for dangerous URL patterns
      if (this.hasDangerousURLPattern(url)) {
        result.isValid = false;
        result.errors.push('URL contains dangerous patterns');
        result.riskLevel = 'high';
      }

      result.sanitizedValue = url;

    } catch (error) {
      result.isValid = false;
      result.errors.push('Invalid URL format');
      result.riskLevel = 'medium';
    }

    return result;
  }

  /**
   * Detect dangerous patterns in input
   */
  private static detectDangerousPatterns(input: string): string[] {
    const detectedPatterns: string[] = [];

    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(input)) {
        detectedPatterns.push(pattern.source);
      }
    }

    return detectedPatterns;
  }

  /**
   * Detect prompt injection attempts
   */
  private static detectPromptInjection(input: string): { detected: boolean; patterns: string[] } {
    const detectedPatterns: string[] = [];

    for (const pattern of this.PROMPT_INJECTION_PATTERNS) {
      if (pattern.test(input)) {
        detectedPatterns.push(pattern.source);
      }
    }

    return {
      detected: detectedPatterns.length > 0,
      patterns: detectedPatterns
    };
  }

  /**
   * Get file extension from filename
   */
  private static getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot > 0 ? filename.substring(lastDot + 1).toLowerCase() : '';
  }

  /**
   * Get expected MIME types for file extension
   */
  private static getMimeTypesForExtension(extension: string): string[] {
    const mimeMap: Record<string, string[]> = {
      'jpg': ['image/jpeg'],
      'jpeg': ['image/jpeg'],
      'png': ['image/png'],
      'gif': ['image/gif'],
      'webp': ['image/webp'],
      'pdf': ['application/pdf'],
      'txt': ['text/plain'],
      'csv': ['text/csv'],
      'json': ['application/json'],
      'xml': ['application/xml', 'text/xml']
    };

    return mimeMap[extension] || [];
  }

  /**
   * Validate file header (magic bytes)
   */
  private static async validateFileHeader(file: File): Promise<boolean> {
    try {
      const buffer = await file.slice(0, 16).arrayBuffer();
      const bytes = new Uint8Array(buffer);
      
      // Check common file signatures
      const signatures: Record<string, number[][]> = {
        'image/jpeg': [[0xFF, 0xD8, 0xFF]],
        'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
        'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
        'application/pdf': [[0x25, 0x50, 0x44, 0x46]]
      };

      const expectedSignatures = signatures[file.type];
      if (!expectedSignatures) {
        return true; // No signature check for this file type
      }

      return expectedSignatures.some(signature =>
        signature.every((byte, index) => bytes[index] === byte)
      );

    } catch (error) {
      logger.debug('File header validation failed', { error });
      return false;
    }
  }

  /**
   * Scan file content for malicious patterns
   */
  private static async scanFileContent(file: File): Promise<boolean> {
    try {
      // Only scan text-based files
      if (!file.type.startsWith('text/') && 
          !file.type.includes('json') && 
          !file.type.includes('xml')) {
        return true; // Skip binary files
      }

      const text = await file.text();
      
      // Check for malicious patterns in text content
      const dangerousPatterns = this.detectDangerousPatterns(text);
      return dangerousPatterns.length === 0;

    } catch (error) {
      logger.debug('File content scan failed', { error });
      return false;
    }
  }

  /**
   * Check for unsafe filename patterns
   */
  private static hasUnsafeFilename(filename: string): boolean {
    const unsafePatterns = [
      /\.\./,  // Path traversal
      /[<>:"|?*]/,  // Windows reserved characters
      /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i,  // Windows reserved names
      /^\./,  // Hidden files
      /\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|app|deb|pkg|dmg)$/i  // Executable extensions
    ];

    return unsafePatterns.some(pattern => pattern.test(filename));
  }

  /**
   * Check for suspicious email patterns
   */
  private static hasSuspiciousEmailPattern(email: string): boolean {
    const suspiciousPatterns = [
      /[<>]/,  // HTML brackets
      /javascript:/i,  // JavaScript protocol
      /\.\./,  // Path traversal
      /@.*@/,  // Multiple @ symbols
    ];

    return suspiciousPatterns.some(pattern => pattern.test(email));
  }

  /**
   * Check for suspicious domains
   */
  private static hasSuspiciousDomain(hostname: string): boolean {
    const suspiciousDomains = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '10.',
      '172.',
      '192.168.'
    ];

    return suspiciousDomains.some(domain => hostname.includes(domain));
  }

  /**
   * Check for dangerous URL patterns
   */
  private static hasDangerousURLPattern(url: string): boolean {
    const dangerousPatterns = [
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /file:/i,
      /ftp:/i
    ];

    return dangerousPatterns.some(pattern => pattern.test(url));
  }
}

/**
 * Zod schema validators for common input types
 */
export const ValidationSchemas = {
  email: z.string().email().max(254),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
           'Password must contain uppercase, lowercase, number, and special character'),
  
  agentName: z.string()
    .min(1, 'Agent name is required')
    .max(100, 'Agent name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Agent name can only contain letters, numbers, spaces, hyphens, and underscores'),
  
  message: z.string()
    .min(1, 'Message is required')
    .max(10000, 'Message must be less than 10,000 characters'),
  
  url: z.string().url().max(2048),
  
  phoneNumber: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
  
  apiKey: z.string()
    .min(32, 'API key must be at least 32 characters')
    .max(128, 'API key must be less than 128 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'API key contains invalid characters'),
  
  uuid: z.string().uuid('Invalid UUID format'),
  
  slug: z.string()
    .min(1, 'Slug is required')
    .max(100, 'Slug must be less than 100 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
};

/**
 * Validation middleware for API routes
 */
export function validateInput<T>(schema: z.ZodSchema<T>) {
  return (input: unknown): { success: true; data: T } | { success: false; errors: string[] } => {
    try {
      const result = schema.safeParse(input);
      
      if (result.success) {
        return { success: true, data: result.data };
      } else {
        const errors = result.error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        );
        
        return { success: false, errors };
      }
    } catch (error) {
      logger.error('Input validation failed', { error });
      return { success: false, errors: ['Validation failed'] };
    }
  };
}
