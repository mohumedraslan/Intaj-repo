import { encrypt, decrypt } from '../encryption';

/**
 * Utility functions for handling connection credentials encryption/decryption
 * Uses the existing encryption utilities with a specific AAD tag for connections
 */

/**
 * Encrypts connection credentials before storing in database
 * @param credentials Object containing sensitive connection credentials
 * @returns Encrypted string representation of credentials
 */
export function encryptCredentials(credentials: any): string {
  try {
    // Convert credentials object to JSON string
    const credentialsString = JSON.stringify(credentials);
    
    // Encrypt the credentials string
    return encrypt(credentialsString);
  } catch (error) {
    console.error('Failed to encrypt connection credentials:', error);
    throw new Error('Failed to encrypt connection credentials');
  }
}

/**
 * Decrypts connection credentials retrieved from database
 * @param encryptedCredentials Encrypted credentials string from database
 * @returns Decrypted credentials object
 */
export function decryptCredentials(encryptedCredentials: string): any {
  try {
    if (!encryptedCredentials) {
      throw new Error('No credentials provided for decryption');
    }
    
    // Decrypt the credentials string
    const decryptedString = decrypt(encryptedCredentials);
    
    // Parse the JSON string back to an object
    return JSON.parse(decryptedString);
  } catch (error) {
    console.error('Failed to decrypt connection credentials:', error);
    throw new Error('Failed to decrypt connection credentials');
  }
}

/**
 * Masks sensitive credential information for display
 * @param credentials The decrypted credentials object
 * @returns Object with masked sensitive values
 */
export function maskCredentials(credentials: any): any {
  if (!credentials) return {};
  
  const masked = { ...credentials };
  
  // Mask API keys
  if (masked.apiKey) {
    const length = masked.apiKey.length;
    masked.apiKey = `${masked.apiKey.substring(0, 4)}${'*'.repeat(length - 8)}${masked.apiKey.substring(length - 4)}`;
  }
  
  // Mask OAuth tokens
  if (masked.accessToken) {
    masked.accessToken = '********';
  }
  
  if (masked.refreshToken) {
    masked.refreshToken = '********';
  }
  
  return masked;
}