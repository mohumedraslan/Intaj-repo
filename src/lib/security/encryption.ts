import { createCipheriv, createDecipheriv, scryptSync, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable is not set.');
}

// Derive a secure key from the environment variable using a salt
const salt = scryptSync(ENCRYPTION_KEY, 'salt', SALT_LENGTH);
const key = scryptSync(ENCRYPTION_KEY, salt, 32);

/**
 * Encrypts a piece of text.
 * @param text The text to encrypt.
 * @returns The encrypted text, including the IV and auth tag, as a single string.
 */
export function encrypt(text: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Combine IV, encrypted data, and auth tag into a single buffer
  const buffer = Buffer.concat([iv, encrypted, tag]);
  return buffer.toString('hex');
}

/**
 * Decrypts a piece of text.
 * @param encryptedText The encrypted text to decrypt.
 * @returns The original, decrypted text.
 */
export function decrypt(encryptedText: string): string {
  const buffer = Buffer.from(encryptedText, 'hex');

  const iv = buffer.slice(0, IV_LENGTH);
  const encrypted = buffer.slice(IV_LENGTH, buffer.length - TAG_LENGTH);
  const tag = buffer.slice(buffer.length - TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}
