import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { generateSetup } from '@/lib/security/twoFactorAuth';

export async function GET(request: Request) {
  try {
  const supabase = createRouteHandlerClient({ cookies: async () => await cookies() });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

  const setup = await generateSetup(user.id);
  return NextResponse.json(setup);
  } catch (error) {
    console.error('2FA setup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
