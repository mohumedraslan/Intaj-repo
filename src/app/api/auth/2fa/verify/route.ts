import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import speakeasy from 'speakeasy';
import { decrypt } from '@/lib/encryption';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Get user from authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { code, enable = false } = body;

    if (!code || typeof code !== 'string' || code.length !== 6) {
      return NextResponse.json({ error: 'Invalid verification code format' }, { status: 400 });
    }

    // Get user's 2FA secret from database
    const { data: secretData, error: secretError } = await supabase
      .from('user_2fa_secrets')
      .select('secret, enabled')
      .eq('user_id', user.id)
      .single();

    if (secretError || !secretData) {
      return NextResponse.json({ error: '2FA not set up for this user' }, { status: 400 });
    }

    // Decrypt the secret
    let decryptedSecret: string;
    try {
      decryptedSecret = decrypt(secretData.secret);
    } catch (error) {
      console.error('Failed to decrypt 2FA secret:', error);
      return NextResponse.json({ error: 'Failed to verify code' }, { status: 500 });
    }

    // Verify the TOTP code
    const verified = speakeasy.totp.verify({
      secret: decryptedSecret,
      encoding: 'base32',
      token: code,
      window: 2, // Allow 2 time steps of drift
    });

    if (!verified) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
    }

    // If enable flag is true, enable 2FA for the user
    if (enable) {
      const { error: updateError } = await supabase
        .from('user_2fa_secrets')
        .update({ enabled: true })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Failed to enable 2FA:', updateError);
        return NextResponse.json({ error: 'Failed to enable 2FA' }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: enable ? '2FA enabled successfully' : 'Code verified successfully'
    });

  } catch (error) {
    console.error('2FA verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
