import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Stripe from 'stripe';

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16', // Use the latest API version
});

// Define the pricing plans
const PLANS = {
  pro: {
    name: 'Pro Plan',
    price: 'price_pro', // Replace with actual Stripe price ID
    description: 'Professional plan with advanced features',
  },
  enterprise: {
    name: 'Enterprise Plan',
    price: 'price_enterprise', // Replace with actual Stripe price ID
    description: 'Enterprise plan with all features and priority support',
  },
};

export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const { planId, returnUrl } = await request.json();
    
    // Validate required fields
    if (!planId || !Object.keys(PLANS).includes(planId)) {
      return NextResponse.json(
        { error: 'Invalid plan ID' },
        { status: 400 }
      );
    }
    
    // Get the authenticated user
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get user profile information
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      );
    }
    
    // Create a Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: PLANS[planId as keyof typeof PLANS].price,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?canceled=true`,
      customer_email: profile.email || user.email,
      metadata: {
        user_id: user.id,
        plan_id: planId,
      },
    });
    
    return NextResponse.json({ sessionId: session.id, url: session.url });
    
  } catch (error) {
    console.error('Stripe checkout session error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}