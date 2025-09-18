'use client';

import React, { useState, useEffect } from 'react';

interface AnalyticsDashboardProps {
  agentId?: string | null;
}
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Clock, 
  Target,
  Zap,
  Globe,
  Calendar,
  Download,
  Filter
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface AnalyticsData {
  overview: {
    totalConversations: number;
    totalUsers: number;
    avgResponseTime: number;
    satisfactionRate: number;
    conversationGrowth: number;
    userGrowth: number;
    responseTimeChange: number;
    satisfactionChange: number;
  };
  channelPerformance: Array<{
    channel: string;
    conversations: number;
    users: number;
    avgResponseTime: number;
    satisfaction: number;
  }>;
  agentPerformance: Array<{
    id: string;
    name: string;
    conversations: number;
    avgResponseTime: number;
    satisfaction: number;
    automationRate: number;
  }>;
  timeSeriesData: Array<{
    date: string;
    conversations: number;
    users: number;
    responseTime: number;
  }>;
  topKeywords: Array<{
    keyword: string;
    count: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  businessMetrics: {
    conversionRate: number;
    avgSessionDuration: number;
    bounceRate: number;
    customerLifetimeValue: number;
  };
}

export default function AnalyticsDashboard({ agentId }: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [agents, setAgents] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    fetchAnalyticsData();
    fetchAgents();
    
    // Set selected agent if agentId is provided
    if (agentId && agentId !== selectedAgent) {
      setSelectedAgent(agentId);
    }
  }, [timeRange, selectedAgent, agentId]);

  const fetchAgents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: agentsData } = await supabase
        .from('agents')
        .select('id, name')
        .eq('user_id', user.id);

      setAgents(agentsData || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      startDate.setDate(endDate.getDate() - days);

      // Fetch messages and conversations
      let query = supabase
        .from('messages')
        .select(`
          *,
          agents!inner(id, name, user_id)
        `)
        .eq('agents.user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (selectedAgent !== 'all') {
        query = query.eq('chatbot_id', selectedAgent);
      }

      const { data: messages } = await query;

      // Fetch Telegram analytics
      const { data: telegramData } = await supabase
        .from('telegram_analytics')
        .select('*')
        .eq('user_id', user.id)
        .gte('message_date', startDate.toISOString().split('T')[0])
        .lte('message_date', endDate.toISOString().split('T')[0]);

      // Process data into analytics format
      const processedData = processAnalyticsData(messages || [], telegramData || [], agents);
      setData(processedData);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const processAnalyticsData = (messages: any[], telegramData: any[], agents: any[]): AnalyticsData => {
    // Calculate overview metrics
    const totalConversations = messages.length + telegramData.reduce((sum, t) => sum + t.total_messages, 0);
    const totalUsers = new Set([
      ...messages.map(m => m.user_id),
      ...telegramData.flatMap(t => Array(t.unique_users).fill(0).map((_, i) => `telegram_${t.agent_id}_${i}`))
    ]).size;

    const avgResponseTime = 1.2; // Simulated - you'd calculate this from actual response times
    const satisfactionRate = 94; // Simulated - from user feedback

    // Channel performance
    const channelPerformance = [
      {
        channel: 'Telegram',
        conversations: telegramData.reduce((sum, t) => sum + t.total_messages, 0),
        users: telegramData.reduce((sum, t) => sum + t.unique_users, 0),
        avgResponseTime: 0.8,
        satisfaction: 96
      },
      {
        channel: 'Website Widget',
        conversations: messages.length,
        users: new Set(messages.map(m => m.user_id)).size,
        avgResponseTime: 1.5,
        satisfaction: 92
      },
      {
        channel: 'WhatsApp',
        conversations: 0,
        users: 0,
        avgResponseTime: 0,
        satisfaction: 0
      }
    ];

    // Agent performance
    const agentPerformance = agents.map(agent => {
      const agentMessages = messages.filter(m => m.chatbot_id === agent.id);
      const agentTelegram = telegramData.filter(t => t.agent_id === agent.id);
      
      return {
        id: agent.id,
        name: agent.name,
        conversations: agentMessages.length + agentTelegram.reduce((sum, t) => sum + t.total_messages, 0),
        avgResponseTime: Math.random() * 2 + 0.5, // Simulated
        satisfaction: Math.floor(Math.random() * 10 + 90), // Simulated
        automationRate: Math.floor(Math.random() * 30 + 70) // Simulated
      };
    });

    // Time series data (last 7 days)
    const timeSeriesData = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      
      return {
        date: date.toISOString().split('T')[0],
        conversations: Math.floor(Math.random() * 50 + 10),
        users: Math.floor(Math.random() * 30 + 5),
        responseTime: Math.random() * 1 + 0.5
      };
    });

    // Top keywords (simulated)
    const topKeywords = [
      { keyword: 'help', count: 45, trend: 'up' as const },
      { keyword: 'support', count: 32, trend: 'stable' as const },
      { keyword: 'pricing', count: 28, trend: 'up' as const },
      { keyword: 'features', count: 21, trend: 'down' as const },
      { keyword: 'demo', count: 18, trend: 'up' as const }
    ];

    return {
      overview: {
        totalConversations,
        totalUsers,
        avgResponseTime,
        satisfactionRate,
        conversationGrowth: 15,
        userGrowth: 23,
        responseTimeChange: -8,
        satisfactionChange: 3
      },
      channelPerformance,
      agentPerformance,
      timeSeriesData,
      topKeywords,
      businessMetrics: {
        conversionRate: 12.5,
        avgSessionDuration: 4.2,
        bounceRate: 28,
        customerLifetimeValue: 450
      }
    };
  };

  const exportData = () => {
    if (!data) return;
    
    const csvContent = [
      ['Metric', 'Value'],
      ['Total Conversations', data.overview.totalConversations],
      ['Total Users', data.overview.totalUsers],
      ['Avg Response Time', `${data.overview.avgResponseTime}s`],
      ['Satisfaction Rate', `${data.overview.satisfactionRate}%`],
      ['Conversion Rate', `${data.businessMetrics.conversionRate}%`]
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
          <p className="text-gray-400 mt-1">Track your agent performance and business metrics</p>
        </div>
        <div className="flex gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32 bg-gray-800 border-gray-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedAgent} onValueChange={setSelectedAgent}>
            <SelectTrigger className="w-40 bg-gray-800 border-gray-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents</SelectItem>
              {agents.map(agent => (
                <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={exportData} className="bg-blue-600 hover:bg-blue-700">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Conversations</p>
                <p className="text-2xl font-bold text-white">{data.overview.totalConversations.toLocaleString()}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-3 w-3 text-green-400 mr-1" />
                  <span className="text-green-400 text-xs">+{data.overview.conversationGrowth}%</span>
                </div>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Users</p>
                <p className="text-2xl font-bold text-white">{data.overview.totalUsers.toLocaleString()}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-3 w-3 text-green-400 mr-1" />
                  <span className="text-green-400 text-xs">+{data.overview.userGrowth}%</span>
                </div>
              </div>
              <Users className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Avg Response Time</p>
                <p className="text-2xl font-bold text-white">{data.overview.avgResponseTime}s</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-3 w-3 text-green-400 mr-1" />
                  <span className="text-green-400 text-xs">{data.overview.responseTimeChange}%</span>
                </div>
              </div>
              <Clock className="h-8 w-8 text-cyan-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Satisfaction Rate</p>
                <p className="text-2xl font-bold text-white">{data.overview.satisfactionRate}%</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-3 w-3 text-green-400 mr-1" />
                  <span className="text-green-400 text-xs">+{data.overview.satisfactionChange}%</span>
                </div>
              </div>
              <Target className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Channel Performance */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Channel Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.channelPerformance.map((channel, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium">{channel.channel}</h4>
                    <p className="text-gray-400 text-sm">{channel.conversations} conversations</p>
                  </div>
                </div>
                <div className="flex gap-6 text-right">
                  <div>
                    <p className="text-white font-medium">{channel.users}</p>
                    <p className="text-gray-400 text-xs">Users</p>
                  </div>
                  <div>
                    <p className="text-white font-medium">{channel.avgResponseTime}s</p>
                    <p className="text-gray-400 text-xs">Avg Response</p>
                  </div>
                  <div>
                    <Badge className={channel.satisfaction > 90 ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}>
                      {channel.satisfaction}%
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Agent Performance */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Agent Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.agentPerformance.map((agent, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium">{agent.name.charAt(0)}</span>
                  </div>
                  <div>
                    <h4 className="text-white font-medium">{agent.name}</h4>
                    <p className="text-gray-400 text-sm">{agent.conversations} conversations</p>
                  </div>
                </div>
                <div className="flex gap-6 text-right">
                  <div>
                    <p className="text-white font-medium">{agent.avgResponseTime.toFixed(1)}s</p>
                    <p className="text-gray-400 text-xs">Response Time</p>
                  </div>
                  <div>
                    <p className="text-white font-medium">{agent.satisfaction}%</p>
                    <p className="text-gray-400 text-xs">Satisfaction</p>
                  </div>
                  <div>
                    <Badge className="bg-blue-500/20 text-blue-400">
                      {agent.automationRate}% Auto
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Business Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Top Keywords</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topKeywords.map((keyword, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-white font-medium">#{keyword.keyword}</span>
                    <Badge variant={keyword.trend === 'up' ? 'default' : keyword.trend === 'down' ? 'destructive' : 'secondary'}>
                      {keyword.trend}
                    </Badge>
                  </div>
                  <span className="text-gray-400">{keyword.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Business Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Conversion Rate</span>
                <span className="text-white font-medium">{data.businessMetrics.conversionRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Avg Session Duration</span>
                <span className="text-white font-medium">{data.businessMetrics.avgSessionDuration}m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Bounce Rate</span>
                <span className="text-white font-medium">{data.businessMetrics.bounceRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Customer LTV</span>
                <span className="text-white font-medium">${data.businessMetrics.customerLifetimeValue}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
