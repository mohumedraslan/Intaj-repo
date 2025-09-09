import { createHmac } from 'crypto';
import { base32Decode } from './base32';

export function generateTOTP(secret: string, window = 0): string {
  const counter = Math.floor(Date.now() / 30000) + window;
  return generateHOTP(secret, counter);
}

function generateHOTP(secret: string, counter: number): string {
  // Convert Base32 secret to buffer using our base32 implementation
  const decodedSecret = base32Decode(secret.replace(/\s/g, ''));
  
  const buffer = Buffer.alloc(8);
  for (let i = 0; i < 8; i++) {
    buffer[7 - i] = counter & 0xff;
    counter = counter >> 8;
  }

  const hmac = createHmac('sha1', decodedSecret);
  hmac.update(buffer);
  const hmacResult = hmac.digest();

  const offset = hmacResult[hmacResult.length - 1] & 0xf;
  const code = (hmacResult[offset] & 0x7f) << 24 |
               (hmacResult[offset + 1] & 0xff) << 16 |
               (hmacResult[offset + 2] & 0xff) << 8 |
               (hmacResult[offset + 3] & 0xff);

  return (code % 1000000).toString().padStart(6, '0');
}

// Function to verify a TOTP code
export function verifyTOTP(secret: string, token: string): boolean {
  // Check current window and +/- 1 window to account for time skew
  for (let window = -1; window <= 1; window++) {
    if (generateTOTP(secret, window) === token) {
      return true;
    }
  }
  return false;
}

// Function to test TOTP generation and verification
export function testTOTPFlow(secret: string): {
  currentCode: string;
  isValid: boolean;
} {
  const currentCode = generateTOTP(secret);
  const isValid = verifyTOTP(secret, currentCode);
  
  return {
    currentCode,
    isValid
  };
}
