// Encryption utilities for sensitive data like 2FA secrets
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

// Get encryption key from environment variable
function getEncryptionKey(): Buffer {
  const key = process.env.ENC_MASTER_KEY;
  if (!key) {
    throw new Error('ENC_MASTER_KEY environment variable is required');
  }

  // Create a consistent 32-byte key from the master key
  return crypto.createHash('sha256').update(key).digest();
}

export function encrypt(text: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipher(ALGORITHM, key);
    cipher.setAAD(Buffer.from('intaj-2fa', 'utf8'));

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Combine iv + authTag + encrypted data
    const combined = iv.toString('hex') + authTag.toString('hex') + encrypted;
    return combined;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

export function decrypt(encryptedData: string): string {
  try {
    const key = getEncryptionKey();

    // Extract components
    const iv = Buffer.from(encryptedData.slice(0, IV_LENGTH * 2), 'hex');
    const authTag = Buffer.from(
      encryptedData.slice(IV_LENGTH * 2, (IV_LENGTH + TAG_LENGTH) * 2),
      'hex'
    );
    const encrypted = encryptedData.slice((IV_LENGTH + TAG_LENGTH) * 2);

    const decipher = crypto.createDecipher(ALGORITHM, key);
    decipher.setAAD(Buffer.from('intaj-2fa', 'utf8'));
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}
