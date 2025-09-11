'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan');

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-extrabold text-blue-700 mb-6">Checkout</h1>
      <p className="text-gray-700 mb-4">
        You are about to subscribe to the <span className="font-bold capitalize">{plan}</span> plan.
      </p>
      <div className="p-8 border rounded-lg">
        <h2 className="text-xl font-bold mb-4">Stripe Integration Coming Soon</h2>
        <p className="text-gray-600">
          This is a placeholder page for the checkout flow. In a real application, this is where the Stripe payment form would be displayed.
        </p>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  )
}
