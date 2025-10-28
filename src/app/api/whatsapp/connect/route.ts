import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { WhatsAppConnectionManager } from '@/lib/integrations/whatsapp';

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const accessToken = cookies().get('whatsapp_access_token')?.value;

  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { accountId, phoneNumberId, chatbotId } = await request.json();

  if (!accountId || !phoneNumberId || !chatbotId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 });
  }

  const connectionManager = new WhatsAppConnectionManager(
    supabaseUrl,
    supabaseServiceKey
  );

  const { success, error } = await connectionManager.saveConnection(
    user.id,
    chatbotId,
    {
      accessToken,
      phoneNumberId,
      businessAccountId: accountId,
      webhookVerifyToken: 'DUMMY_WEBHOOK_VERIFY_TOKEN', // Generate a random token
    }
  );

  if (success) {
    return NextResponse.json({ message: 'Connection successful' });
  } else {
    return NextResponse.json({ error }, { status: 500 });
  }
}
