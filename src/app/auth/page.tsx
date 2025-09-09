'use client';

import { useState, useId, useEffect } from 'react';
import '@/styles/auth.css';
import { useAuth } from '@/lib/hooks/useAuth';

export default function AuthPage() {
  const formId = useId();
  const [isSignIn, setIsSignIn] = useState(true);
  const [saveMessage, setSaveMessage] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const { signIn, signUp, signInWithProvider } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;

      await signIn({ email, password });
      setSaveMessage('Successfully signed in!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;
      const firstName = formData.get('firstName') as string;
      const lastName = formData.get('lastName') as string;
      const company = formData.get('company') as string;

      await signUp({
        email,
        password,
        metadata: {
          firstName,
          lastName,
          company,
          subscription: 'free', // Default subscription
        },
      });
      setSaveMessage('Check your email to confirm your account!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = async (provider: 'google' | 'facebook') => {
    setError(null);
    setLoading(true);

    try {
      await signInWithProvider(provider);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to authenticate');
      setLoading(false);
    }
  };

  // Handle password visibility in useEffect to avoid hydration issues
  useEffect(() => {
    const input = document.getElementById(`password-${formId}`) as HTMLInputElement;
    if (input) {
      input.type = isPasswordVisible ? 'text' : 'password';
    }
  }, [isPasswordVisible, formId]);

  return (
    <div className="min-h-screen neural-grid pt-24 pb-12">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-float delay-2000"></div>
      </div>

      {/* Success Message */}
      {saveMessage && (
        <div
          role="alert"
          aria-live="polite"
          className="fixed top-20 right-6 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-slide-up"
        >
          {saveMessage}
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 relative z-10">
        {/* Logo & Header */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <div className="w-5 h-5 bg-white rounded-sm opacity-90"></div>
            </div>
            <span className="text-3xl font-bold text-gradient">Intaj</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">
            {isSignIn ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-gray-400">
            {isSignIn
              ? 'Sign in to your AI automation dashboard'
              : 'Start your AI automation journey today'}
          </p>
        </div>

        {/* Auth Form */}
        <div className="glass-card p-8 rounded-2xl animate-slide-up max-w-md mx-auto">
          <form onSubmit={isSignIn ? handleSignIn : handleSignUp} className="space-y-6">
            {!isSignIn && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="firstName"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    First Name
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    required
                    className="input-field w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none"
                    placeholder="Enter your first name"
                  />
                </div>
                <div>
                  <label
                    htmlFor="lastName"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    required
                    className="input-field w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none"
                    placeholder="Enter your last name"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                suppressHydrationWarning
                type="email"
                id={`email-${formId}`}
                name="email"
                required
                className="input-field w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label
                htmlFor={`password-${formId}`}
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  suppressHydrationWarning
                  type="password"
                  id={`password-${formId}`}
                  name="password"
                  required
                  className="input-field w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none pr-12"
                  placeholder={isSignIn ? 'Enter your password' : 'Create a strong password'}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                  aria-label={`${isPasswordVisible ? 'Hide' : 'Show'} password`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    ></path>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    ></path>
                  </svg>
                </button>
              </div>
              {!isSignIn && (
                <div className="mt-2 text-xs text-gray-400">
                  Must be at least 8 characters with letters and numbers
                </div>
              )}
            </div>

            {!isSignIn && (
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-300 mb-2">
                  Company <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  className="input-field w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none"
                  placeholder="Your company name"
                />
              </div>
            )}

            {isSignIn ? (
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    suppressHydrationWarning
                    type="checkbox"
                    id={`remember-${formId}`}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    aria-label="Remember me"
                  />
                  <span className="ml-2 text-sm text-gray-300">Remember me</span>
                </label>
                <a href="#" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                  Forgot password?
                </a>
              </div>
            ) : (
              <div className="flex items-start">
                <input
                  suppressHydrationWarning
                  type="checkbox"
                  id={`terms-${formId}`}
                  required
                  className="w-4 h-4 mt-1 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="terms" className="ml-3 text-sm text-gray-300">
                  I agree to the{' '}
                  <a href="#" className="text-blue-400 hover:text-blue-300">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-blue-400 hover:text-blue-300">
                    Privacy Policy
                  </a>
                </label>
              </div>
            )}

            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-100/10 rounded-lg">{error}</div>
            )}
            <button
              type="submit"
              disabled={loading}
              className={`w-full gradient-neural py-3 rounded-lg font-semibold text-white transition-all duration-300 transform shadow-lg ${
                loading
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:opacity-90 hover:-translate-y-1 animate-glow'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {isSignIn ? 'Signing In...' : 'Creating Account...'}
                </span>
              ) : isSignIn ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-bg-tertiary text-gray-400">
                  Or {isSignIn ? 'continue' : 'sign up'} with
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                className="social-button w-full flex items-center justify-center px-4 py-3 rounded-lg font-medium text-white"
                onClick={() => handleSocialAuth('google')}
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path
                    fill="#4285f4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34a853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#fbbc05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#ea4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {isSignIn ? 'Continue with Google' : 'Sign up with Google'}
              </button>

              <button
                type="button"
                className="social-button w-full flex items-center justify-center px-4 py-3 rounded-lg font-medium text-white"
                onClick={() => handleSocialAuth('facebook')}
              >
                <svg className="w-5 h-5 mr-3" fill="#1877f2" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                {isSignIn ? 'Continue with Facebook' : 'Sign up with Facebook'}
              </button>
            </div>

            <p className="text-center text-sm text-gray-400 mt-6">
              {isSignIn ? "Don't have an account?" : 'Already have an account?'}
              <button
                type="button"
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors ml-1"
                onClick={() => setIsSignIn(!isSignIn)}
              >
                {isSignIn ? 'Create one now' : 'Sign in here'}
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
