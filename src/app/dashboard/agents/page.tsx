'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabaseClient';
import { formatDistanceToNow } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  MoreVertical,
  Trash2,
  BarChart,
  Slack,
  Twitter,
  Mail
} from 'lucide-react';
import { deleteAgent } from './actions';

interface Agent {
  id: string;
  name: string;
  description?: string;
  model: string;
  settings: Record<string, unknown>;
  created_at: string;
  avatar_url?: string;
}

interface Connection {
  id: string;
  chatbot_id: string;
  platform: string;
  active: boolean;
}

export default function AgentsPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<string | null>(null);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data, error } = await supabase
          .from('agents')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (error) {
          setError(error.message);
        } else {
          setAgents(data || []);
          
          // Fetch connections for all agents
          if (data && data.length > 0) {
            const agentIds = data.map(agent => agent.id);
            const { data: connectionsData, error: connectionsError } = await supabase
              .from('connections')
              .select('*')
              .in('chatbot_id', agentIds);
              
            if (!connectionsError) {
              setConnections(connectionsData || []);
            }
          }
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

  const getConnectionIcons = (agentId: string) => {
    const agentConnections = connections.filter(conn => conn.chatbot_id === agentId && conn.active);
    const icons = [];
    
    for (const conn of agentConnections) {
      switch (conn.platform) {
        case 'website':
          icons.push(<Globe key={`${agentId}-website`} className="w-4 h-4 text-blue-400" />);
          break;
        case 'facebook':
          icons.push(<Facebook key={`${agentId}-facebook`} className="w-4 h-4 text-blue-600" />);
          break;
        case 'instagram':
          icons.push(<Instagram key={`${agentId}-instagram`} className="w-4 h-4 text-purple-500" />);
          break;
        case 'whatsapp':
          icons.push(<Phone key={`${agentId}-whatsapp`} className="w-4 h-4 text-green-500" />);
          break;
        case 'slack':
          icons.push(<Slack key={`${agentId}-slack`} className="w-4 h-4 text-yellow-500" />);
          break;
        case 'twitter':
          icons.push(<Twitter key={`${agentId}-twitter`} className="w-4 h-4 text-blue-400" />);
          break;
        case 'email':
          icons.push(<Mail key={`${agentId}-email`} className="w-4 h-4 text-gray-400" />);
          break;
      }
    }
    
    return icons;
  };

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };
  
  const handleDeleteClick = (agentId: string) => {
    setAgentToDelete(agentId);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteConfirm = async () => {
    if (!agentToDelete) return;
    
    try {
      await deleteAgent(agentToDelete);
      setAgents(agents.filter(agent => agent.id !== agentToDelete));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeleteDialogOpen(false);
      setAgentToDelete(null);
    }
  };
  
  const getAgentStatus = (agent: Agent) => {
    const status = agent.settings?.status as string || 'Active';
    
    switch (status.toLowerCase()) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Inactive</Badge>;
      case 'training':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Training</Badge>;
      default:
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>;
    }
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
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0b] via-[#141517] to-[#1f2024] p-6 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>
      
      <div className="max-w-7xl mx-auto relative z-10">
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
            <Link href="/dashboard/agents/new">
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
          <div className="glass-card p-12 text-center rounded-2xl">
            <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
              <Bot className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-white">No agents yet</h3>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              Get started by creating your first AI agent. It only takes a few minutes to set up and deploy.
            </p>
            <Link href="/dashboard/agents/new">
              <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 transform hover:-translate-y-0.5 shadow-lg">
                <Plus className="w-5 h-5 mr-2" />
                Create Your First Agent
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="glass-card p-6 rounded-2xl transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl cursor-pointer group"
                onClick={() => router.push(`/agents/${agent.id}/configure`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Avatar className="h-12 w-12 rounded-xl">
                        {agent.avatar_url ? (
                          <AvatarImage src={agent.avatar_url} alt={agent.name} className="rounded-xl" />
                        ) : (
                          <AvatarFallback className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-600">
                            <MessageSquare className="h-6 w-6 text-white" />
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900 animate-pulse"></div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white group-hover:text-blue-300 transition-colors">{agent.name}</h3>
                      <p className="text-xs text-gray-400">{agent.model}</p>
                    </div>
                  </div>
                  {getAgentStatus(agent)}
                </div>

                <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-gray-300">Active</span>
                  </div>
                  <p className="text-sm text-gray-300 line-clamp-2">
                    {agent.description || "AI-powered agent ready to assist your customers"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-400">24</div>
                    <div className="text-xs text-gray-400">Chats Today</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-400">96%</div>
                    <div className="text-xs text-gray-400">Satisfaction</div>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button 
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/agents/${agent.id}/configure`);
                    }}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-sm font-medium transition-all duration-300"
                  >
                    Configure
                  </Button>
                  <Button 
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/dashboard/analytics?agent=${agent.id}`);
                    }}
                    variant="outline"
                    className="px-4 bg-gray-800/50 border-gray-600 text-gray-300 hover:border-blue-500 hover:text-blue-300 transition-all duration-300"
                  >
                    <BarChart className="w-4 h-4" />
                  </Button>
                </div>

                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                      <Link href={`/agents/${agent.id}/configure`}>
                        <DropdownMenuItem className="text-gray-200 hover:text-white cursor-pointer">
                          <Edit3 className="mr-2 h-4 w-4" />
                          <span>Edit</span>
                        </DropdownMenuItem>
                      </Link>
                      <Link href={`/dashboard/analytics?agent=${agent.id}`}>
                        <DropdownMenuItem className="text-gray-200 hover:text-white cursor-pointer">
                          <BarChart className="mr-2 h-4 w-4" />
                          <span>View Analytics</span>
                        </DropdownMenuItem>
                      </Link>
                      <DropdownMenuItem 
                        className="text-red-400 hover:text-red-300 cursor-pointer"
                        onClick={() => handleDeleteClick(agent.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Delete</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-gray-800 border-gray-700 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                This action cannot be undone. This will permanently delete the agent
                and all associated data including messages and connections.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-gray-700 text-white hover:bg-gray-600">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={handleDeleteConfirm}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
                        {agents.reduce((acc, agent) => {
                          const channels = agent.settings?.channels as Record<string, boolean> || {};
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
