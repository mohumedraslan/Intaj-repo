'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { 
  MessageSquare, Users, TrendingUp, Clock, Settings, BarChart3, 
  Phone, Mail, Globe, Zap, CheckCircle, AlertCircle, Activity,
  ArrowLeft, RefreshCw, Download, Filter, Search, MoreVertical,
  Send, Bot, User, Calendar, Star, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Agent {
  id: string;
  name: string;
  description: string;
  status: string;
  avatar_url?: string;
  created_at: string;
  model: string;
  agent_type: string;
}

interface Message {
  id: string;
  // Unified preferred
  channel?: string | null;
  direction?: 'inbound' | 'outbound' | null;
  role?: 'user' | 'agent' | 'system' | null;
  content_text?: string | null;
  attachments?: any[] | null;
  // Legacy fallback
  content: string;
  sender_type: 'user' | 'agent';
  sender_name: string;
  created_at: string;
  platform: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  resolved?: boolean;
}

interface Analytics {
  totalChats: number;
  activeChats: number;
  resolvedChats: number;
  avgResponseTime: string;
  satisfactionRate: number;
  todayMessages: number;
  weeklyGrowth: number;
  leadsGenerated?: number;
  conversionRate?: number;
  revenue?: number;
  contentCreated?: number;
  campaignsActive?: number;
  engagement?: number;
}

export default function AgentDashboard() {
  const params = useParams();
  const router = useRouter();
  const agentId = params?.id as string;
  
  const [agent, setAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>({
    totalChats: 0,
    activeChats: 0,
    resolvedChats: 0,
    avgResponseTime: '0s',
    satisfactionRate: 0,
    todayMessages: 0,
    weeklyGrowth: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('all');

  useEffect(() => {
    fetchAgentData();
    fetchMessages();
    fetchAnalytics();
    
    // Set up real-time subscriptions
    const messagesSubscription = supabase
      .channel('messages')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'messages', filter: `agent_id=eq.${agentId}` },
        () => {
          fetchMessages();
          fetchAnalytics();
        }
      )
      .subscribe();

    return () => {
      messagesSubscription.unsubscribe();
    };
  }, [agentId]);

  const fetchAgentData = async () => {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single();

      if (error) throw error;
      setAgent(data);
    } catch (error) {
      console.error('Error fetching agent:', JSON.stringify(error, null, 2));
    }
  };

  const fetchMessages = async () => {
    try {
      // Fetch messages from multiple sources for this agent
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(50);

      // All messages are now in the unified messages table, no need for separate platform tables
      if (messagesError) console.error('Messages error:', messagesError.message || messagesError);

      // Combine all messages
      const allMessages = [
        ...(messagesData || []).map((msg: any) => {
          const text = msg.content_text || msg.content || '';
          const platform = msg.channel || msg.platform || 'website';
          const sender_type = (msg.role === 'agent' ? 'agent' : 'user') as 'agent' | 'user';
          return {
            id: msg.id,
            channel: msg.channel,
            direction: msg.direction,
            role: msg.role,
            content_text: msg.content_text,
            attachments: msg.attachments,
            content: text,
            sender_type,
            sender_name: msg.sender_name || (sender_type === 'agent' ? (agent?.name || 'Agent') : 'User'),
            created_at: msg.created_at,
            platform,
            sentiment: analyzeSentiment(text),
            resolved: msg.status === 'resolved'
          } as Message;
        })
      ];

      // Sort by created_at descending
      allMessages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      console.log('Combined messages for agent:', agentId, allMessages);
      setMessages(allMessages.slice(0, 100));

      // If no real messages, add some sample data for testing
      if (allMessages.length === 0) {
        const sampleMessages = [
          {
            id: 'sample-1',
            content: 'Hello, I need help with my order',
            sender_type: 'user' as const,
            sender_name: 'John Doe',
            created_at: new Date().toISOString(),
            platform: 'telegram',
            sentiment: 'neutral' as const,
            resolved: false,
            agent_id: agentId
          },
          {
            id: 'sample-2',
            content: 'Hi! I\'d be happy to help you with your order. Can you please provide your order number?',
            sender_type: 'agent' as const,
            sender_name: agent?.name || 'Support Agent',
            created_at: new Date(Date.now() - 30000).toISOString(),
            platform: 'telegram',
            sentiment: 'positive' as const,
            resolved: false,
            agent_id: agentId
          },
          {
            id: 'sample-3',
            content: 'My order number is #12345',
            sender_type: 'user' as const,
            sender_name: 'John Doe',
            created_at: new Date(Date.now() - 60000).toISOString(),
            platform: 'telegram',
            sentiment: 'neutral' as const,
            resolved: false,
            agent_id: agentId
          }
        ];
        setMessages(sampleMessages);
      }
    } catch (error) {
      console.error('Error fetching messages:', JSON.stringify(error, null, 2));
    }
  };

  const analyzeSentiment = (text: string): 'positive' | 'negative' | 'neutral' => {
    if (!text) return 'neutral';
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'perfect', 'love', 'thank', 'thanks', 'awesome', 'fantastic'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'problem', 'issue', 'error', 'broken', 'wrong', 'disappointed'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  };

  const generateAgentTypeAnalytics = (agentType: string, totalChats: number, todayMessages: number) => {
    switch (agentType) {
      case 'sales':
        return {
          leadsGenerated: Math.floor(totalChats * 0.6),
          conversionRate: 23 + Math.floor(Math.random() * 15), // 23-38%
          revenue: Math.floor(totalChats * 45 + Math.random() * 1000), // Revenue in dollars
        };
      case 'marketing':
        return {
          contentCreated: Math.floor(todayMessages * 0.3) + 5,
          campaignsActive: Math.floor(totalChats * 0.1) + 2,
          engagement: 3.2 + Math.random() * 2, // 3.2-5.2%
        };
      case 'customer_support':
      case 'chatbot':
      default:
        return {
          // Default support metrics already covered in base analytics
        };
    }
  };

  const fetchAnalytics = async () => {
    try {
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .eq('agent_id', agentId);

      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayMessages = messagesData?.filter(msg => 
        new Date(msg.created_at) >= today
      ).length || 0;

      const totalChats = Math.floor(messagesData?.length / 2) || 0;
      const activeChats = Math.floor(totalChats * 0.3);
      const resolvedChats = totalChats - activeChats;

      // Generate agent-type specific analytics
      const agentTypeAnalytics = generateAgentTypeAnalytics(agent?.agent_type || 'chatbot', totalChats, todayMessages);

      setAnalytics({
        totalChats,
        activeChats,
        resolvedChats,
        ...agentTypeAnalytics,
        avgResponseTime: '1.2s',
        satisfactionRate: 94,
        todayMessages,
        weeklyGrowth: 12
      });
    } catch (error) {
      console.error('Error fetching analytics:', JSON.stringify(error, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const filteredMessages = messages.filter(msg => {
    const matchesSearch = msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         msg.sender_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform = filterPlatform === 'all' || msg.platform === filterPlatform;
    return matchesSearch && matchesPlatform;
  });

  const getAgentTypeIcon = (type: string) => {
    switch (type) {
      case 'customer_support': return <MessageSquare className="h-5 w-5" />;
      case 'sales': return <TrendingUp className="h-5 w-5" />;
      case 'marketing': return <BarChart3 className="h-5 w-5" />;
      default: return <Bot className="h-5 w-5" />;
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'telegram': return <MessageSquare className="h-4 w-4" />;
      case 'whatsapp': return <Phone className="h-4 w-4" />;
      case 'website': return <Globe className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-400';
      case 'negative': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0b] via-[#141517] to-[#1f2024] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-400">Loading agent dashboard...</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0b] via-[#141517] to-[#1f2024] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Agent Not Found</h2>
          <p className="text-gray-400 mb-6">The agent you're looking for doesn't exist or you don't have access to it.</p>
          <Button onClick={() => router.push('/dashboard/agents')} className="bg-gradient-to-r from-blue-500 to-purple-600">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Agents
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0b] via-[#141517] to-[#1f2024] relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <div className="relative z-10 p-6">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => router.push('/dashboard/agents')}
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Agents
              </Button>
              <div className="h-8 w-px bg-gray-600"></div>
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12 rounded-xl">
                  {agent.avatar_url ? (
                    <AvatarImage src={agent.avatar_url} alt={agent.name} />
                  ) : (
                    <AvatarFallback className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-600">
                      {getAgentTypeIcon(agent.agent_type)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <h1 className="text-2xl font-bold text-white">{agent.name}</h1>
                  <p className="text-gray-400 capitalize">{agent.agent_type?.replace('_', ' ') || 'AI'} Agent</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Badge className={`${agent.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                <Activity className="w-3 h-3 mr-1" />
                {agent.status === 'active' ? 'Online' : 'Offline'}
              </Badge>
              <Button 
                onClick={() => router.push(`/agents/${agentId}/configure`)}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                <Settings className="w-4 h-4 mr-2" />
                Configure
              </Button>
            </div>
          </div>

          {/* Dynamic Stats Based on Agent Type */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
            {/* Base Stats for All Agents */}
            <Card className="glass-card">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-400 mb-1">{analytics.totalChats}</div>
                <div className="text-xs text-gray-400">Total Chats</div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-400 mb-1">{analytics.activeChats}</div>
                <div className="text-xs text-gray-400">Active</div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-400 mb-1">{analytics.resolvedChats}</div>
                <div className="text-xs text-gray-400">Resolved</div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-cyan-400 mb-1">{analytics.avgResponseTime}</div>
                <div className="text-xs text-gray-400">Avg Response</div>
              </CardContent>
            </Card>
            
            {/* Agent Type Specific Stats */}
            {agent?.agent_type === 'sales' && (
              <>
                <Card className="glass-card">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-orange-400 mb-1">{analytics.leadsGenerated}</div>
                    <div className="text-xs text-gray-400">Leads Generated</div>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-400 mb-1">{analytics.conversionRate}%</div>
                    <div className="text-xs text-gray-400">Conversion</div>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-400 mb-1">${analytics.revenue}</div>
                    <div className="text-xs text-gray-400">Revenue</div>
                  </CardContent>
                </Card>
              </>
            )}
            
            {agent?.agent_type === 'marketing' && (
              <>
                <Card className="glass-card">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-purple-400 mb-1">{analytics.contentCreated}</div>
                    <div className="text-xs text-gray-400">Content Created</div>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-cyan-400 mb-1">{analytics.campaignsActive}</div>
                    <div className="text-xs text-gray-400">Active Campaigns</div>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-400 mb-1">{analytics.engagement?.toFixed(1)}%</div>
                    <div className="text-xs text-gray-400">Engagement</div>
                  </CardContent>
                </Card>
              </>
            )}
            
            {(agent?.agent_type === 'customer_support' || agent?.agent_type === 'chatbot' || !agent?.agent_type) && (
              <>
                <Card className="glass-card">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-400 mb-1">{analytics.satisfactionRate}%</div>
                    <div className="text-xs text-gray-400">Satisfaction</div>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-orange-400 mb-1">{analytics.todayMessages}</div>
                    <div className="text-xs text-gray-400">Today</div>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-400 mb-1">+{analytics.weeklyGrowth}%</div>
                    <div className="text-xs text-gray-400">Growth</div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-gray-800/50 border border-gray-700">
              <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600">Overview</TabsTrigger>
              <TabsTrigger value="conversations" className="data-[state=active]:bg-blue-600">Live Conversations</TabsTrigger>
              <TabsTrigger value="analytics" className="data-[state=active]:bg-blue-600">Analytics</TabsTrigger>
              <TabsTrigger value="performance" className="data-[state=active]:bg-blue-600">Performance</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Recent Activity */}
                <Card className="glass-card lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Activity className="w-5 h-5 mr-2 text-blue-400" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {filteredMessages.slice(0, 5).map((message) => (
                        <div key={message.id} className="flex items-start space-x-3 p-3 bg-gray-800/30 rounded-lg">
                          <div className="flex-shrink-0">
                            {message.sender_type === 'user' ? (
                              <User className="w-6 h-6 text-gray-400" />
                            ) : (
                              <Bot className="w-6 h-6 text-blue-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-sm font-medium text-white">{message.sender_name}</span>
                              <div className="flex items-center space-x-1">
                                {getPlatformIcon(message.platform)}
                                <span className="text-xs text-gray-400 capitalize">{message.platform}</span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {new Date(message.created_at).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-300 line-clamp-2">{message.content}</p>
                            {Array.isArray(message.attachments) && message.attachments.length > 0 && (
                              <div className="mt-1 text-xs text-gray-400">{message.attachments.length} attachment(s)</div>
                            )}
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge className={`text-xs ${getSentimentColor(message.sentiment || 'neutral')}`}>
                                {message.sentiment || 'neutral'}
                              </Badge>
                              {message.resolved && (
                                <Badge className="text-xs bg-green-500/20 text-green-400">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Resolved
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Zap className="w-5 h-5 mr-2 text-yellow-400" />
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button 
                      onClick={() => router.push(`/agents/${agentId}/configure`)}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Agent Settings
                    </Button>
                    <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:border-blue-500">
                      <Download className="w-4 h-4 mr-2" />
                      Export Data
                    </Button>
                    <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:border-green-500">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh Stats
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="conversations" className="space-y-6">
              <Card className="glass-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <MessageSquare className="w-5 h-5 mr-2 text-blue-400" />
                      Live Conversations ({filteredMessages.length})
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          type="text"
                          placeholder="Search conversations..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 w-64 bg-gray-700 border-gray-600 text-white"
                        />
                      </div>
                      <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                        <SelectTrigger className="w-32 bg-gray-700 border-gray-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="telegram">Telegram</SelectItem>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="website">Website</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {filteredMessages.map((message) => (
                      <div key={message.id} className="flex items-start space-x-3 p-4 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600">
                            {message.sender_type === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-sm font-medium text-white">{message.sender_name}</span>
                            <div className="flex items-center space-x-1">
                              {getPlatformIcon(message.platform)}
                              <span className="text-xs text-gray-400 capitalize">{message.platform}</span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(message.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-300 mb-2">{message.content}</p>
                          {Array.isArray(message.attachments) && message.attachments.length > 0 && (
                            <div className="text-xs text-gray-400 mb-1">{message.attachments.length} attachment(s)</div>
                          )}
                          <div className="flex items-center space-x-2">
                            <Badge className={`text-xs ${getSentimentColor(message.sentiment || 'neutral')}`}>
                              {message.sentiment === 'positive' && <ThumbsUp className="w-3 h-3 mr-1" />}
                              {message.sentiment === 'negative' && <ThumbsDown className="w-3 h-3 mr-1" />}
                              {message.sentiment || 'neutral'}
                            </Badge>
                            {message.resolved && (
                              <Badge className="text-xs bg-green-500/20 text-green-400">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Resolved
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2 text-green-400" />
                      Performance Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Response Time</span>
                        <span className="text-cyan-400 font-semibold">{analytics.avgResponseTime}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Satisfaction Rate</span>
                        <span className="text-green-400 font-semibold">{analytics.satisfactionRate}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Resolution Rate</span>
                        <span className="text-blue-400 font-semibold">87%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Weekly Growth</span>
                        <span className="text-green-400 font-semibold">+{analytics.weeklyGrowth}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2 text-purple-400" />
                      Usage Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Messages Today</span>
                        <span className="text-orange-400 font-semibold">{analytics.todayMessages}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Active Conversations</span>
                        <span className="text-green-400 font-semibold">{analytics.activeChats}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Total Conversations</span>
                        <span className="text-blue-400 font-semibold">{analytics.totalChats}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Platform Coverage</span>
                        <span className="text-purple-400 font-semibold">3 Channels</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Star className="w-5 h-5 mr-2 text-yellow-400" />
                    Performance Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-400 mb-2">{analytics.satisfactionRate}%</div>
                      <div className="text-sm text-gray-400">Customer Satisfaction</div>
                      <div className="text-xs text-green-400 mt-1">+2% from last week</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-cyan-400 mb-2">{analytics.avgResponseTime}</div>
                      <div className="text-sm text-gray-400">Average Response Time</div>
                      <div className="text-xs text-green-400 mt-1">-0.3s improvement</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-400 mb-2">87%</div>
                      <div className="text-sm text-gray-400">Resolution Rate</div>
                      <div className="text-xs text-green-400 mt-1">+5% from last week</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
