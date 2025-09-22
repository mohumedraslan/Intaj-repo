/**
 * Secrets Management System
 * Provides secure encryption, decryption, and management of sensitive data
 */

import crypto from 'crypto';
import { createLogger } from '../logging/Logger';
import { getMetricsCollector } from '../metrics/MetricsCollector';
import { captureError } from '../monitoring/errorTracking';
import { createClient } from '@supabase/supabase-js';

const logger = createLogger('SecretsManager');
const metrics = getMetricsCollector();

export interface EncryptedData {
  data: string;
  iv: string;
  authTag: string;
  algorithm: string;
  keyVersion: number;
}

export interface SecretRotationResult {
  success: boolean;
  oldKeyId?: string;
  newKeyId: string;
  affectedSystems: string[];
  errors: string[];
}

export interface SecretMetadata {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  rotationSchedule?: string;
  lastRotated?: Date;
  version: number;
  tags: string[];
}

/**
 * Secrets Manager for handling encryption, decryption, and key rotation
 */
export class SecretsManager {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32; // 256 bits
  private static readonly IV_LENGTH = 16; // 128 bits
  private static readonly TAG_LENGTH = 16; // 128 bits
  private static readonly CURRENT_KEY_VERSION = 1;

  private static encryptionKey: Buffer | null = null;
  private static keyVersions: Map<number, Buffer> = new Map();
  private static supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  /**
   * Initialize the secrets manager
   */
  static initialize(): void {
    try {
      const keyString = process.env.ENCRYPTION_KEY;
      if (!keyString) {
        logger.warn('ENCRYPTION_KEY not found, generating temporary key for development');
        if (process.env.NODE_ENV === 'production') {
          throw new Error('ENCRYPTION_KEY is required in production');
        }
        // Generate a temporary key for development
        this.encryptionKey = crypto.randomBytes(this.KEY_LENGTH);
      } else {
        // Derive key from environment variable
        this.encryptionKey = this.deriveKey(keyString);
      }

      // Store current key version
      this.keyVersions.set(this.CURRENT_KEY_VERSION, this.encryptionKey);

      logger.info('Secrets manager initialized', {
        keyVersion: this.CURRENT_KEY_VERSION,
        algorithm: this.ALGORITHM
      });

      metrics.incrementCounter('secrets_manager_initialized');

    } catch (error) {
      logger.error('Failed to initialize secrets manager', { error });
      captureError(error as Error, { context: 'secrets_manager_init' });
      throw error;
    }
  }

  /**
   * Encrypt sensitive data
   */
  static async encryptSensitiveData(
    data: string,
    context?: { userId?: string; purpose?: string }
  ): Promise<string> {
    const startTime = Date.now();

    try {
      if (!this.encryptionKey) {
        this.initialize();
      }

      const iv = crypto.randomBytes(this.IV_LENGTH);
      const cipher = crypto.createCipher(this.ALGORITHM, this.encryptionKey!);
      cipher.setAAD(Buffer.from(JSON.stringify(context || {})));

      let encrypted = cipher.update(data, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      const authTag = cipher.getAuthTag();

      const encryptedData: EncryptedData = {
        data: encrypted,
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        algorithm: this.ALGORITHM,
        keyVersion: this.CURRENT_KEY_VERSION
      };

      const result = Buffer.from(JSON.stringify(encryptedData)).toString('base64');

      metrics.incrementCounter('data_encrypted', {
        purpose: context?.purpose || 'unknown',
        dataLength: data.length.toString()
      });

      metrics.recordHistogram('encryption_duration', Date.now() - startTime);

      logger.debug('Data encrypted successfully', {
        purpose: context?.purpose,
        userId: context?.userId,
        dataLength: data.length
      });

      return result;

    } catch (error) {
      logger.error('Encryption failed', { error, context });
      captureError(error as Error, {
        context: 'data_encryption',
        purpose: context?.purpose
      });
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt sensitive data
   */
  static async decryptSensitiveData(
    encryptedData: string,
    context?: { userId?: string; purpose?: string }
  ): Promise<string> {
    const startTime = Date.now();

    try {
      if (!this.encryptionKey) {
        this.initialize();
      }

      const encryptedBuffer = Buffer.from(encryptedData, 'base64');
      const parsedData: EncryptedData = JSON.parse(encryptedBuffer.toString('utf8'));

      // Get the appropriate key version
      const key = this.keyVersions.get(parsedData.keyVersion);
      if (!key) {
        throw new Error(`Encryption key version ${parsedData.keyVersion} not found`);
      }

      const iv = Buffer.from(parsedData.iv, 'base64');
      const authTag = Buffer.from(parsedData.authTag, 'base64');

      const decipher = crypto.createDecipher(parsedData.algorithm, key);
      decipher.setAAD(Buffer.from(JSON.stringify(context || {})));
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(parsedData.data, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      metrics.incrementCounter('data_decrypted', {
        purpose: context?.purpose || 'unknown',
        keyVersion: parsedData.keyVersion.toString()
      });

      metrics.recordHistogram('decryption_duration', Date.now() - startTime);

      logger.debug('Data decrypted successfully', {
        purpose: context?.purpose,
        userId: context?.userId,
        keyVersion: parsedData.keyVersion
      });

      return decrypted;

    } catch (error) {
      logger.error('Decryption failed', { error, context });
      captureError(error as Error, {
        context: 'data_decryption',
        purpose: context?.purpose
      });
      throw new Error('Decryption failed');
    }
  }

  /**
   * Generate a secure API key
   */
  static generateAPIKey(prefix: string = 'intaj'): string {
    try {
      const randomBytes = crypto.randomBytes(32);
      const timestamp = Date.now().toString(36);
      const random = randomBytes.toString('hex');
      
      const apiKey = `${prefix}_${timestamp}_${random}`;

      metrics.incrementCounter('api_key_generated', {
        prefix
      });

      logger.info('API key generated', {
        prefix,
        keyLength: apiKey.length
      });

      return apiKey;

    } catch (error) {
      logger.error('API key generation failed', { error });
      captureError(error as Error, { context: 'api_key_generation' });
      throw new Error('API key generation failed');
    }
  }

  /**
   * Hash API key for secure storage
   */
  static hashAPIKey(apiKey: string): string {
    try {
      const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
      
      metrics.incrementCounter('api_key_hashed');

      return hash;

    } catch (error) {
      logger.error('API key hashing failed', { error });
      throw new Error('API key hashing failed');
    }
  }

  /**
   * Rotate API key
   */
  static async rotateAPIKey(
    keyId: string,
    userId: string,
    notifyCallback?: (oldKey: string, newKey: string) => Promise<void>
  ): Promise<SecretRotationResult> {
    const startTime = Date.now();

    try {
      // Get existing API key
      const { data: existingKey, error: fetchError } = await this.supabase
        .from('api_keys')
        .select('*')
        .eq('id', keyId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !existingKey) {
        throw new Error('API key not found');
      }

      // Generate new API key
      const newApiKey = this.generateAPIKey();
      const newKeyHash = this.hashAPIKey(newApiKey);

      // Update database with new key
      const { error: updateError } = await this.supabase
        .from('api_keys')
        .update({
          key_hash: newKeyHash,
          last_rotated: new Date().toISOString(),
          version: existingKey.version + 1
        })
        .eq('id', keyId);

      if (updateError) {
        throw updateError;
      }

      // Log rotation event
      await this.logSecretRotation(keyId, 'api_key', userId);

      // Notify systems of key rotation
      const affectedSystems: string[] = [];
      if (notifyCallback) {
        try {
          await notifyCallback(existingKey.key_hash, newApiKey);
          affectedSystems.push('callback_notified');
        } catch (callbackError) {
          logger.warn('Key rotation callback failed', { error: callbackError });
        }
      }

      metrics.incrementCounter('api_key_rotated', {
        userId,
        success: 'true'
      });

      metrics.recordHistogram('api_key_rotation_duration', Date.now() - startTime);

      logger.info('API key rotated successfully', {
        keyId,
        userId,
        oldVersion: existingKey.version,
        newVersion: existingKey.version + 1
      });

      return {
        success: true,
        oldKeyId: existingKey.key_hash,
        newKeyId: newApiKey,
        affectedSystems,
        errors: []
      };

    } catch (error) {
      logger.error('API key rotation failed', { error, keyId, userId });
      captureError(error as Error, {
        context: 'api_key_rotation',
        keyId,
        userId
      });

      metrics.incrementCounter('api_key_rotated', {
        userId,
        success: 'false'
      });

      return {
        success: false,
        newKeyId: '',
        affectedSystems: [],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Schedule automatic key rotation
   */
  static async scheduleKeyRotation(
    keyId: string,
    rotationSchedule: string, // cron format
    userId: string
  ): Promise<void> {
    try {
      // Store rotation schedule in database
      const { error } = await this.supabase
        .from('api_keys')
        .update({
          rotation_schedule: rotationSchedule,
          auto_rotate: true
        })
        .eq('id', keyId)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      logger.info('Key rotation scheduled', {
        keyId,
        userId,
        schedule: rotationSchedule
      });

      metrics.incrementCounter('key_rotation_scheduled');

    } catch (error) {
      logger.error('Failed to schedule key rotation', { error, keyId });
      captureError(error as Error, { context: 'key_rotation_scheduling' });
      throw error;
    }
  }

  /**
   * Validate secret strength
   */
  static validateSecretStrength(secret: string): {
    isStrong: boolean;
    score: number;
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (secret.length >= 32) {
      score += 25;
    } else if (secret.length >= 16) {
      score += 15;
      feedback.push('Consider using a longer secret (32+ characters)');
    } else {
      feedback.push('Secret should be at least 16 characters long');
    }

    // Character variety
    const hasLower = /[a-z]/.test(secret);
    const hasUpper = /[A-Z]/.test(secret);
    const hasNumbers = /\d/.test(secret);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(secret);

    const varietyCount = [hasLower, hasUpper, hasNumbers, hasSpecial].filter(Boolean).length;
    score += varietyCount * 10;

    if (varietyCount < 3) {
      feedback.push('Use a mix of uppercase, lowercase, numbers, and special characters');
    }

    // Entropy check
    const uniqueChars = new Set(secret).size;
    const entropy = uniqueChars / secret.length;
    
    if (entropy > 0.7) {
      score += 20;
    } else if (entropy > 0.5) {
      score += 10;
      feedback.push('Consider using more varied characters');
    } else {
      feedback.push('Secret has low entropy (too many repeated characters)');
    }

    // Pattern check
    const commonPatterns = [
      /(.)\1{3,}/, // Repeated characters
      /123|abc|qwe/i, // Sequential patterns
      /password|secret|key/i // Common words
    ];

    const hasCommonPattern = commonPatterns.some(pattern => pattern.test(secret));
    if (hasCommonPattern) {
      score -= 20;
      feedback.push('Avoid common patterns and dictionary words');
    } else {
      score += 15;
    }

    return {
      isStrong: score >= 70,
      score: Math.max(0, Math.min(100, score)),
      feedback
    };
  }

  /**
   * Encrypt database credentials
   */
  static async encryptDatabaseCredentials(credentials: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  }): Promise<string> {
    try {
      const credentialsString = JSON.stringify(credentials);
      return await this.encryptSensitiveData(credentialsString, {
        purpose: 'database_credentials'
      });
    } catch (error) {
      logger.error('Failed to encrypt database credentials', { error });
      throw error;
    }
  }

  /**
   * Decrypt database credentials
   */
  static async decryptDatabaseCredentials(encryptedCredentials: string): Promise<{
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  }> {
    try {
      const credentialsString = await this.decryptSensitiveData(encryptedCredentials, {
        purpose: 'database_credentials'
      });
      return JSON.parse(credentialsString);
    } catch (error) {
      logger.error('Failed to decrypt database credentials', { error });
      throw error;
    }
  }

  /**
   * Derive encryption key from string
   */
  private static deriveKey(keyString: string): Buffer {
    // Use PBKDF2 to derive a key from the string
    const salt = Buffer.from('intaj-secrets-salt', 'utf8'); // In production, use a random salt
    return crypto.pbkdf2Sync(keyString, salt, 100000, this.KEY_LENGTH, 'sha256');
  }

  /**
   * Log secret rotation event
   */
  private static async logSecretRotation(
    secretId: string,
    secretType: string,
    userId: string
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('audit_logs')
        .insert({
          user_id: userId,
          action: 'secret_rotated',
          resource_type: secretType,
          resource_id: secretId,
          metadata: {
            rotated_at: new Date().toISOString(),
            rotation_type: 'manual'
          }
        });

      if (error) {
        logger.warn('Failed to log secret rotation', { error });
      }
    } catch (error) {
      logger.warn('Failed to log secret rotation', { error });
    }
  }

  /**
   * Get secrets that need rotation
   */
  static async getSecretsNeedingRotation(): Promise<SecretMetadata[]> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await this.supabase
        .from('api_keys')
        .select('*')
        .or(`last_rotated.is.null,last_rotated.lt.${thirtyDaysAgo.toISOString()}`)
        .eq('auto_rotate', true);

      if (error) {
        throw error;
      }

      return (data || []).map(key => ({
        id: key.id,
        name: key.name,
        description: key.description,
        createdAt: new Date(key.created_at),
        updatedAt: new Date(key.updated_at),
        expiresAt: key.expires_at ? new Date(key.expires_at) : undefined,
        rotationSchedule: key.rotation_schedule,
        lastRotated: key.last_rotated ? new Date(key.last_rotated) : undefined,
        version: key.version,
        tags: key.tags || []
      }));

    } catch (error) {
      logger.error('Failed to get secrets needing rotation', { error });
      return [];
    }
  }

  /**
   * Clean up old encryption keys
   */
  static cleanupOldKeys(): void {
    // Keep only the current key and the previous version
    const keysToKeep = [this.CURRENT_KEY_VERSION, this.CURRENT_KEY_VERSION - 1];
    
    for (const [version] of this.keyVersions) {
      if (!keysToKeep.includes(version)) {
        this.keyVersions.delete(version);
        logger.info('Cleaned up old encryption key', { version });
      }
    }
  }
}

// Initialize on module load
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
  try {
    SecretsManager.initialize();
  } catch (error) {
    console.error('Failed to initialize SecretsManager:', error);
  }
}
