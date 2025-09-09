import { useRouter } from 'next/navigation';
import { supabase } from '../supabaseClient';
import { type User } from '@supabase/auth-helpers-nextjs';
import { useState, useEffect } from 'react';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);

      if (event === 'SIGNED_IN') {
        router.refresh();
      }
      if (event === 'SIGNED_OUT') {
        router.refresh();
      }
    });

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const signIn = async ({ email, password }: { email: string; password: string }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    // Check if user has 2FA enabled
    if (data.user) {
      const { data: twoFactorData, error: twoFactorError } = await supabase
        .from('user_2fa_secrets')
        .select('enabled')
        .eq('user_id', data.user.id)
        .single();

      if (!twoFactorError && twoFactorData?.enabled) {
        // User has 2FA enabled, redirect to 2FA verification page
        router.push('/auth/2fa');
        return;
      }
    }

    // No 2FA or 2FA not enabled, proceed with normal login flow
    router.push('/dashboard');
  };

  const signUp = async ({
    email,
    password,
    metadata,
  }: {
    email: string;
    password: string;
    metadata?: { [key: string]: any };
  }) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    if (error) throw error;
  };

  const signInWithProvider = async (provider: 'google' | 'facebook') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    router.push('/');
  };

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithProvider,
  };
}
