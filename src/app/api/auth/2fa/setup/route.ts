import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { generateSetup } from '@/lib/security/twoFactorAuth';

export async function POST() {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const setup = await generateSetup(user.id);
    return NextResponse.json(setup);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate 2FA setup' }, { status: 500 });
  }
}
