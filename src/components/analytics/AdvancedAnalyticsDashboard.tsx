'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, RadialBarChart, RadialBar } from 'recharts';
import { TrendingUp, TrendingDown, Users, MessageSquare, Clock, Target, Activity, Zap, Calendar, Filter, Download, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

interface AdvancedAnalyticsData {
  realtimeMetrics: {
    activeConversations: number;
    queuedMessages: number;
    avgWaitTime: number;
    onlineAgents: number;
  };
  conversationMetrics: {
    totalConversations: number;
    resolvedConversations: number;
    avgConversationLength: number;
    satisfactionScore: number;
  };
  businessMetrics: {
    conversionRate: number;
    leadGeneration: number;
    customerRetention: number;
    revenueImpact: number;
  };
  performanceData: Array<{
    date: string;
    messages: number;
    responses: number;
    satisfaction: number;
    resolution: number;
  }>;
  platformMetrics: Array<{
    platform: string;
    messages: number;
    users: number;
    satisfaction: number;
    growth: number;
  }>;
}

export default function AdvancedAnalyticsDashboard({ agentId }: { agentId?: string | null }) {
  const [data, setData] = useState<AdvancedAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [refreshing, setRefreshing] = useState(false);
  const supabase = createClientComponentClient();

  const fetchAnalyticsData = async () => {
    try {
      setRefreshing(true);
      
      // Simulate advanced analytics data
      const mockData: AdvancedAnalyticsData = {
        realtimeMetrics: {
          activeConversations: 24,
          queuedMessages: 3,
          avgWaitTime: 45,
          onlineAgents: 8
        },
        conversationMetrics: {
          totalConversations: 1247,
          resolvedConversations: 1156,
          avgConversationLength: 4.2,
          satisfactionScore: 4.6
        },
        businessMetrics: {
          conversionRate: 23.5,
          leadGeneration: 89,
          customerRetention: 87.3,
          revenueImpact: 45600
        },
        performanceData: [
          { date: '2024-01-01', messages: 120, responses: 115, satisfaction: 4.5, resolution: 92 },
          { date: '2024-01-02', messages: 145, responses: 140, satisfaction: 4.3, resolution: 89 },
          { date: '2024-01-03', messages: 167, responses: 162, satisfaction: 4.7, resolution: 95 },
          { date: '2024-01-04', messages: 134, responses: 128, satisfaction: 4.4, resolution: 88 },
          { date: '2024-01-05', messages: 189, responses: 185, satisfaction: 4.8, resolution: 97 },
          { date: '2024-01-06', messages: 156, responses: 151, satisfaction: 4.6, resolution: 93 },
          { date: '2024-01-07', messages: 178, responses: 174, satisfaction: 4.7, resolution: 96 }
        ],
        platformMetrics: [
          { platform: 'Telegram', messages: 456, users: 234, satisfaction: 4.7, growth: 12.3 },
          { platform: 'WhatsApp', messages: 389, users: 198, satisfaction: 4.5, growth: 8.7 },
          { platform: 'Website', messages: 234, users: 156, satisfaction: 4.3, growth: 15.2 },
          { platform: 'Discord', messages: 168, users: 89, satisfaction: 4.6, growth: 22.1 }
        ]
      };

      setData(mockData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange, agentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!data) return null;

  const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Advanced Analytics
          </h1>
          <p className="text-gray-400 mt-1">Comprehensive insights and performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32 bg-gray-800 border-gray-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={fetchAnalyticsData} 
            disabled={refreshing}
            variant="outline" 
            size="sm"
            className="border-gray-700"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Real-time Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Active Conversations</p>
                <p className="text-2xl font-bold text-green-400">{data.realtimeMetrics.activeConversations}</p>
              </div>
              <Activity className="h-8 w-8 text-green-400" />
            </div>
            <div className="flex items-center mt-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
              <span className="text-xs text-gray-400">Live</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Queued Messages</p>
                <p className="text-2xl font-bold text-yellow-400">{data.realtimeMetrics.queuedMessages}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-yellow-400" />
            </div>
            <div className="flex items-center mt-2">
              <Clock className="h-3 w-3 text-gray-400 mr-1" />
              <span className="text-xs text-gray-400">Avg wait: {data.realtimeMetrics.avgWaitTime}s</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Online Agents</p>
                <p className="text-2xl font-bold text-blue-400">{data.realtimeMetrics.onlineAgents}</p>
              </div>
              <Users className="h-8 w-8 text-blue-400" />
            </div>
            <div className="flex items-center mt-2">
              <CheckCircle className="h-3 w-3 text-green-400 mr-1" />
              <span className="text-xs text-gray-400">All systems operational</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Satisfaction Score</p>
                <p className="text-2xl font-bold text-purple-400">{data.conversationMetrics.satisfactionScore}/5</p>
              </div>
              <Target className="h-8 w-8 text-purple-400" />
            </div>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-3 w-3 text-green-400 mr-1" />
              <span className="text-xs text-green-400">+0.2 from last week</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="bg-gray-900 border-gray-800">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
          <TabsTrigger value="business">Business Impact</TabsTrigger>
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>Message volume, response rates, and satisfaction over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={data.performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }} 
                  />
                  <Area type="monotone" dataKey="messages" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="responses" stackId="2" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-gray-400">Total Conversations</p>
                <p className="text-3xl font-bold text-blue-400">{data.conversationMetrics.totalConversations.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-gray-400">Resolution Rate</p>
                <p className="text-3xl font-bold text-green-400">
                  {((data.conversationMetrics.resolvedConversations / data.conversationMetrics.totalConversations) * 100).toFixed(1)}%
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-gray-400">Avg Length</p>
                <p className="text-3xl font-bold text-purple-400">{data.conversationMetrics.avgConversationLength}</p>
                <p className="text-xs text-gray-400">messages</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-gray-400">Satisfaction</p>
                <p className="text-3xl font-bold text-yellow-400">{data.conversationMetrics.satisfactionScore}/5</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="business" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle>Business Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Conversion Rate</span>
                  <span className="text-xl font-bold text-green-400">{data.businessMetrics.conversionRate}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Lead Generation</span>
                  <span className="text-xl font-bold text-blue-400">{data.businessMetrics.leadGeneration}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Customer Retention</span>
                  <span className="text-xl font-bold text-purple-400">{data.businessMetrics.customerRetention}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Revenue Impact</span>
                  <span className="text-xl font-bold text-yellow-400">${data.businessMetrics.revenueImpact.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle>Revenue Impact</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={[
                    { name: 'Revenue', value: data.businessMetrics.revenueImpact, fill: '#3b82f6' }
                  ]}>
                    <RadialBar dataKey="value" cornerRadius={10} fill="#3b82f6" />
                  </RadialBarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="platforms" className="space-y-4">
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle>Platform Performance</CardTitle>
              <CardDescription>Message volume and satisfaction by platform</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data.platformMetrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="platform" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="messages" fill="#3b82f6" />
                  <Bar dataKey="users" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
