'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

// Simple card components for the coming soon page
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`glass-card rounded-2xl border border-blue-100 shadow-xl ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="px-8 py-6 border-b border-gray-200">{children}</div>
);

const CardTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-2xl font-bold text-gradient">{children}</h2>
);

const CardDescription = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-2 text-gray-600">{children}</p>
);

const CardContent = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={`px-8 py-6 ${className}`}>{children}</div>;

const CardFooter = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={`px-8 py-6 bg-gray-50 rounded-b-2xl ${className}`}>{children}</div>;

export default function TwoFactorAuthPage() {
  const router = useRouter();

  // For MVP v1, automatically redirect to dashboard after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/dashboard');
    }, 3000); // 3 second delay before redirect

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="w-full max-w-md space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Two-Factor Authentication</CardTitle>
            <CardDescription>This feature is coming soon in a future update.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8">
              <svg
                className="w-16 h-16 text-blue-500 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                ></path>
              </svg>
              <p className="text-center text-gray-600">
                We're working hard to bring you enhanced security features. Two-factor
                authentication will be available in the next update.
              </p>
              <p className="text-center text-gray-500 mt-4">Redirecting to dashboard...</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={() => router.push('/dashboard')}
              className="w-full px-8 py-2 rounded-lg font-medium bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-90"
            >
              Return to Dashboard
            </Button>
          </CardFooter>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Having trouble? Contact{' '}
            <a href="mailto:support@intaj.ai" className="text-blue-600 hover:text-blue-800">
              support@intaj.ai
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
