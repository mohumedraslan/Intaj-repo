'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabaseClient';
import {
  Bot,
  Plus,
  MessageSquare,
  Settings,
  TrendingUp,
  Calendar,
  Globe,
  Facebook,
  Instagram,
  Phone,
  Sparkles,
  Edit3,
  MoreVertical
} from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  description?: string;
  model: string;
  settings: Record<string, unknown>;
  created_at: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('chatbots')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          setError(error.message);
        } else {
          setAgents(data || []);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();

    // Set up real-time subscription for agents
    const subscription = supabase
      .channel('chatbots_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'chatbots' },
        () => {
          console.log('Agents table changed, refetching...');
          fetchAgents();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const getChannelIcons = (settings: Record<string, unknown>) => {
    const channels = settings?.channels as Record<string, boolean> || {};
    const icons = [];

    if (channels.website) icons.push(<Globe key="website" className="w-4 h-4 text-blue-400" />);
    if (channels.facebook) icons.push(<Facebook key="facebook" className="w-4 h-4 text-blue-600" />);
    if (channels.instagram) icons.push(<Instagram key="instagram" className="w-4 h-4 text-purple-500" />);
    if (channels.whatsapp) icons.push(<Phone key="whatsapp" className="w-4 h-4 text-green-500" />);

    return icons;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#0a0a0b] text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-700 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-700 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#0a0a0b] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent">
                  Your Agents
                </span>
              </h1>
              <p className="text-gray-300">Manage and deploy your AI-powered agents across multiple channels</p>
            </div>
            <Link href="/dashboard/agents/create">
              <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:-translate-y-0.5">
                <Plus className="w-5 h-5 mr-2" />
                Create New Agent
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <Card className="bg-red-500/10 border border-red-500/20 mb-6">
            <CardContent className="p-4">
              <p className="text-red-400">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Agents Grid */}
        {agents.length === 0 ? (
          <Card className="bg-[rgba(31,32,36,0.8)] backdrop-blur-lg border border-gray-600 rounded-2xl">
            <CardContent className="p-12 text-center">
              <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Bot className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">No agents yet</h3>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">
                Get started by creating your first AI agent. It only takes a few minutes to set up and deploy.
              </p>
              <Link href="/dashboard/agents/create">
                <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 transform hover:-translate-y-0.5">
                  <Plus className="w-5 h-5 mr-2" />
                  Create Your First Agent
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <Card key={agent.id} className="bg-[rgba(31,32,36,0.8)] backdrop-blur-lg border border-blue-500/10 rounded-xl hover:border-blue-500/30 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10">
                <CardHeader className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <MessageSquare className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold text-white truncate">
                          {agent.name}
                        </CardTitle>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className="bg-green-500/20 text-green-400 text-xs border-green-500/30">
                            Active
                          </Badge>
                          <span className="text-xs text-gray-400">{agent.model}</span>
                        </div>
                      </div>
                    </div>
                    <Button className="text-gray-400 hover:text-white bg-transparent p-1">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-6 pt-0">
                  {agent.description && (
                    <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                      {agent.description}
                    </p>
                  )}

                  {/* Channels */}
                  <div className="flex items-center space-x-2 mb-4">
                    <span className="text-xs text-gray-400">Channels:</span>
                    <div className="flex items-center space-x-1">
                      {getChannelIcons(agent.settings)}
                      {getChannelIcons(agent.settings).length === 0 && (
                        <span className="text-xs text-gray-500">None configured</span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-blue-400">0</div>
                      <div className="text-xs text-gray-400">Messages</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-purple-400">0</div>
                      <div className="text-xs text-gray-400">Conversations</div>
                    </div>
                  </div>

                  {/* Created Date */}
                  <div className="flex items-center text-xs text-gray-400 mb-4">
                    <Calendar className="w-3 h-3 mr-1" />
                    Created {formatDate(agent.created_at)}
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <Link href={`/dashboard/agents/${agent.id}`} className="flex-1">
                      <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 text-sm">
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    </Link>
                    <Button className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 text-sm">
                      <TrendingUp className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Quick Stats */}
        {agents.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Quick Stats</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-[rgba(31,32,36,0.8)] backdrop-blur-lg border border-blue-500/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Agents</p>
                      <p className="text-2xl font-bold text-blue-400">{agents.length}</p>
                    </div>
                    <Bot className="w-8 h-8 text-blue-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[rgba(31,32,36,0.8)] backdrop-blur-lg border border-purple-500/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Active Channels</p>
                      <p className="text-2xl font-bold text-purple-400">
                        {agents.reduce((acc, bot) => {
                          const channels = bot.settings?.channels as Record<string, boolean> || {};
                          return acc + Object.values(channels).filter(Boolean).length;
                        }, 0)}
                      </p>
                    </div>
                    <Globe className="w-8 h-8 text-purple-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[rgba(31,32,36,0.8)] backdrop-blur-lg border border-green-500/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Messages</p>
                      <p className="text-2xl font-bold text-green-400">0</p>
                    </div>
                    <MessageSquare className="w-8 h-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[rgba(31,32,36,0.8)] backdrop-blur-lg border border-cyan-500/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Avg Response Time</p>
                      <p className="text-2xl font-bold text-cyan-400">0.8s</p>
                    </div>
                    <Sparkles className="w-8 h-8 text-cyan-400" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
