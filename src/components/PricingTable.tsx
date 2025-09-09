import { PLANS } from '@/lib/stripe';
import { useProfile } from '@/lib/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export function PricingTable() {
  const { profile } = useProfile();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (priceId: string) => {
    try {
      setLoading(priceId);
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const { checkoutUrl } = await response.json();
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong! Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-12">
        {Object.entries(PLANS).map(([key, plan]) => {
          const isCurrentPlan = profile?.subscription?.toLowerCase() === key.toLowerCase();

          return (
            <div
              key={key}
              className="relative rounded-2xl border border-gray-200 p-8 shadow-sm dark:border-gray-800"
            >
              <div className="flex flex-col gap-4">
                <h3 className="text-lg font-semibold leading-8">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight">${plan.price}</span>
                  {plan.price > 0 && (
                    <span className="text-sm font-semibold leading-6">/month</span>
                  )}
                </div>
                <ul className="mt-4 space-y-4">
                  {plan.features.map(feature => (
                    <li key={feature} className="flex gap-3">
                      <svg
                        className="h-6 w-6 flex-none text-green-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => plan.stripePriceId && handleSubscribe(plan.stripePriceId)}
                  disabled={isCurrentPlan || loading === plan.stripePriceId || !plan.stripePriceId}
                  className="mt-6 w-full"
                  variant={isCurrentPlan ? 'outline' : 'default'}
                >
                  {loading === plan.stripePriceId ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Please wait
                    </>
                  ) : isCurrentPlan ? (
                    'Current Plan'
                  ) : plan.price === 0 ? (
                    'Get Started'
                  ) : (
                    'Subscribe'
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
