// Secure credential management service for encrypting and decrypting sensitive data
import crypto from 'crypto';

// Constants for AES-256-GCM encryption
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 16 bytes for AES
const AUTH_TAG_LENGTH = 16; // 16 bytes for GCM auth tag

/**
 * Get the master encryption key from environment variables
 * @returns Buffer containing the 32-byte key derived from the master key
 */
function getMasterKey(): Buffer {
  const masterKey = process.env.ENC_MASTER_KEY;
  if (!masterKey) {
    throw new Error('ENC_MASTER_KEY environment variable is required');
  }
  
  // Create a consistent 32-byte key from the master key using SHA-256
  return crypto.createHash('sha256').update(masterKey).digest();
}

/**
 * Encrypts a string using AES-256-GCM
 * @param text - The plaintext string to encrypt
 * @returns The encrypted string (format: iv + authTag + ciphertext, all hex encoded)
 */
export function encrypt(text: string): string {
  try {
    const key = getMasterKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Use createCipheriv instead of deprecated createCipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Add application context as associated authenticated data
    cipher.setAAD(Buffer.from('intaj-credentials', 'utf8'));
    
    // Encrypt the data
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get the authentication tag
    const authTag = cipher.getAuthTag();
    
    // Combine iv + authTag + encrypted data (all hex encoded)
    return iv.toString('hex') + authTag.toString('hex') + encrypted;
  } catch (error) {
    console.error('Credential encryption error:', error);
    throw new Error('Failed to encrypt credential data');
  }
}

/**
 * Decrypts a string that was encrypted using the encrypt function
 * @param encryptedText - The encrypted string to decrypt
 * @returns The original plaintext string
 */
export function decrypt(encryptedText: string): string {
  try {
    const key = getMasterKey();
    
    // Extract components from the combined string
    const iv = Buffer.from(encryptedText.slice(0, IV_LENGTH * 2), 'hex');
    const authTag = Buffer.from(encryptedText.slice(IV_LENGTH * 2, (IV_LENGTH + AUTH_TAG_LENGTH) * 2), 'hex');
    const encrypted = encryptedText.slice((IV_LENGTH + AUTH_TAG_LENGTH) * 2);
    
    // Use createDecipheriv instead of deprecated createDecipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    // Set the same AAD that was used during encryption
    decipher.setAAD(Buffer.from('intaj-credentials', 'utf8'));
    
    // Set the authentication tag
    decipher.setAuthTag(authTag);
    
    // Decrypt the data
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Credential decryption error:', error);
    throw new Error('Failed to decrypt credential data');
  }
}