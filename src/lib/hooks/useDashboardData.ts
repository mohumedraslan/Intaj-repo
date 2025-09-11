import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function useDashboardData() {
  const [data, setData] = useState({
    stats: {
      activeBots: 0,
      weeklyBotGrowth: 0,
      conversations: 0,
      conversationGrowth: 0,
      responseTime: 0,
      responseTimeImprovement: 0,
      satisfaction: 0,
      satisfactionGrowth: 0,
    },
    platforms: {
      whatsapp: 0,
      facebook: 0,
      instagram: 0,
      web: 0,
    },
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      setError(null);

      // Fetch chatbots data
      const { data: chatbots, error: botError } = await supabase
        .from('chatbots')
        .select('*');

      if (botError) {
        // Set error state but don't log to console
        setError(botError);
        return;
      }

      // Fetch messages data
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (msgError) {
        // Set error state but don't log to console
        setError(msgError);
        return;
      }

      // Fetch connections data
      const { data: connections, error: connError } = await supabase
        .from('connections')
        .select('*');

      if (connError) {
        // Set error state but don't log to console
        setError(connError);
        return;
      }

      // Calculate platform connection counts
      const platforms = {
        whatsapp: connections?.filter(c => c.platform === 'whatsapp').length || 0,
        facebook: connections?.filter(c => c.platform === 'facebook').length || 0,
        instagram: connections?.filter(c => c.platform === 'instagram').length || 0,
        web: connections?.filter(c => c.platform === 'web').length || 0,
      };

      // Calculate response times
      const responseTimes = messages
        ?.filter(m => m.response_time)
        ?.map(m => m.response_time) || [];
      const avgResponseTime = responseTimes.length
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

      // Generate recent activity from messages, chatbots, and connections
      const recentActivity = [
        ...messages?.slice(0, 5).map(m => ({
          id: `msg-${m.id}`,
          type: 'conversation',
          message: `New message in ${m.chatbot_name || 'a chatbot'}`,
          timestamp: m.created_at,
        })) || [],
        ...connections?.slice(0, 3).map(c => ({
          id: `conn-${c.id}`,
          type: 'connection',
          message: `New ${c.platform} connection added`,
          timestamp: c.created_at,
        })) || [],
        ...chatbots?.slice(0, 3).map(b => ({
          id: `bot-${b.id}`,
          type: 'update',
          message: `Chatbot "${b.name}" was updated`,
          timestamp: b.updated_at,
        })) || [],
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Set data state with stats and activity
      setData({
        stats: {
          activeBots: chatbots?.filter(b => b.status === 'active').length || 0,
          weeklyBotGrowth: 12, // Placeholder - would calculate from historical data
          conversations: messages?.length || 0,
          conversationGrowth: 8, // Placeholder - would calculate from historical data
          responseTime: parseFloat(avgResponseTime.toFixed(2)),
          responseTimeImprovement: -0.15, // Placeholder - would calculate from historical data
          satisfaction: 92, // Placeholder - would calculate from feedback
          satisfactionGrowth: 3, // Placeholder - would calculate from historical data
        },
        platforms,
        recentActivity,
      });
    } catch (err) {
      // Set error state but don't log to console
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboardData();

    // Set up real-time subscription for chatbot changes
    const subscription = supabase
      .channel('public:chatbots')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chatbots' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { data, loading, error };
}