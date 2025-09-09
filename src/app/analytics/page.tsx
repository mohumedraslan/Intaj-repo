'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/supabaseClient';
import {
  MessageSquare,
  Bot,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Download,
  Eye
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

interface MetricData {
  value: number;
  change: number;
  trend: 'up' | 'down';
}

interface BotPerformance {
  name: string;
  channel: string;
  conversations: number;
  successRate: number;
  responseTime: string;
  status: 'active' | 'optimizing' | 'inactive';
}

interface Activity {
  id: string;
  message: string;
  timestamp: string;
  type: 'success' | 'info' | 'warning';
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [metrics, setMetrics] = useState<{
    conversations: MetricData;
    activeBots: MetricData;
    responseTime: MetricData;
    conversionRate: MetricData;
  }>({
    conversations: { value: 0, change: 0, trend: 'up' },
    activeBots: { value: 0, change: 0, trend: 'up' },
    responseTime: { value: 0, change: 0, trend: 'down' },
    conversionRate: { value: 0, change: 0, trend: 'up' }
  });

  const [botPerformance, setBotPerformance] = useState<BotPerformance[]>([]);

  const [activities, setActivities] = useState<Activity[]>([]);

  const [chartData, setChartData] = useState<{ name: string; value: number; [key: string]: string | number }[]>([]);

  const [insights] = useState([
    {
      type: 'optimization',
      title: 'Optimization Tip',
      message: "Your Support Bot's response time improved by 15% this week. Consider scaling this configuration to other bots.",
      color: 'from-blue-900/30 to-purple-900/30',
      borderColor: 'border-blue-500/20',
      iconColor: 'bg-blue-500'
    },
    {
      type: 'trend',
      title: 'Trend Alert',
      message: 'Peak conversation hours: 2PM-4PM. Consider adding more automation during these times.',
      color: 'from-purple-900/30 to-cyan-900/30',
      borderColor: 'border-purple-500/20',
      iconColor: 'bg-purple-500'
    },
    {
      type: 'growth',
      title: 'Growth Opportunity',
      message: 'Instagram engagement up 34%. Consider expanding your social media bot presence.',
      color: 'from-cyan-900/30 to-green-900/30',
      borderColor: 'border-cyan-500/20',
      iconColor: 'bg-cyan-500'
    }
  ]);

  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error('Auth error:', authError);
        setLoading(false);
        return;
      }
      
      if (!user) {
        console.log('No authenticated user found');
        setLoading(false);
        return;
      }

      setUser(user);

      // Call the new RPC function instead of separate queries
      const { data: analyticsData, error } = await supabase.rpc('get_analytics_metrics', {
        user_id_param: user.id,
        time_range_param: timeRange
      });

      // Fetch chart data for conversations over time
      const { data: conversationsOverTime, error: chartError } = await supabase.rpc('get_conversations_over_time', {
        user_id_param: user.id,
        time_range_param: timeRange
      });

      if (error) {
        console.error('Error fetching analytics data:', error);
        // Fallback to default values if RPC fails
        setMetrics({
          conversations: { value: 0, change: 0, trend: 'up' },
          activeBots: { value: 0, change: 0, trend: 'up' },
          responseTime: { value: 1.5, change: -10, trend: 'down' },
          conversionRate: { value: 0, change: 0, trend: 'up' }
        });
        setBotPerformance([]);
        setActivities([{
          id: 'error-1',
          message: 'Unable to load analytics data',
          timestamp: 'Just now',
          type: 'warning'
        }]);
        setChartData([]);
        return;
      }

      // Set chart data
      if (conversationsOverTime && !chartError) {
        setChartData(conversationsOverTime);
      } else {
        console.error('Error fetching chart data:', chartError);
        setChartData([]);
      }

      if (!analyticsData) {
        console.log('No analytics data returned');
        setLoading(false);
        return;
      }

      // Update metrics using data from RPC function
      setMetrics({
        conversations: { 
          value: analyticsData.total_conversations || 0, 
          change: 15, // Keep hardcoded for now as requested
          trend: 'up' 
        },
        activeBots: { 
          value: analyticsData.active_bots || 0, 
          change: 8, // Keep hardcoded for now as requested
          trend: 'up' 
        },
        responseTime: { 
          value: parseFloat(analyticsData.avg_response_time) || 1.5, 
          change: -10, // Keep hardcoded for now as requested
          trend: 'down' 
        },
        conversionRate: { 
          value: Math.round(analyticsData.conversion_rate) || 0, 
          change: 12, // Keep hardcoded for now as requested
          trend: 'up' 
        }
      });

      // Transform bot performance data from RPC response
      const botPerformanceData: BotPerformance[] = analyticsData.bot_performance?.map((bot: {
        name: string;
        channel: string;
        conversations?: number;
        success_rate?: number;
        response_time?: string;
        status?: string;
      }) => ({
        name: bot.name,
        channel: bot.channel === 'website' ? 'Website' : 
                bot.channel === 'whatsapp' ? 'WhatsApp' :
                bot.channel === 'facebook' ? 'Facebook' :
                bot.channel === 'instagram' ? 'Instagram' : 'Website',
        conversations: bot.conversations || 0,
        successRate: Math.round(bot.success_rate || 85),
        responseTime: bot.response_time || '1.2s',
        status: bot.status as 'active' | 'optimizing' | 'inactive'
      })) || [];

      // Show sample data if no bots exist
      if (botPerformanceData.length === 0) {
        botPerformanceData.push({
          name: 'Welcome Bot',
          channel: 'Website',
          conversations: 0,
          successRate: 85,
          responseTime: '1.2s',
          status: 'inactive'
        });
      }

      setBotPerformance(botPerformanceData);

      // Generate activities based on bot performance data
      const recentActivities: Activity[] = [];
      
      // Add activities for bots with conversations
      botPerformanceData.forEach(bot => {
        if (bot.conversations > 0) {
          recentActivities.push({
            id: `bot-activity-${bot.name}`,
            message: `${bot.name} handled ${bot.conversations} conversation${bot.conversations > 1 ? 's' : ''}`,
            timestamp: 'Recently',
            type: 'success'
          });
        }
      });

      // Add bot creation activities
      if (analyticsData.active_bots > 0) {
        recentActivities.push({
          id: 'bots-active',
          message: `${analyticsData.active_bots} chatbot${analyticsData.active_bots > 1 ? 's' : ''} currently active`,
          timestamp: 'Now',
          type: 'info'
        });
      }

      // If no activities, show welcome message
      if (recentActivities.length === 0) {
        recentActivities.push({
          id: 'welcome-1',
          message: 'Welcome to your analytics dashboard',
          timestamp: 'Just now',
          type: 'info'
        });
      }

      setActivities(recentActivities.slice(0, 5));

    } catch (error) {
      console.error('Error fetching analytics data:', error);
      // Set fallback data on error
      setMetrics({
        conversations: { value: 0, change: 0, trend: 'up' },
        activeBots: { value: 0, change: 0, trend: 'up' },
        responseTime: { value: 1.5, change: -10, trend: 'down' },
        conversionRate: { value: 0, change: 0, trend: 'up' }
      });
      setBotPerformance([]);
      setActivities([{
        id: 'error-1',
        message: 'Error loading analytics data',
        timestamp: 'Just now',
        type: 'warning'
      }]);
      setChartData([]);
    } finally {
      setLoading(false);
    }
  };

  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  };

  // Helper function to convert bot performance data to CSV
  const convertToCSV = (data: BotPerformance[]) => {
    const headers = ['Bot Name', 'Channel', 'Conversations', 'Success Rate (%)', 'Response Time', 'Status'];
    const csvContent = [
      headers.join(','),
      ...data.map(bot => [
        `"${bot.name}"`,
        `"${bot.channel}"`,
        bot.conversations,
        bot.successRate,
        `"${bot.responseTime}"`,
        `"${bot.status}"`
      ].join(','))
    ].join('\n');
    
    return csvContent;
  };

  const exportAnalyticsData = () => {
    // Convert bot performance data to CSV
    const csvData = convertToCSV(botPerformance);
    
    // Create blob and download
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `intaj-performance-report-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Real-time updates for live data
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      // Refresh data every 30 seconds
      fetchAnalyticsData();
    }, 30000);

    return () => clearInterval(interval);
  }, [user, timeRange]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-900/30 text-green-400';
      case 'optimizing':
        return 'bg-yellow-900/30 text-yellow-400';
      case 'inactive':
        return 'bg-red-900/30 text-red-400';
      default:
        return 'bg-gray-900/30 text-gray-400';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-500';
      case 'info':
        return 'bg-blue-500';
      case 'warning':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#0a0a0b] text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full min-h-screen bg-[#0a0a0b] text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Please log in to view analytics</p>
          <button className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-2 rounded-lg text-white font-medium">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#0a0a0b] text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent">
                Analytics Dashboard
              </span>
            </h1>
            <p className="text-gray-300">Real-time insights into your AI automation performance</p>
          </div>
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <div className="flex items-center space-x-2 text-gray-400 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Real-time data</span>
            </div>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[140px] bg-[#1f2024] border-gray-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1f2024] border-gray-600">
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              className="border border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
              onClick={exportAnalyticsData}
            >
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-[rgba(31,32,36,0.8)] backdrop-blur-lg border border-blue-500/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/5 to-transparent animate-pulse"></div>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center space-x-1 text-green-400 text-sm">
                <TrendingUp className="w-4 h-4" />
                <span>+{metrics.conversations.change}%</span>
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-1">
                {metrics.conversations.value.toLocaleString()}
              </div>
              <div className="text-gray-400 text-sm">Total Conversations</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[rgba(31,32,36,0.8)] backdrop-blur-lg border border-purple-500/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/5 to-transparent animate-pulse"></div>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center space-x-1 text-blue-400 text-sm">
                <TrendingUp className="w-4 h-4" />
                <span>+{metrics.activeBots.change}%</span>
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-1">
                {metrics.activeBots.value}
              </div>
              <div className="text-gray-400 text-sm">Active AI Bots</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[rgba(31,32,36,0.8)] backdrop-blur-lg border border-cyan-500/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent animate-pulse"></div>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center space-x-1 text-green-400 text-sm">
                <TrendingDown className="w-4 h-4" />
                <span>{Math.abs(metrics.responseTime.change)}%</span>
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-1">
                {metrics.responseTime.value}s
              </div>
              <div className="text-gray-400 text-sm">Avg Response Time</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[rgba(31,32,36,0.8)] backdrop-blur-lg border border-green-500/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-500/5 to-transparent animate-pulse"></div>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center space-x-1 text-green-400 text-sm">
                <TrendingUp className="w-4 h-4" />
                <span>+{metrics.conversionRate.change}%</span>
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-1">
                {metrics.conversionRate.value}%
              </div>
              <div className="text-gray-400 text-sm">Conversion Rate</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card className="bg-[rgba(31,32,36,0.8)] backdrop-blur-lg border border-blue-500/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold text-white">Conversations Over Time</CardTitle>
              <div className="flex items-center space-x-2">
                <Button className="bg-blue-600 text-white text-sm px-3 py-1">Daily</Button>
                <Button className="text-gray-300 hover:bg-gray-700 text-sm px-3 py-1">Weekly</Button>
                <Button className="text-gray-300 hover:bg-gray-700 text-sm px-3 py-1">Monthly</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="conversationGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis 
                    dataKey="formatted_date" 
                    stroke="#9ca3af" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#9ca3af" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#f9fafb'
                    }}
                    labelStyle={{ color: '#d1d5db' }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="url(#conversationGradient)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[rgba(31,32,36,0.8)] backdrop-blur-lg border border-purple-500/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold text-white">Channel Performance</CardTitle>
              <div className="flex items-center space-x-1 text-blue-400 text-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>Live</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Activity className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Doughnut chart showing channel distribution</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Bot Performance */}
        <Card className="bg-[rgba(31,32,36,0.8)] backdrop-blur-lg border border-blue-500/10">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-white">Top Performing Bots</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {botPerformance.slice(0, 3).map((bot, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-[#1f2024] rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      index === 0 ? 'bg-gradient-to-br from-blue-500 to-purple-600' :
                      index === 1 ? 'bg-purple-600' : 'bg-gradient-to-br from-cyan-500 to-blue-600'
                    }`}>
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">{bot.name}</div>
                      <div className="text-sm text-gray-400">{bot.channel}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${
                      bot.successRate >= 90 ? 'text-green-400' :
                      bot.successRate >= 80 ? 'text-blue-400' : 'text-yellow-400'
                    }`}>
                      {bot.successRate}%
                    </div>
                    <div className="text-sm text-gray-400">Success Rate</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card className="bg-[rgba(31,32,36,0.8)] backdrop-blur-lg border border-green-500/10">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-white">Recent Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`w-2 h-2 rounded-full mt-2 animate-pulse ${getActivityIcon(activity.type)}`}></div>
                  <div className="flex-1">
                    <div className="text-white text-sm">{activity.message}</div>
                    <div className="text-gray-400 text-xs">{activity.timestamp}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AI Insights */}
        <Card className="bg-[rgba(31,32,36,0.8)] backdrop-blur-lg border border-cyan-500/10">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-white">AI Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.map((insight, index) => (
                <div key={index} className={`p-4 bg-gradient-to-r ${insight.color} rounded-lg border ${insight.borderColor}`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <div className={`w-4 h-4 ${insight.iconColor} rounded-full animate-pulse`}></div>
                    <span className={`text-sm font-medium ${
                      insight.type === 'optimization' ? 'text-blue-300' :
                      insight.type === 'trend' ? 'text-purple-300' : 'text-cyan-300'
                    }`}>
                      {insight.title}
                    </span>
                  </div>
                  <p className="text-gray-200 text-sm">{insight.message}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics Table */}
      <Card className="bg-[rgba(31,32,36,0.8)] backdrop-blur-lg border border-blue-500/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold text-white">Performance Breakdown</CardTitle>
            <Button className="text-blue-400 hover:text-blue-300 bg-transparent">
              <Eye className="w-4 h-4 mr-2" />
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 text-gray-400 font-medium">Bot Name</th>
                  <th className="text-left py-3 text-gray-400 font-medium">Channel</th>
                  <th className="text-left py-3 text-gray-400 font-medium">Conversations</th>
                  <th className="text-left py-3 text-gray-400 font-medium">Success Rate</th>
                  <th className="text-left py-3 text-gray-400 font-medium">Response Time</th>
                  <th className="text-left py-3 text-gray-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {botPerformance.map((bot, index) => (
                  <tr key={index} className="border-b border-gray-800">
                    <td className="py-4 text-white font-medium">{bot.name}</td>
                    <td className="py-4 text-gray-300">{bot.channel}</td>
                    <td className="py-4 text-gray-300">{bot.conversations.toLocaleString()}</td>
                    <td className="py-4">
                      <div className="flex items-center space-x-2">
                        <div className={`font-medium ${
                          bot.successRate >= 90 ? 'text-green-400' :
                          bot.successRate >= 80 ? 'text-blue-400' : 'text-yellow-400'
                        }`}>
                          {bot.successRate}%
                        </div>
                        <Progress 
                          value={bot.successRate} 
                          className="w-16 h-2"
                        />
                      </div>
                    </td>
                    <td className="py-4 text-gray-300">{bot.responseTime}</td>
                    <td className="py-4">
                      <Badge className={`${getStatusColor(bot.status)} text-xs`}>
                        {bot.status.charAt(0).toUpperCase() + bot.status.slice(1)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
