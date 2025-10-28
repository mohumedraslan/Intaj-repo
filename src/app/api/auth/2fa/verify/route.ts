import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { enable2FA } from '@/lib/security/twoFactorAuth';

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { code } = await request.json();

  if (!code) {
    return NextResponse.json({ error: 'Verification code is required' }, { status: 400 });
  }

  try {
    const success = await enable2FA(user.id, code);
    if (success) {
      return NextResponse.json({ message: '2FA enabled successfully' });
    } else {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to enable 2FA' }, { status: 500 });
  }
}
