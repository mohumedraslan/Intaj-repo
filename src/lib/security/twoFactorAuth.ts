import { createHmac, randomBytes } from 'crypto';
import QRCode from 'qrcode';
import { base32Encode, base32Decode } from './base32';
import { createClient } from '../supabaseClient';

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

// Enable 2FA for a user
export async function enable2FA(userId: string, token: string): Promise<boolean> {
  const supabase = createClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('two_factor_secret')
    .eq('id', userId)
    .single();

  if (error || !profile || !profile.two_factor_secret) {
    console.error('Error fetching user profile or secret:', error);
    return false;
  }

  const twoFactor = new TwoFactorAuth();
  const valid = twoFactor.verifyToken(token, profile.two_factor_secret);

  if (valid) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ two_factor_enabled: true })
      .eq('id', userId);
    if (updateError) {
      console.error('Error enabling 2FA:', updateError);
      return false;
    }
    return true;
  }

  return false;
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

  // Store the secret and backup codes in the user's profile
  const supabase = createClient();
  const { error } = await supabase
    .from('profiles')
    .update({
      two_factor_secret: secret,
      two_factor_backup_codes: backupCodes,
    })
    .eq('id', userId);

  if (error) {
    console.error('Error storing 2FA setup:', error);
    throw new Error('Could not save 2FA setup.');
  }

  return { secret, qrCode, backupCodes };
}

// Disable 2FA for a user
export async function disable2FA(userId: string, token: string): Promise<boolean> {
  const supabase = createClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('two_factor_secret')
    .eq('id', userId)
    .single();

  if (error || !profile || !profile.two_factor_secret) {
    console.error('Error fetching user profile or secret:', error);
    return false;
  }

  const twoFactor = new TwoFactorAuth();
  const valid = twoFactor.verifyToken(token, profile.two_factor_secret);

  if (valid) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        two_factor_enabled: false,
        two_factor_secret: null,
        two_factor_backup_codes: null,
      })
      .eq('id', userId);
    if (updateError) {
      console.error('Error disabling 2FA:', updateError);
      return false;
    }
    return true;
  }

  return false;
}
