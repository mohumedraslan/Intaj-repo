<<<<<<< Updated upstream
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

interface Chatbot {
  id: string;
  name: string;
  description?: string;
  model: string;
  settings: Record<string, unknown>;
  created_at: string;
}

export default function ChatbotsPage() {
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChatbots = async () => {
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
          setChatbots(data || []);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchChatbots();

    // Set up real-time subscription for chatbots
    const subscription = supabase
      .channel('chatbots_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'chatbots' },
        () => {
          console.log('Chatbots table changed, refetching...');
          fetchChatbots();
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
                  Your Chatbots
                </span>
              </h1>
              <p className="text-gray-300">Manage and deploy your AI-powered chatbots across multiple channels</p>
            </div>
            <Link href="/dashboard/chatbots/create">
              <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:-translate-y-0.5">
                <Plus className="w-5 h-5 mr-2" />
                Create New Chatbot
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

        {/* Chatbots Grid */}
        {chatbots.length === 0 ? (
          <Card className="bg-[rgba(31,32,36,0.8)] backdrop-blur-lg border border-gray-600 rounded-2xl">
            <CardContent className="p-12 text-center">
              <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Bot className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">No chatbots yet</h3>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">
                Get started by creating your first AI chatbot. It only takes a few minutes to set up and deploy.
              </p>
              <Link href="/dashboard/chatbots/create">
                <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 transform hover:-translate-y-0.5">
                  <Plus className="w-5 h-5 mr-2" />
                  Create Your First Chatbot
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {chatbots.map((chatbot) => (
              <Card key={chatbot.id} className="bg-[rgba(31,32,36,0.8)] backdrop-blur-lg border border-blue-500/10 rounded-xl hover:border-blue-500/30 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10">
                <CardHeader className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <MessageSquare className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold text-white truncate">
                          {chatbot.name}
                        </CardTitle>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className="bg-green-500/20 text-green-400 text-xs border-green-500/30">
                            Active
                          </Badge>
                          <span className="text-xs text-gray-400">{chatbot.model}</span>
                        </div>
                      </div>
                    </div>
                    <Button className="text-gray-400 hover:text-white bg-transparent p-1">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="p-6 pt-0">
                  {chatbot.description && (
                    <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                      {chatbot.description}
                    </p>
                  )}
                  
                  {/* Channels */}
                  <div className="flex items-center space-x-2 mb-4">
                    <span className="text-xs text-gray-400">Channels:</span>
                    <div className="flex items-center space-x-1">
                      {getChannelIcons(chatbot.settings)}
                      {getChannelIcons(chatbot.settings).length === 0 && (
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
                    Created {formatDate(chatbot.created_at)}
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <Link href={`/dashboard/chatbots/${chatbot.id}`} className="flex-1">
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
        {chatbots.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Quick Stats</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-[rgba(31,32,36,0.8)] backdrop-blur-lg border border-blue-500/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Chatbots</p>
                      <p className="text-2xl font-bold text-blue-400">{chatbots.length}</p>
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
                        {chatbots.reduce((acc, bot) => {
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
=======
<<<<<<< Updated upstream
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
  MoreVertical,
} from 'lucide-react';

interface Chatbot {
  id: string;
  name: string;
  description?: string;
  model: string;
  settings: Record<string, unknown>;
  created_at: string;
}

export default function ChatbotsPage() {
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChatbots = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('chatbots')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          setError(error.message);
        } else {
          setChatbots(data || []);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchChatbots();

    // Set up real-time subscription for chatbots
    const subscription = supabase
      .channel('chatbots_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chatbots' }, () => {
        console.log('Chatbots table changed, refetching...');
        fetchChatbots();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const getChannelIcons = (settings: Record<string, unknown>) => {
    const channels = (settings?.channels as Record<string, boolean>) || {};
    const icons = [];

    if (channels.website) icons.push(<Globe key="website" className="w-4 h-4 text-blue-400" />);
    if (channels.facebook)
      icons.push(<Facebook key="facebook" className="w-4 h-4 text-blue-600" />);
    if (channels.instagram)
      icons.push(<Instagram key="instagram" className="w-4 h-4 text-purple-500" />);
    if (channels.whatsapp) icons.push(<Phone key="whatsapp" className="w-4 h-4 text-green-500" />);

    return icons;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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
                  Your Chatbots
                </span>
              </h1>
              <p className="text-gray-300">
                Manage and deploy your AI-powered chatbots across multiple channels
              </p>
            </div>
            <Link href="/dashboard/chatbots/create">
              <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:-translate-y-0.5">
                <Plus className="w-5 h-5 mr-2" />
                Create New Chatbot
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

        {/* Chatbots Grid */}
        {chatbots.length === 0 ? (
          <Card className="bg-[rgba(31,32,36,0.8)] backdrop-blur-lg border border-gray-600 rounded-2xl">
            <CardContent className="p-12 text-center">
              <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Bot className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">No chatbots yet</h3>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">
                Get started by creating your first AI chatbot. It only takes a few minutes to set up
                and deploy.
              </p>
              <Link href="/dashboard/chatbots/create">
                <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 transform hover:-translate-y-0.5">
                  <Plus className="w-5 h-5 mr-2" />
                  Create Your First Chatbot
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {chatbots.map(chatbot => (
              <Card
                key={chatbot.id}
                className="bg-[rgba(31,32,36,0.8)] backdrop-blur-lg border border-blue-500/10 rounded-xl hover:border-blue-500/30 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10"
              >
                <CardHeader className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <MessageSquare className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold text-white truncate">
                          {chatbot.name}
                        </CardTitle>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className="bg-green-500/20 text-green-400 text-xs border-green-500/30">
                            Active
                          </Badge>
                          <span className="text-xs text-gray-400">{chatbot.model}</span>
                        </div>
                      </div>
                    </div>
                    <Button className="text-gray-400 hover:text-white bg-transparent p-1">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-6 pt-0">
                  {chatbot.description && (
                    <p className="text-gray-300 text-sm mb-4 line-clamp-2">{chatbot.description}</p>
                  )}

                  {/* Channels */}
                  <div className="flex items-center space-x-2 mb-4">
                    <span className="text-xs text-gray-400">Channels:</span>
                    <div className="flex items-center space-x-1">
                      {getChannelIcons(chatbot.settings)}
                      {getChannelIcons(chatbot.settings).length === 0 && (
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
                    Created {formatDate(chatbot.created_at)}
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <Link href={`/dashboard/chatbots/${chatbot.id}`} className="flex-1">
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
        {chatbots.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Quick Stats</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-[rgba(31,32,36,0.8)] backdrop-blur-lg border border-blue-500/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Chatbots</p>
                      <p className="text-2xl font-bold text-blue-400">{chatbots.length}</p>
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
                        {chatbots.reduce((acc, bot) => {
                          const channels =
                            (bot.settings?.channels as Record<string, boolean>) || {};
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
=======
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
import { deleteChatbot } from './actions';

interface Chatbot {
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

export default function ChatbotsPage() {
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [chatbotToDelete, setChatbotToDelete] = useState<string | null>(null);

  useEffect(() => {
    const fetchChatbots = async () => {
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
          setChatbots(data || []);
          
          // Fetch connections for all chatbots
          if (data && data.length > 0) {
            const chatbotIds = data.map(chatbot => chatbot.id);
            const { data: connectionsData, error: connectionsError } = await supabase
              .from('connections')
              .select('*')
              .in('chatbot_id', chatbotIds);
              
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
    
    fetchChatbots();

    // Set up real-time subscription for chatbots
    const subscription = supabase
      .channel('chatbots_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'chatbots' },
        () => {
          console.log('Chatbots table changed, refetching...');
          fetchChatbots();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const getConnectionIcons = (chatbotId: string) => {
    const chatbotConnections = connections.filter(conn => conn.chatbot_id === chatbotId && conn.active);
    const icons = [];
    
    for (const conn of chatbotConnections) {
      switch (conn.platform) {
        case 'website':
          icons.push(<Globe key={`${chatbotId}-website`} className="w-4 h-4 text-blue-400" />);
          break;
        case 'facebook':
          icons.push(<Facebook key={`${chatbotId}-facebook`} className="w-4 h-4 text-blue-600" />);
          break;
        case 'instagram':
          icons.push(<Instagram key={`${chatbotId}-instagram`} className="w-4 h-4 text-purple-500" />);
          break;
        case 'whatsapp':
          icons.push(<Phone key={`${chatbotId}-whatsapp`} className="w-4 h-4 text-green-500" />);
          break;
        case 'slack':
          icons.push(<Slack key={`${chatbotId}-slack`} className="w-4 h-4 text-yellow-500" />);
          break;
        case 'twitter':
          icons.push(<Twitter key={`${chatbotId}-twitter`} className="w-4 h-4 text-blue-400" />);
          break;
        case 'email':
          icons.push(<Mail key={`${chatbotId}-email`} className="w-4 h-4 text-gray-400" />);
          break;
      }
    }
    
    return icons;
  };

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };
  
  const handleDeleteClick = (chatbotId: string) => {
    setChatbotToDelete(chatbotId);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteConfirm = async () => {
    if (!chatbotToDelete) return;
    
    try {
      await deleteChatbot(chatbotToDelete);
      setChatbots(chatbots.filter(chatbot => chatbot.id !== chatbotToDelete));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeleteDialogOpen(false);
      setChatbotToDelete(null);
    }
  };
  
  const getChatbotStatus = (chatbot: Chatbot) => {
    const status = chatbot.settings?.status as string || 'Active';
    
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
    <div className="w-full min-h-screen bg-[#0a0a0b] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent">
                  Your Chatbots
                </span>
              </h1>
              <p className="text-gray-300">Manage and deploy your AI-powered chatbots across multiple channels</p>
            </div>
            <Link href="/dashboard/chatbots/new">
              <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:-translate-y-0.5">
                <Plus className="w-5 h-5 mr-2" />
                Create New Chatbot
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

        {/* Chatbots Table */}
        {chatbots.length === 0 ? (
          <Card className="bg-[rgba(31,32,36,0.8)] backdrop-blur-lg border border-gray-600 rounded-2xl">
            <CardContent className="p-12 text-center">
              <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Bot className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">No chatbots yet</h3>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">
                Get started by creating your first AI chatbot. It only takes a few minutes to set up and deploy.
              </p>
              <Link href="/dashboard/chatbots/new">
                <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 transform hover:-translate-y-0.5">
                  <Plus className="w-5 h-5 mr-2" />
                  Create Your First Chatbot
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-[rgba(31,32,36,0.8)] backdrop-blur-lg border border-gray-600/50 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700/50 hover:bg-gray-800/50">
                  <TableHead className="text-gray-300">Chatbot Name</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300">Connected Channels</TableHead>
                  <TableHead className="text-gray-300">Last Updated</TableHead>
                  <TableHead className="text-gray-300 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chatbots.map((chatbot) => (
                  <TableRow key={chatbot.id} className="border-gray-700/50 hover:bg-gray-800/50">
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10 rounded-md bg-gradient-to-r from-blue-500 to-purple-600">
                          {chatbot.avatar_url ? (
                            <AvatarImage src={chatbot.avatar_url} alt={chatbot.name} />
                          ) : (
                            <AvatarFallback className="rounded-md bg-gradient-to-r from-blue-500 to-purple-600">
                              <MessageSquare className="h-5 w-5 text-white" />
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <div className="font-medium text-white">{chatbot.name}</div>
                          <div className="text-xs text-gray-400">{chatbot.model}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getChatbotStatus(chatbot)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        {getConnectionIcons(chatbot.id)}
                        {getConnectionIcons(chatbot.id).length === 0 && (
                          <span className="text-xs text-gray-500">None configured</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-400">
                      {formatDate(chatbot.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                          <Link href={`/dashboard/chatbots/${chatbot.id}`}>
                            <DropdownMenuItem className="text-gray-200 hover:text-white cursor-pointer">
                              <Edit3 className="mr-2 h-4 w-4" />
                              <span>Edit</span>
                            </DropdownMenuItem>
                          </Link>
                          <Link href={`/dashboard/analytics?chatbot=${chatbot.id}`}>
                            <DropdownMenuItem className="text-gray-200 hover:text-white cursor-pointer">
                              <BarChart className="mr-2 h-4 w-4" />
                              <span>View Analytics</span>
                            </DropdownMenuItem>
                          </Link>
                          <DropdownMenuItem 
                            className="text-red-400 hover:text-red-300 cursor-pointer"
                            onClick={() => handleDeleteClick(chatbot.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
        
        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-gray-800 border-gray-700 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                This action cannot be undone. This will permanently delete the chatbot
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
        {chatbots.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Quick Stats</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-[rgba(31,32,36,0.8)] backdrop-blur-lg border border-blue-500/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Chatbots</p>
                      <p className="text-2xl font-bold text-blue-400">{chatbots.length}</p>
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
                        {chatbots.reduce((acc, bot) => {
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
>>>>>>> Stashed changes
>>>>>>> Stashed changes
