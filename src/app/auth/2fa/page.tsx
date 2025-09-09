'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const Input = ({ value, onChange, className = '', ...props }: InputProps) => (
  <input
    {...props}
    value={value}
    onChange={onChange}
    className={`w-full px-4 py-3 border rounded-xl ${className}`}
  />
);

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
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check if user is already authenticated and has completed 2FA
    const checkAuthStatus = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth');
        return;
      }

      // Check if user has 2FA enabled
      const { data, error } = await supabase
        .from('user_2fa_secrets')
        .select('enabled')
        .eq('user_id', session.user.id)
        .single();

      if (error || !data?.enabled) {
        // If 2FA is not enabled, redirect to dashboard
        router.push('/dashboard');
      }
    };

    checkAuthStatus();
  }, [router]);

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError('Session expired. Please log in again.');
        router.push('/auth');
        return;
      }

      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
          enable: false, // Just verify, don't enable
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Verification failed');
      }

      // Successful verification - redirect to intended destination or dashboard
      const redirectTo = searchParams?.get('redirect') || '/dashboard';
      router.push(redirectTo);
    } catch (error) {
      console.error('2FA verification error:', error);
      setError(error instanceof Error ? error.message : 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleVerify();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-gradient-to-br from-blue-50 via-white to-blue-100">
          <CardHeader>
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  ></path>
                </svg>
              </div>
            </div>
            <CardTitle>Two-Factor Authentication</CardTitle>
            <CardDescription>
              Enter the 6-digit verification code from your authenticator app to complete your
              login.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <Input
                id="code"
                type="text"
                placeholder="000000"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyPress={handleKeyPress}
                className="font-mono text-center text-2xl tracking-widest border-2 border-blue-500 rounded-xl bg-white shadow-lg text-blue-900 placeholder-blue-400 focus:border-purple-500 focus:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                maxLength={6}
                autoComplete="one-time-code"
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 text-red-400 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              </div>
            )}

            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Can't access your authenticator app?</p>
              <button
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                onClick={() => {
                  // TODO: Implement backup code functionality
                  alert('Backup code functionality will be implemented in a future update.');
                }}
              >
                Use backup code instead
              </button>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button
              variant="destructive"
              onClick={() => {
                supabase.auth.signOut();
                router.push('/auth');
              }}
              className="px-6 py-2 rounded-lg font-medium border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Sign Out
            </Button>
            <Button
              onClick={handleVerify}
              disabled={loading || code.length !== 6}
              className="px-8 py-2 rounded-lg font-medium bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Verifying...
                </div>
              ) : (
                'Verify & Continue'
              )}
            </Button>
          </CardFooter>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Having trouble? Contact{' '}
            <a
              href="mailto:support@intaj.ai"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              support@intaj.ai
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
