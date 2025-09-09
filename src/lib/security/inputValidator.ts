import { z } from 'zod';
import sanitizeHtml from 'sanitize-html';
import validator from 'validator';

// Base validation schemas
export const commonSchemas = {
  id: z.string().uuid(),
  email: z.string().email(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  url: z.string().url(),
  date: z.string().datetime(),
  positiveNumber: z.number().positive(),
  nonNegativeNumber: z.number().nonnegative(),
};

// Sanitization options
const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: [
    'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'
  ],
  allowedAttributes: {
    'a': ['href', 'target', 'rel']
  },
  allowedIframeHostnames: [],
};

export class InputValidator {
  validateAndSanitize<T>(schema: z.ZodSchema<T>, data: unknown): T {
    const result = schema.parse(data);
    return this.sanitizeObject(result);
  }

  validateEmail(email: string): boolean {
    return validator.isEmail(email);
  }

  validatePhone(phone: string): boolean {
    return validator.isMobilePhone(phone, 'any', { strictMode: true });
  }

  validateURL(url: string): boolean {
    return validator.isURL(url, {
      protocols: ['http', 'https'],
      require_protocol: true,
    });
  }

  sanitizeHTML(html: string): string {
    return sanitizeHtml(html, sanitizeOptions);
  }

  escapeHTML(text: string): string {
    return validator.escape(text);
  }

  private sanitizeObject<T>(obj: T): T {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const result: any = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Sanitize string values
        result[key] = this.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        // Recursively sanitize nested objects
        result[key] = this.sanitizeObject(value);
      } else {
        // Keep non-string values as is
        result[key] = value;
      }
    }

    return result;
  }

  private sanitizeString(value: string): string {
    // Check if the string looks like HTML
    if (/<[a-z][\s\S]*>/i.test(value)) {
      return this.sanitizeHTML(value);
    }
    // Otherwise just escape it
    return this.escapeHTML(value);
  }
}

// Example validation schemas
export const userSchema = z.object({
  id: commonSchemas.id,
  email: commonSchemas.email,
  name: z.string().min(2).max(100),
  phone: commonSchemas.phone.optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const messageSchema = z.object({
  id: commonSchemas.id,
  content: z.string().min(1).max(4000),
  userId: commonSchemas.id,
  chatId: commonSchemas.id,
  metadata: z.record(z.unknown()).optional(),
  timestamp: commonSchemas.date,
});

export const fileSchema = z.object({
  id: commonSchemas.id,
  name: z.string().min(1).max(255),
  type: z.string().min(1).max(100),
  size: commonSchemas.positiveNumber,
  url: commonSchemas.url,
  userId: commonSchemas.id,
  metadata: z.record(z.unknown()).optional(),
  uploadedAt: commonSchemas.date,
});

// Export singleton instance
export const inputValidator = new InputValidator();
