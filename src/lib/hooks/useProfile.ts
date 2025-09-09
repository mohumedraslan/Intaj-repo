import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './useAuth';

interface Profile {
  id: string;
  name: string;
  email: string;
  subscription: 'free' | 'pro' | 'business';
  created_at: string;
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    async function loadProfile() {
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setProfile(data);
      } catch (error) {
        console.error('Error loading profile:', error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }

    void loadProfile();
  }, [user]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error('No user logged in');

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    setProfile(data);
    return data;
  };

  const updateSubscription = async (subscription: Profile['subscription']) => {
    return await updateProfile({ subscription });
  };

  return {
    profile,
    loading,
    updateProfile,
    updateSubscription,
  };
}
