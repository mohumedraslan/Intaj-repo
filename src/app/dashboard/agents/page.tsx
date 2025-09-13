'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabaseClient';
import { Bot, Plus, Settings, Trash2, ExternalLink } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  description?: string;
  model: string;
  base_prompt?: string;
  settings: Record<string, unknown>;
  created_at: string;
  avatar_url?: string;
}

export default function AgentsPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        const { data, error } = await supabase
          .from('agents')
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
  }, [router]);

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#0a0a0b] text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-48 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 bg-gray-700 rounded-xl"></div>
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">
            <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent">
              AI Agents
            </span>
          </h1>
          <Link href="/dashboard/agents/new">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Create New Agent
            </Button>
          </Link>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-md p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {agents.length === 0 ? (
          <Card className="bg-[rgba(31,32,36,0.8)] backdrop-blur-lg border border-gray-600/50 rounded-xl">
            <CardContent className="p-12 text-center">
              <Bot className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No agents yet</h3>
              <p className="text-gray-400 mb-6">
                Create your first AI agent to get started with automated conversations.
              </p>
              <Link href="/dashboard/agents/new">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Agent
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <Card key={agent.id} className="bg-[rgba(31,32,36,0.8)] backdrop-blur-lg border border-gray-600/50 rounded-xl hover:border-blue-500/50 transition-colors">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600">
                        {agent.avatar_url ? (
                          <AvatarImage src={agent.avatar_url} alt={agent.name} className="rounded-xl" />
                        ) : (
                          <AvatarFallback className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-600">
                            <Bot className="h-6 w-6 text-white" />
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg font-semibold">{agent.name}</CardTitle>
                        <Badge variant="secondary" className="mt-1">
                          {agent.model}
                        </Badge>
                      </div>
                    </div>
                    <Badge 
                      variant={agent.settings?.status === 'active' ? 'default' : 'secondary'}
                      className={agent.settings?.status === 'active' ? 'bg-green-600' : ''}
                    >
                      {(agent.settings?.status as string) || 'active'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                    {agent.description || 'No description provided'}
                  </p>
                  <div className="text-xs text-gray-500 mb-4">
                    Created {new Date(agent.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex space-x-2">
                    <Link href={`/dashboard/agents/${agent.id}`} className="flex-1">
                      <Button className="w-full border border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent">
                        <Settings className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </Link>
                    <Link href={`/dashboard/agents/${agent.id}/test`}>
                      <Button className="border border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
