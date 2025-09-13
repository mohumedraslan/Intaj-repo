import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16', // Use the latest API version
});

// Initialize Supabase client with service role for admin access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing Stripe signature' },
        { status: 400 }
      );
    }

    // Verify the webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle the checkout.session.completed event
 * Update the user's profile with the new subscription information
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  // Extract the user ID from the session metadata
  const userId = session.metadata?.user_id;
  const planId = session.metadata?.plan_id;

  if (!userId || !planId) {
    console.error('Missing user_id or plan_id in session metadata');
    return;
  }

  // Update the user's profile with the new subscription information
  const { error } = await supabase
    .from('profiles')
    .update({
      plan: planId,
      subscription_status: 'active',
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: session.subscription as string,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('Error updating user profile:', error);
  }
}

/**
 * Handle the customer.subscription.updated event
 * Update the user's profile with the updated subscription information
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  // Find the user with this subscription ID
  const { data: profiles, error: fetchError } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .limit(1);

  if (fetchError || !profiles || profiles.length === 0) {
    console.error('Error finding user with subscription ID:', subscription.id);
    return;
  }

  const userId = profiles[0].id;
  const status = subscription.status === 'active' || subscription.status === 'trialing' 
    ? 'active' 
    : subscription.status;

  // Update the user's profile with the updated subscription information
  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('Error updating user subscription status:', error);
  }
}

/**
 * Handle the customer.subscription.deleted event
 * Update the user's profile to reflect the canceled subscription
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // Find the user with this subscription ID
  const { data: profiles, error: fetchError } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .limit(1);

  if (fetchError || !profiles || profiles.length === 0) {
    console.error('Error finding user with subscription ID:', subscription.id);
    return;
  }

  const userId = profiles[0].id;

  // Update the user's profile to reflect the canceled subscription
  const { error } = await supabase
    .from('profiles')
    .update({
      plan: 'free',
      subscription_status: 'canceled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('Error updating user subscription status:', error);
  }
}