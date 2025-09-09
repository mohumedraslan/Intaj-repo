import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
  metadata: Record<string, any>;
  tokenId: string;
}

export class SessionManager {
  private supabase;
  private readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private readonly TOKEN_ROTATION_INTERVAL = 15 * 60 * 1000; // 15 minutes

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  async createSession(userId: string, metadata: Record<string, any> = {}): Promise<Session> {
    const sessionId = randomBytes(32).toString('hex');
    const tokenId = await this.generateToken();
    const expiresAt = new Date(Date.now() + this.SESSION_DURATION);

    const session: Session = {
      id: sessionId,
      userId,
      expiresAt,
      metadata,
      tokenId,
    };

    // Store session in database
    const { error } = await this.supabase
      .from('sessions')
      .insert([session]);

    if (error) throw new Error('Failed to create session');

    return session;
  }

  async validateSession(sessionId: string, tokenId: string): Promise<Session | null> {
    const { data: session, error } = await this.supabase
      .from('sessions')
      .select()
      .eq('id', sessionId)
      .eq('tokenId', tokenId)
      .single();

    if (error || !session) return null;

    // Check if session is expired
    if (new Date(session.expiresAt) < new Date()) {
      await this.destroySession(sessionId);
      return null;
    }

    // Check if token needs rotation
    const tokenAge = Date.now() - new Date(session.lastTokenRotation).getTime();
    if (tokenAge >= this.TOKEN_ROTATION_INTERVAL) {
      return await this.rotateToken(session);
    }

    return session;
  }

  async rotateToken(session: Session): Promise<Session> {
    const newTokenId = await this.generateToken();

    const { data: updatedSession, error } = await this.supabase
      .from('sessions')
      .update({
        tokenId: newTokenId,
        lastTokenRotation: new Date().toISOString(),
      })
      .eq('id', session.id)
      .select()
      .single();

    if (error || !updatedSession) {
      throw new Error('Failed to rotate token');
    }

    return updatedSession;
  }

  async destroySession(sessionId: string): Promise<void> {
    const { error } = await this.supabase
      .from('sessions')
      .delete()
      .eq('id', sessionId);

    if (error) throw new Error('Failed to destroy session');
  }

  private async generateToken(): Promise<string> {
    return randomBytes(32).toString('hex');
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();
