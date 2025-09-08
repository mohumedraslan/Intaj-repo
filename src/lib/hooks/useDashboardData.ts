'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/lib/types';

export interface DashboardStats {
  activeBots: number;
  weeklyBotGrowth: number;
  conversations: number;
  conversationGrowth: number;
  responseTime: number;
  responseTimeImprovement: number;
  satisfaction: number;
  satisfactionGrowth: number;
}

export interface ActivityItem {
  id: string;
  type: 'conversation' | 'connection' | 'update' | 'signup';
  message: string;
  timestamp: string;
}

export interface DashboardData {
  stats: DashboardStats;
  recentActivity: ActivityItem[];
  platforms: {
    whatsapp: number;
    facebook: number;
    instagram: number;
    web: number;
  };
}

export function useDashboardData() {
  const [data, setData] = useState<DashboardData>({
    stats: {
      activeBots: 0,
      weeklyBotGrowth: 0,
      conversations: 0,
      conversationGrowth: 0,
      responseTime: 0,
      responseTimeImprovement: 0,
      satisfaction: 0,
      satisfactionGrowth: 0
    },
    recentActivity: [],
    platforms: {
      whatsapp: 0,
      facebook: 0,
      instagram: 0,
      web: 0,
    },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClientComponentClient<Database>();

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Fetch conversations data
        const { data: conversations, error: convError } = await supabase
          .from('conversations')
          .select('*');

        if (convError) throw convError;

        // Fetch messages data
        const { data: messages, error: msgError } = await supabase
          .from('messages')
          .select('*');

        if (msgError) throw msgError;

        // Calculate platform metrics
        const platformCounts = {
          whatsapp: 0,
          facebook: 0,
          instagram: 0,
          web: 0,
        };

        conversations?.forEach((conv) => {
          if (conv.platform) {
            platformCounts[conv.platform as keyof typeof platformCounts]++;
          }
        });

        // Calculate response times
        const responseTimes = messages?.map(msg => {
          // This is a placeholder calculation. You'll need to implement the actual logic
          // based on your message timestamps
          return 1.5; // Example: 1.5 seconds response time
        }) || [];
        const avgResponseTime = responseTimes.length > 0 
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          : 0;

        // Generate some recent activity
        const recentActivity: ActivityItem[] = conversations
          ?.slice(0, 5)
          .map(conv => ({
            id: conv.id,
            type: 'conversation' as const,
            message: `New conversation started on ${conv.platform}`,
            timestamp: conv.created_at || new Date().toISOString()
          })) || [];

        setData({
          stats: {
            activeBots: conversations?.filter(conv => conv.status === 'active').length || 0,
            weeklyBotGrowth: 5, // Example static value
            conversations: conversations?.length || 0,
            conversationGrowth: 10, // Example static value
            responseTime: avgResponseTime,
            responseTimeImprovement: -0.2, // Example: 0.2s faster than average
            satisfaction: 95, // Example static value
            satisfactionGrowth: 2, // Example static value
          },
          recentActivity,
          platforms: platformCounts,
        });

        setLoading(false);
      } catch (err) {
        setError(err as Error);
        setLoading(false);
      }
    }

    // Initial fetch
    fetchDashboardData();

    // Set up real-time subscription for conversations
    const conversationsSubscription = supabase
      .channel('conversations-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, 
        () => {
          fetchDashboardData(); // Refresh data on any change
        }
      )
      .subscribe();

    // Set up real-time subscription for messages
    const messagesSubscription = supabase
      .channel('messages-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' },
        () => {
          fetchDashboardData(); // Refresh data on any change
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      conversationsSubscription.unsubscribe();
      messagesSubscription.unsubscribe();
    };
  }, [supabase]);

  return { data, loading, error };
}