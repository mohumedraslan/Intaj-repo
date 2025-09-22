/**
 * Configuration Validator
 * Validates environment variables and application configuration
 */

import { createLogger } from '../logging/Logger';
import { getMetricsCollector } from '../metrics/MetricsCollector';
import { captureError } from '../monitoring/errorTracking';

const logger = createLogger('ConfigValidator');
const metrics = getMetricsCollector();

export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingRequired: string[];
  invalidFormat: string[];
}

export class ConfigValidator {
  private static readonly REQUIRED_ENV_VARS = [
    // Core application
    'NODE_ENV',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    
    // Database
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    
    // LLM Providers
    'OPENROUTER_API_KEY',
    
    // Caching
    'REDIS_URL',
    
    // Monitoring (optional in development)
    ...(process.env.NODE_ENV === 'production' ? [
      'SENTRY_DSN',
      'OTEL_EXPORTER_OTLP_ENDPOINT'
    ] : [])
  ];

  private static readonly OPTIONAL_ENV_VARS = [
    // Additional LLM providers
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'GOOGLE_AI_API_KEY',
    
    // Vector database
    'QDRANT_URL',
    'QDRANT_API_KEY',
    
    // File storage
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_REGION',
    'S3_BUCKET_NAME',
    
    // Monitoring
    'SENTRY_DSN',
    'OTEL_SERVICE_NAME',
    'OTEL_EXPORTER_OTLP_ENDPOINT',
    
    // Security
    'ENCRYPTION_KEY',
    'JWT_SECRET',
    
    // Rate limiting
    'RATE_LIMIT_REDIS_URL',
    
    // External integrations
    'TELEGRAM_BOT_TOKEN',
    'WHATSAPP_ACCESS_TOKEN',
    'WHATSAPP_VERIFY_TOKEN',
    'FACEBOOK_APP_SECRET',
    
    // Email
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    
    // Analytics
    'GOOGLE_ANALYTICS_ID',
    'MIXPANEL_TOKEN'
  ];

  private static readonly URL_VARS = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXTAUTH_URL',
    'REDIS_URL',
    'QDRANT_URL',
    'OTEL_EXPORTER_OTLP_ENDPOINT',
    'RATE_LIMIT_REDIS_URL'
  ];

  private static readonly SECRET_VARS = [
    'NEXTAUTH_SECRET',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENROUTER_API_KEY',
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'GOOGLE_AI_API_KEY',
    'QDRANT_API_KEY',
    'AWS_SECRET_ACCESS_KEY',
    'ENCRYPTION_KEY',
    'JWT_SECRET',
    'TELEGRAM_BOT_TOKEN',
    'WHATSAPP_ACCESS_TOKEN',
    'FACEBOOK_APP_SECRET',
    'SENTRY_DSN',
    'SMTP_PASS'
  ];

  private static readonly MIN_SECRET_LENGTH = 32;

  /**
   * Validate all environment variables
   */
  static validateEnvironment(): ConfigValidationResult {
    const startTime = Date.now();
    
    try {
      const result: ConfigValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        missingRequired: [],
        invalidFormat: []
      };

      // Check required variables
      const missing = this.REQUIRED_ENV_VARS.filter(
        varName => !process.env[varName]
      );

      if (missing.length > 0) {
        result.isValid = false;
        result.missingRequired = missing;
        result.errors.push(`Missing required environment variables: ${missing.join(', ')}`);
      }

      // Validate format of existing variables
      this.validateURLFormats(result);
      this.validateSecretStrength(result);
      this.validateSpecificFormats(result);
      this.checkSecurityConfiguration(result);
      this.validateDatabaseConfiguration(result);
      this.validateLLMConfiguration(result);

      // Log validation results
      if (result.isValid) {
        logger.info('Environment validation passed', {
          requiredVars: this.REQUIRED_ENV_VARS.length,
          warnings: result.warnings.length
        });
      } else {
        logger.error('Environment validation failed', {
          errors: result.errors,
          missingRequired: result.missingRequired,
          invalidFormat: result.invalidFormat
        });
      }

      // Track metrics
      metrics.incrementCounter('config_validation', {
        valid: result.isValid.toString(),
        errorCount: result.errors.length.toString()
      });

      metrics.recordHistogram('config_validation_duration', Date.now() - startTime);

      return result;

    } catch (error) {
      logger.error('Configuration validation failed', { error });
      captureError(error as Error, { context: 'config_validation' });
      
      return {
        isValid: false,
        errors: ['Configuration validation failed'],
        warnings: [],
        missingRequired: [],
        invalidFormat: []
      };
    }
  }

  /**
   * Validate URL format for URL environment variables
   */
  private static validateURLFormats(result: ConfigValidationResult): void {
    for (const varName of this.URL_VARS) {
      const value = process.env[varName];
      if (value && !this.isValidURL(value)) {
        result.isValid = false;
        result.invalidFormat.push(varName);
        result.errors.push(`Invalid URL format for ${varName}`);
      }
    }
  }

  /**
   * Validate secret strength
   */
  private static validateSecretStrength(result: ConfigValidationResult): void {
    for (const varName of this.SECRET_VARS) {
      const value = process.env[varName];
      if (value) {
        const validation = this.validateSecretFormat(varName, value);
        if (!validation.isValid) {
          if (validation.severity === 'error') {
            result.isValid = false;
            result.errors.push(validation.message);
          } else {
            result.warnings.push(validation.message);
          }
        }
      }
    }
  }

  /**
   * Validate specific environment variable formats
   */
  private static validateSpecificFormats(result: ConfigValidationResult): void {
    // Validate NODE_ENV
    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv && !['development', 'production', 'test'].includes(nodeEnv)) {
      result.warnings.push(`NODE_ENV should be 'development', 'production', or 'test', got '${nodeEnv}'`);
    }

    // Validate email configuration
    const smtpPort = process.env.SMTP_PORT;
    if (smtpPort && (isNaN(Number(smtpPort)) || Number(smtpPort) < 1 || Number(smtpPort) > 65535)) {
      result.errors.push('SMTP_PORT must be a valid port number (1-65535)');
      result.isValid = false;
    }

    // Validate Redis URL format
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl && !redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
      result.warnings.push('REDIS_URL should start with redis:// or rediss://');
    }

    // Validate JWT secret length
    const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
    if (jwtSecret && jwtSecret.length < 32) {
      result.errors.push('JWT secret should be at least 32 characters long');
      result.isValid = false;
    }
  }

  /**
   * Check security configuration
   */
  private static checkSecurityConfiguration(result: ConfigValidationResult): void {
    // Check if running in production with development settings
    if (process.env.NODE_ENV === 'production') {
      // Check for development URLs
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (supabaseUrl?.includes('localhost') || supabaseUrl?.includes('127.0.0.1')) {
        result.errors.push('Production environment should not use localhost URLs');
        result.isValid = false;
      }

      // Check for weak secrets in production
      const nextAuthSecret = process.env.NEXTAUTH_SECRET;
      if (nextAuthSecret === 'your-secret-here' || nextAuthSecret === 'development-secret') {
        result.errors.push('Production environment should not use default secrets');
        result.isValid = false;
      }

      // Ensure HTTPS URLs in production
      const nextAuthUrl = process.env.NEXTAUTH_URL;
      if (nextAuthUrl && !nextAuthUrl.startsWith('https://')) {
        result.warnings.push('Production NEXTAUTH_URL should use HTTPS');
      }

      // Check for required production variables
      if (!process.env.SENTRY_DSN) {
        result.warnings.push('SENTRY_DSN is recommended for production error tracking');
      }

      if (!process.env.ENCRYPTION_KEY) {
        result.warnings.push('ENCRYPTION_KEY is recommended for production data encryption');
      }
    }

    // Check for insecure development settings in production
    if (process.env.NODE_ENV === 'production') {
      const dangerousVars = [
        'DEBUG',
        'DISABLE_SSL_VERIFY',
        'ALLOW_HTTP',
        'SKIP_AUTH'
      ];

      for (const varName of dangerousVars) {
        if (process.env[varName]) {
          result.errors.push(`${varName} should not be set in production`);
          result.isValid = false;
        }
      }
    }
  }

  /**
   * Validate database configuration
   */
  private static validateDatabaseConfiguration(result: ConfigValidationResult): void {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseAnonKey && supabaseServiceKey) {
      // Check if keys match the URL
      if (!this.validateSupabaseKeyFormat(supabaseAnonKey)) {
        result.warnings.push('SUPABASE_ANON_KEY format appears invalid');
      }

      if (!this.validateSupabaseKeyFormat(supabaseServiceKey)) {
        result.warnings.push('SUPABASE_SERVICE_ROLE_KEY format appears invalid');
      }

      // Check if anon key and service key are different
      if (supabaseAnonKey === supabaseServiceKey) {
        result.errors.push('SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY should be different');
        result.isValid = false;
      }
    }
  }

  /**
   * Validate LLM provider configuration
   */
  private static validateLLMConfiguration(result: ConfigValidationResult): void {
    const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
    const hasGoogle = !!process.env.GOOGLE_AI_API_KEY;

    if (!hasOpenRouter && !hasOpenAI && !hasAnthropic && !hasGoogle) {
      result.errors.push('At least one LLM provider API key is required');
      result.isValid = false;
    }

    // Validate API key formats
    if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('sk-')) {
      result.warnings.push('OPENAI_API_KEY should start with "sk-"');
    }

    if (process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
      result.warnings.push('ANTHROPIC_API_KEY should start with "sk-ant-"');
    }
  }

  /**
   * Validate URL format
   */
  private static isValidURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate secret format and strength
   */
  private static validateSecretFormat(varName: string, value: string): {
    isValid: boolean;
    message: string;
    severity: 'error' | 'warning';
  } {
    // Check minimum length
    if (value.length < this.MIN_SECRET_LENGTH) {
      return {
        isValid: false,
        message: `${varName} should be at least ${this.MIN_SECRET_LENGTH} characters long`,
        severity: 'error'
      };
    }

    // Check for common weak patterns
    const weakPatterns = [
      /^(password|secret|key|token)$/i,
      /^(123|abc|test|demo|sample)/i,
      /^(.)\1{10,}$/, // Repeated characters
      /^(qwerty|abcdef|123456)/i
    ];

    for (const pattern of weakPatterns) {
      if (pattern.test(value)) {
        return {
          isValid: false,
          message: `${varName} appears to use a weak or common pattern`,
          severity: 'warning'
        };
      }
    }

    // Check entropy (basic check)
    const uniqueChars = new Set(value).size;
    if (uniqueChars < value.length * 0.3) {
      return {
        isValid: false,
        message: `${varName} has low entropy (too many repeated characters)`,
        severity: 'warning'
      };
    }

    return {
      isValid: true,
      message: '',
      severity: 'error'
    };
  }

  /**
   * Validate Supabase key format
   */
  private static validateSupabaseKeyFormat(key: string): boolean {
    // Supabase keys are typically JWT tokens
    return key.includes('.') && key.length > 100;
  }

  /**
   * Get configuration summary for debugging
   */
  static getConfigSummary(): Record<string, any> {
    const summary: Record<string, any> = {
      nodeEnv: process.env.NODE_ENV,
      hasDatabase: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      hasRedis: !!process.env.REDIS_URL,
      hasLLMProvider: !!(process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY),
      hasMonitoring: !!process.env.SENTRY_DSN,
      hasTracing: !!process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
      hasEncryption: !!process.env.ENCRYPTION_KEY,
      requiredVarsCount: this.REQUIRED_ENV_VARS.length,
      presentRequiredVars: this.REQUIRED_ENV_VARS.filter(v => !!process.env[v]).length,
      optionalVarsCount: this.OPTIONAL_ENV_VARS.length,
      presentOptionalVars: this.OPTIONAL_ENV_VARS.filter(v => !!process.env[v]).length
    };

    // Add non-sensitive configuration details
    if (process.env.NODE_ENV === 'development') {
      summary.configDetails = {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        nextAuthUrl: process.env.NEXTAUTH_URL,
        redisUrl: process.env.REDIS_URL?.replace(/:[^@]*@/, ':***@'), // Hide password
        hasOpenRouter: !!process.env.OPENROUTER_API_KEY,
        hasOpenAI: !!process.env.OPENAI_API_KEY,
        hasAnthropic: !!process.env.ANTHROPIC_API_KEY
      };
    }

    return summary;
  }

  /**
   * Validate configuration on startup
   */
  static validateOnStartup(): void {
    const result = this.validateEnvironment();
    
    if (!result.isValid) {
      logger.error('❌ Configuration validation failed!', {
        errors: result.errors,
        missingRequired: result.missingRequired
      });
      
      console.error('\n❌ Configuration Validation Failed!\n');
      console.error('Missing required environment variables:');
      result.missingRequired.forEach(varName => {
        console.error(`  - ${varName}`);
      });
      
      if (result.errors.length > 0) {
        console.error('\nConfiguration errors:');
        result.errors.forEach(error => {
          console.error(`  - ${error}`);
        });
      }
      
      console.error('\nPlease check your .env file and ensure all required variables are set.\n');
      
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    } else {
      logger.info('✅ Configuration validation passed');
      
      if (result.warnings.length > 0) {
        logger.warn('Configuration warnings:', { warnings: result.warnings });
        
        if (process.env.NODE_ENV === 'development') {
          console.warn('\n⚠️  Configuration Warnings:');
          result.warnings.forEach(warning => {
            console.warn(`  - ${warning}`);
          });
          console.warn('');
        }
      }
    }
  }
}
