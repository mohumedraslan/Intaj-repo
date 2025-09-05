// src/app/api/stripe/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(req: NextRequest) {
  const { user_id, price_id, success_url, cancel_url } = await req.json();
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [
      { price: price_id, quantity: 1 },
    ],
    success_url,
    cancel_url,
    metadata: { user_id },
  });
  return NextResponse.json({ url: session.url });
}
