import { createHmac, randomBytes } from 'crypto';
import QRCode from 'qrcode';
import { base32Encode, base32Decode } from './base32';

export interface TOTPConfig {
  secret: string;
  encoding: 'base32' | 'hex';
  step: number;
  window: number;
}

export class TwoFactorAuth {
  private readonly defaultConfig: TOTPConfig = {
    secret: '',
    encoding: 'base32',
    step: 30,
    window: 1,
  };

  constructor(private config: Partial<TOTPConfig> = {}) {
    this.config = { ...this.defaultConfig, ...config };
  }

  async generateSecret(): Promise<string> {
    const secret = randomBytes(20);
    return base32Encode(secret);
  }

  async generateQRCode(user: string, secret: string, issuer = 'Intaj'): Promise<string> {
    const otpauth = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(user)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
    return QRCode.toDataURL(otpauth);
  }

  verifyToken(token: string, secret: string): boolean {
    const window = this.config.window || 1;
    const step = this.config.step || 30;
    const encoding = this.config.encoding || 'base32';

    const epochs = Math.floor(Date.now() / 1000 / step);

    for (let i = -window; i <= window; i++) {
      const valid = this.generateToken(secret, epochs + i, encoding) === token;
      if (valid) return true;
    }

    return false;
  }

  private generateToken(secret: string, epoch: number, encoding: 'base32' | 'hex'): string {
    const key = encoding === 'base32' ? base32Decode(secret) : Buffer.from(secret, 'hex');

    const msg = Buffer.alloc(8);
    msg.writeBigInt64BE(BigInt(epoch));

    const hash = createHmac('sha1', key).update(msg).digest();
    const offset = hash[hash.length - 1] & 0xf;

    const binary =
      ((hash[offset] & 0x7f) << 24) |
      (hash[offset + 1] << 16) |
      (hash[offset + 2] << 8) |
      hash[offset + 3];

    const token = binary % 1000000;
    return token.toString().padStart(6, '0');
  }
}

// Export singleton instance
export const twoFactorAuth = new TwoFactorAuth();

// Enable 2FA for a user (stub, should update DB in real use)
export async function enable2FA(userId: string, token: string): Promise<boolean> {
  // In a real implementation, fetch the secret from DB for userId
  // For now, just verify the token against a test secret
  // TODO: Replace with actual DB logic
  const secret = 'JBSWY3DPEHPK3PXP'; // Replace with actual secret lookup
  const twoFactor = new TwoFactorAuth();
  const valid = twoFactor.verifyToken(token, secret);
  if (!valid) return false;
  // TODO: Update user profile in DB to set two_factor_enabled = true
  return true;
}

// Add setup generation method
export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export async function generateSetup(userId: string, issuer = 'Intaj'): Promise<TwoFactorSetup> {
  const twoFactor = new TwoFactorAuth();
  const secret = await twoFactor.generateSecret();
  const qrCode = await twoFactor.generateQRCode(userId, secret, issuer);
  // Generate 8 backup codes
  const backupCodes = Array.from({ length: 8 }, () =>
    Math.random().toString(36).slice(-8).toUpperCase()
  );
  return { secret, qrCode, backupCodes };
}
