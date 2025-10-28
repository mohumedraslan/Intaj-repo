import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { WhatsAppIntegration } from '@/lib/integrations/whatsapp';

export async function GET() {
  const accessToken = cookies().get('whatsapp_access_token')?.value;

  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { success, accounts, error } =
    await WhatsAppIntegration.getBusinessAccounts(accessToken);

  if (success) {
    return NextResponse.json({ accounts });
  } else {
    return NextResponse.json({ error }, { status: 500 });
  }
}
