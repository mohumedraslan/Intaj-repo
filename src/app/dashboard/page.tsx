'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDashboardData } from '@/lib/hooks/useDashboardData';
import { supabase } from '@/lib/supabaseClient';
import OnboardingChecklist from '@/components/onboarding/OnboardingChecklist';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

export default function DashboardPage() {
  const pathname = usePathname();
  const { data, loading, error } = useDashboardData();
  const [profile, setProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<any>(null);
  const [onboardingSteps, setOnboardingSteps] = useState({
    created_first_chatbot: false,
    added_data_source: false,
    connected_channel: false,
    has_dismissed: false
  });

  useEffect(() => {
    async function fetchUserProfile() {
      try {
        setLoadingProfile(true);

        // Get the current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError) {
          setProfileError(userError);
          return;
        }

        if (!user) {
          setProfileError(new Error('No user found'));
          return;
        }

        // Fetch the user's profile
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (error) {
          // Handle the error silently - we can still show the dashboard
          setProfileError(error);
        } else if (profile) {
          setProfile(profile);
          setOnboardingSteps(profile.onboarding_steps || {
            created_first_chatbot: false,
            added_data_source: false,
            connected_channel: false,
            has_dismissed: false
          });
        }
      } catch (error) {
        // Set the error state but don't log to console
        setProfileError(error);
      } finally {
        setLoadingProfile(false);
      }
    }

    fetchUserProfile();
  }, []);
}
