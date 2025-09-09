// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/storageClient';

// Initialize Stripe with a dummy key during build
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2025-08-27.basil',
});
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_dummy';

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'No signature found' }, { status: 400 });
  }

  const body = await req.arrayBuffer();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(Buffer.from(body), signature, endpointSecret);
  } catch (err) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const user_id = session.metadata?.user_id;
      if (user_id) {
        await supabase.from('profiles').update({ subscription: 'pro' }).eq('id', user_id);
      }
      break;
    }
    // Add more cases as needed
  }

  return NextResponse.json({ received: true });
}
