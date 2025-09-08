import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { TwoFactorAuth } from '@/lib/security/twoFactorAuth';

export async function POST(request: Request) {
  try {
  const supabase = createRouteHandlerClient({ cookies: async () => await cookies() });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const twoFactor = new TwoFactorAuth();
    await twoFactor.disable2FA(user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('2FA disable error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
