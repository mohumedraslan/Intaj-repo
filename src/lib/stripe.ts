import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-08-27.basil', // Current API version
  typescript: true,
});

export const PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    features: ['1,000 messages per month', 'Basic chatbot features', 'Email support'],
    stripeProductId: process.env.STRIPE_FREE_PRODUCT_ID,
    stripePriceId: process.env.STRIPE_FREE_PRICE_ID,
  },
  PRO: {
    name: 'Pro',
    price: 29,
    features: [
      'Unlimited messages',
      'Advanced chatbot features',
      'Priority support',
      'Custom branding',
      'Analytics dashboard',
    ],
    stripeProductId: process.env.STRIPE_PRO_PRODUCT_ID,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
  },
};
