import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { WhatsAppIntegration } from '@/lib/integrations/whatsapp';

export async function GET(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) {
    return NextResponse.json({ error: 'Invalid callback request' }, { status: 400 });
  }

  const { success, accessToken, error } = await WhatsAppIntegration.exchangeCodeForAccessToken(
    code,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/whatsapp/callback`
  );

  if (success && accessToken) {
    cookies().set('whatsapp_access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60, // 1 hour
    });
    return NextResponse.redirect(
      `/dashboard/connections/whatsapp/setup?state=${state}`
    );
  } else {
    return NextResponse.redirect(`/dashboard/connections?error=${error}`);
  }
}
