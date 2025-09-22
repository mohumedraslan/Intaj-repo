/**
 * Prompt Template System
 * Manages dynamic prompt generation with variable substitution and validation
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description?: string;
  defaultValue?: any;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    enum?: any[];
  };
}

export interface PromptTemplateMetadata {
  name: string;
  description: string;
  category: string;
  tags: string[];
  version: number;
  author?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class PromptTemplate {
  public readonly metadata: PromptTemplateMetadata;
  public readonly template: string;
  public readonly variables: TemplateVariable[];
  
  constructor(
    name: string,
    template: string,
    variables: TemplateVariable[],
    options: {
      description?: string;
      category?: string;
      tags?: string[];
      version?: number;
      author?: string;
    } = {}
  ) {
    this.metadata = {
      name,
      description: options.description || '',
      category: options.category || 'general',
      tags: options.tags || [],
      version: options.version || 1,
      author: options.author,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.template = template;
    this.variables = variables;
    
    // Validate template on creation
    this.validateTemplate();
  }
  
  /**
   * Render template with provided variables
   */
  render(variables: Record<string, any>): string {
    const validation = this.validate(variables);
    
    if (!validation.isValid) {
      throw new Error(`Template validation failed: ${validation.errors.join(', ')}`);
    }
    
    let rendered = this.template;
    
    // Apply default values for missing optional variables
    const finalVariables = { ...variables };
    for (const variable of this.variables) {
      if (!(variable.name in finalVariables) && variable.defaultValue !== undefined) {
        finalVariables[variable.name] = variable.defaultValue;
      }
    }
    
    // Replace variables in template
    for (const [key, value] of Object.entries(finalVariables)) {
      const placeholder = `{{${key}}}`;
      const stringValue = this.formatValue(value, key);
      rendered = rendered.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), stringValue);
    }
    
    // Check for unreplaced variables
    const unreplacedMatches = rendered.match(/\{\{[^}]+\}\}/g);
    if (unreplacedMatches) {
      console.warn('Unreplaced variables found in template:', unreplacedMatches);
    }
    
    return rendered.trim();
  }
  
  /**
   * Validate provided variables against template requirements
   */
  validate(variables: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check required variables
    for (const variable of this.variables) {
      if (variable.required && !(variable.name in variables)) {
        errors.push(`Required variable '${variable.name}' is missing`);
        continue;
      }
      
      const value = variables[variable.name];
      
      // Skip validation for missing optional variables
      if (value === undefined && !variable.required) {
        continue;
      }
      
      // Type validation
      const typeValidation = this.validateType(value, variable);
      if (!typeValidation.isValid) {
        errors.push(...typeValidation.errors);
      }
      
      // Custom validation rules
      if (variable.validation && value !== undefined) {
        const customValidation = this.validateCustomRules(value, variable);
        errors.push(...customValidation.errors);
        warnings.push(...customValidation.warnings);
      }
    }
    
    // Check for unknown variables
    for (const key of Object.keys(variables)) {
      if (!this.variables.some(v => v.name === key)) {
        warnings.push(`Unknown variable '${key}' provided`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Get template preview with placeholder values
   */
  getPreview(): string {
    const previewVariables: Record<string, any> = {};
    
    for (const variable of this.variables) {
      if (variable.defaultValue !== undefined) {
        previewVariables[variable.name] = variable.defaultValue;
      } else {
        previewVariables[variable.name] = this.getPlaceholderValue(variable);
      }
    }
    
    return this.render(previewVariables);
  }
  
  /**
   * Get template statistics
   */
  getStats(): {
    templateLength: number;
    variableCount: number;
    requiredVariables: number;
    optionalVariables: number;
    estimatedTokens: number;
  } {
    const requiredVariables = this.variables.filter(v => v.required).length;
    const optionalVariables = this.variables.length - requiredVariables;
    
    // Rough token estimation (1 token ≈ 4 characters)
    const estimatedTokens = Math.ceil(this.template.length / 4);
    
    return {
      templateLength: this.template.length,
      variableCount: this.variables.length,
      requiredVariables,
      optionalVariables,
      estimatedTokens
    };
  }
  
  /**
   * Clone template with modifications
   */
  clone(modifications: {
    name?: string;
    template?: string;
    variables?: TemplateVariable[];
    metadata?: Partial<PromptTemplateMetadata>;
  }): PromptTemplate {
    const newTemplate = new PromptTemplate(
      modifications.name || this.metadata.name,
      modifications.template || this.template,
      modifications.variables || this.variables,
      {
        description: modifications.metadata?.description || this.metadata.description,
        category: modifications.metadata?.category || this.metadata.category,
        tags: modifications.metadata?.tags || this.metadata.tags,
        version: (modifications.metadata?.version || this.metadata.version) + 1,
        author: modifications.metadata?.author || this.metadata.author
      }
    );
    
    return newTemplate;
  }
  
  // Private helper methods
  
  private validateTemplate(): void {
    // Check for variable placeholders in template
    const placeholders = this.template.match(/\{\{([^}]+)\}\}/g) || [];
    const placeholderNames = placeholders.map(p => p.slice(2, -2).trim());
    
    // Warn about placeholders without corresponding variables
    for (const placeholder of placeholderNames) {
      if (!this.variables.some(v => v.name === placeholder)) {
        console.warn(`Template contains placeholder '${placeholder}' but no corresponding variable is defined`);
      }
    }
    
    // Warn about variables without placeholders
    for (const variable of this.variables) {
      if (!placeholderNames.includes(variable.name)) {
        console.warn(`Variable '${variable.name}' is defined but not used in template`);
      }
    }
  }
  
  private validateType(value: any, variable: TemplateVariable): ValidationResult {
    const errors: string[] = [];
    
    switch (variable.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`Variable '${variable.name}' must be a string, got ${typeof value}`);
        }
        break;
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push(`Variable '${variable.name}' must be a number, got ${typeof value}`);
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`Variable '${variable.name}' must be a boolean, got ${typeof value}`);
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          errors.push(`Variable '${variable.name}' must be an array, got ${typeof value}`);
        }
        break;
      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          errors.push(`Variable '${variable.name}' must be an object, got ${typeof value}`);
        }
        break;
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }
  
  private validateCustomRules(value: any, variable: TemplateVariable): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const validation = variable.validation!;
    
    if (typeof value === 'string') {
      if (validation.minLength !== undefined && value.length < validation.minLength) {
        errors.push(`Variable '${variable.name}' must be at least ${validation.minLength} characters long`);
      }
      
      if (validation.maxLength !== undefined && value.length > validation.maxLength) {
        errors.push(`Variable '${variable.name}' must be at most ${validation.maxLength} characters long`);
      }
      
      if (validation.pattern && !validation.pattern.test(value)) {
        errors.push(`Variable '${variable.name}' does not match required pattern`);
      }
    }
    
    if (validation.enum && !validation.enum.includes(value)) {
      errors.push(`Variable '${variable.name}' must be one of: ${validation.enum.join(', ')}`);
    }
    
    return { errors, warnings };
  }
  
  private formatValue(value: any, variableName: string): string {
    if (value === null || value === undefined) {
      return '';
    }
    
    if (typeof value === 'string') {
      return value;
    }
    
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    
    if (Array.isArray(value)) {
      return value.map(item => String(item)).join('\n');
    }
    
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2);
      } catch (error) {
        console.warn(`Failed to stringify object for variable '${variableName}':`, error);
        return '[Object]';
      }
    }
    
    return String(value);
  }
  
  private getPlaceholderValue(variable: TemplateVariable): any {
    switch (variable.type) {
      case 'string':
        return `[${variable.name.toUpperCase()}]`;
      case 'number':
        return 0;
      case 'boolean':
        return false;
      case 'array':
        return [`[${variable.name.toUpperCase()}_ITEM]`];
      case 'object':
        return { [`${variable.name}_key`]: `[${variable.name.toUpperCase()}_VALUE]` };
      default:
        return `[${variable.name.toUpperCase()}]`;
    }
  }
}

// Template registry for managing multiple templates
export class PromptTemplateRegistry {
  private static instance: PromptTemplateRegistry;
  private templates: Map<string, PromptTemplate> = new Map();
  
  static getInstance(): PromptTemplateRegistry {
    if (!PromptTemplateRegistry.instance) {
      PromptTemplateRegistry.instance = new PromptTemplateRegistry();
    }
    return PromptTemplateRegistry.instance;
  }
  
  register(template: PromptTemplate): void {
    this.templates.set(template.metadata.name, template);
  }
  
  get(name: string): PromptTemplate | null {
    return this.templates.get(name) || null;
  }
  
  getAll(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }
  
  getByCategory(category: string): PromptTemplate[] {
    return Array.from(this.templates.values())
      .filter(template => template.metadata.category === category);
  }
  
  getByTag(tag: string): PromptTemplate[] {
    return Array.from(this.templates.values())
      .filter(template => template.metadata.tags.includes(tag));
  }
  
  search(query: string): PromptTemplate[] {
    const lowercaseQuery = query.toLowerCase();
    
    return Array.from(this.templates.values())
      .filter(template => 
        template.metadata.name.toLowerCase().includes(lowercaseQuery) ||
        template.metadata.description.toLowerCase().includes(lowercaseQuery) ||
        template.metadata.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
      );
  }
  
  remove(name: string): boolean {
    return this.templates.delete(name);
  }
  
  clear(): void {
    this.templates.clear();
  }
  
  getCategories(): string[] {
    const categories = new Set<string>();
    for (const template of this.templates.values()) {
      categories.add(template.metadata.category);
    }
    return Array.from(categories).sort();
  }
  
  getTags(): string[] {
    const tags = new Set<string>();
    for (const template of this.templates.values()) {
      template.metadata.tags.forEach(tag => tags.add(tag));
    }
    return Array.from(tags).sort();
  }
}

// Export types
export type { TemplateVariable, PromptTemplateMetadata, ValidationResult };
