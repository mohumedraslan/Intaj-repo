'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/lib/types/database.types';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface DashboardStats {
  totalAgents: number;
  totalConnections: number;
  totalMessages: number;
  totalDataSources: number;
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
  type: 'conversation' | 'connection' | 'update' | 'signup' | 'chatbot_created' | 'connection_created' | 'data_source_added';
  message: string;
  description?: string;
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
      totalAgents: 0,
      totalConnections: 0,
      totalMessages: 0,
      totalDataSources: 0,
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
  const [error, setError] = useState<string | null>(null);
  const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(null);

  const refreshData = useCallback(async () => {
    await fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setLoading(false);
        return;
      }

      // Fetch agents data
      const { data: agents, error: agentsError } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', user.id);

      if (agentsError) {
        console.error('Error fetching agents:', agentsError);
      }

      // Fetch data sources
      const { data: dataSources, error: dataSourcesError } = await supabase
        .from('data_sources')
        .select('*')
        .eq('user_id', user.id);

      if (dataSourcesError) {
        console.error('Error fetching data sources:', dataSourcesError);
      }

      // Fetch messages data
      let messages = [];
      try {
        const { data: messagesData, error: msgError } = await supabase
          .from('messages')
          .select('*')
          .eq('user_id', user.id);

        if (msgError) {
          console.error('Error fetching messages:', msgError);
        } else {
          messages = messagesData || [];
        }
      } catch (err) {
        // Handle the error more gracefully without exposing empty object
        console.error('Exception when fetching messages:', err instanceof Error ? err.message : 'Unknown error');
      }

      // Fetch connections data
      const { data: connections, error: connectionsError } = await supabase
        .from('connections')
        .select('*')
        .eq('user_id', user.id);

      if (connectionsError) {
        console.error('Error fetching connections:', connectionsError);
      }

      // Calculate platform metrics from connections
      const platformCounts = {
        whatsapp: 0,
        facebook: 0,
        instagram: 0,
        web: 0,
      };

      connections?.forEach((conn: any) => {
        const platform = conn.platform?.toLowerCase();
        if (platform === 'whatsapp' || platform === 'whatsapp business') {
          platformCounts.whatsapp++;
        } else if (platform === 'facebook' || platform === 'facebook messenger') {
          platformCounts.facebook++;
        } else if (platform === 'instagram' || platform === 'instagram direct') {
          platformCounts.instagram++;
        } else if (platform === 'website' || platform === 'web') {
          platformCounts.web++;
        }
      });

      // Calculate response times
      const responseTimes = messages?.map((msg: any) => {
        return 1.5; // Example: 1.5 seconds response time
      }) || [];
      const avgResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((a: number, b: number) => a + b, 0) / responseTimes.length
        : 1.5;

      // Generate recent activity from messages and chatbots
      const recentActivity: ActivityItem[] = [];
      
      if (messages && messages.length > 0) {
        const recentMessages = messages.slice(-3);
        recentMessages.forEach((msg: any) => {
          recentActivity.push({
            id: msg.id,
            type: 'conversation' as const,
            message: `New message received`,
            timestamp: msg.created_at || new Date().toISOString()
          });
        });
      }

      if (agents && agents.length > 0) {
        const recentAgents = agents.slice(-2);
        recentAgents.forEach((agent: any) => {
          recentActivity.push({
            id: `agent-${agent.id}`,
            type: 'update' as const,
            message: `Agent "${agent.name}" was created`,
            timestamp: agent.created_at || new Date().toISOString()
          });
        });
      }

      if (connections && connections.length > 0) {
        connections.slice(-1).forEach((conn: any) => {
          recentActivity.push({
            id: `conn-${conn.id}`,
            type: 'connection' as const,
            message: `Connected to ${conn.platform}`,
            timestamp: conn.created_at || new Date().toISOString()
          });
        });
      }

      // Sort by timestamp and take the 5 most recent
      recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const stats: DashboardStats = {
        totalAgents: agents?.length || 0,
        totalConnections: connections?.length || 0,
        totalMessages: messages?.length || 0,
        totalDataSources: dataSources?.length || 0,
        activeBots: agents?.filter((agent: any) => agent.settings?.status === 'active').length || 0,
        weeklyBotGrowth: Math.max(0, (agents?.length || 0) - 2),
        conversations: messages?.length || 0,
        conversationGrowth: Math.round(((messages?.length || 0) / Math.max(1, (messages?.length || 1) - 10)) * 100 - 100),
        responseTime: avgResponseTime,
        responseTimeImprovement: -0.2,
        satisfaction: 95,
        satisfactionGrowth: 2,
      };

      setData({
        stats,
        recentActivity: recentActivity.slice(0, 5),
        platforms: platformCounts,
      });

      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboardData();
    
    // Set up real-time subscriptions
    const agentsChannel = supabase
      .channel('agents-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'agents' },
        () => {
          console.log('Agent change detected, refreshing dashboard...');
          refreshData();
        }
      )
      .subscribe();

    const messagesChannel = supabase
      .channel('messages-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' },
        () => {
          console.log('Message change detected, refreshing dashboard...');
          refreshData();
        }
      )
      .subscribe();

    const connectionsChannel = supabase
      .channel('connections-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connections' },
        () => {
          console.log('Connection change detected, refreshing dashboard...');
          refreshData();
        }
      )
      .subscribe();

    setRealtimeChannel(agentsChannel);

    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(agentsChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(connectionsChannel);
    };
  }, []);

  return {
    stats: data.stats,
    recentActivity: data.recentActivity,
    platformCounts: data.platforms,
    loading,
    error,
    refreshData,
    isRealTimeConnected: realtimeChannel?.state === 'joined'
  };
}