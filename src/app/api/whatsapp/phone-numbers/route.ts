import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { WhatsAppIntegration } from '@/lib/integrations/whatsapp';

export async function GET(request: Request) {
  const accessToken = cookies().get('whatsapp_access_token')?.value;

  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const url = new URL(request.url);
  const accountId = url.searchParams.get('accountId');

  if (!accountId) {
    return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
  }

  const { success, phoneNumbers, error } =
    await WhatsAppIntegration.getPhoneNumbers(accountId, accessToken);

  if (success) {
    return NextResponse.json({ phoneNumbers });
  } else {
    return NextResponse.json({ error }, { status: 500 });
  }
}
