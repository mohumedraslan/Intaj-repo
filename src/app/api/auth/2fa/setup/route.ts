import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import speakeasy from 'speakeasy';
import { encrypt } from '@/lib/security/credentials';

export async function POST(request: NextRequest) {
  try {
    // Get user from request headers (assuming auth middleware sets this)
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user already has 2FA setup
    const { data: existing } = await supabase
      .from('user_2fa_secrets')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (existing && existing.enabled) {
      return NextResponse.json({ error: '2FA is already enabled' }, { status: 400 });
    }

    // Generate new 2FA secret
    const secret = speakeasy.generateSecret({
      name: `Intaj AI (${user.email})`,
      issuer: 'Intaj AI Platform',
      length: 32
    });

    // Encrypt the secret before storing
    const encryptedSecret = encrypt(secret.base32);

    // Store or update the secret in database
    const { error: dbError } = await supabase
      .from('user_2fa_secrets')
      .upsert({
        user_id: user.id,
        secret: encryptedSecret,
        enabled: false
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({ error: 'Failed to setup 2FA' }, { status: 500 });
    }

    // Return the otpauth_url for QR code generation
    return NextResponse.json({
      otpauth_url: secret.otpauth_url,
      manual_entry_key: secret.base32
    });

  } catch (error) {
    console.error('2FA setup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
