'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Agent {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
}

export default function AgentTestPage() {
  const params = useParams();
  const agentId = params?.agentId as string;
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingAgent, setLoadingAgent] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);
  const supabase = createClientComponentClient();

  // Fetch agent details
  useEffect(() => {
    async function fetchAgent() {
      try {
        const { data, error } = await supabase
          .from('agents')
          .select('id, name, description, avatar_url')
          .eq('id', agentId)
          .single();

        if (error) {
          console.error('Error fetching agent:', error);
          return;
        }

        setAgent(data);
        // Add initial welcome message
        setMessages([{
          role: 'assistant',
          content: `👋 Hi! I'm ${data.name}. How can I help you today?`
        }]);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoadingAgent(false);
      }
    }

    if (agentId) {
      fetchAgent();
    }
  }, [agentId, supabase]);

  // Handle sending a message
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading || !agent) return;

    const userMsg: Message = { role: 'user', content: input };
    setMessages((msgs) => [...msgs, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Call the agent chat API
      const response = await fetch('/api/agents/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: agent.id,
          message: input,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      setMessages((msgs) => [
        ...msgs,
        { role: 'assistant', content: data.reply },
      ]);
    } catch (error) {
      console.error('Error getting response:', error);
      setMessages((msgs) => [
        ...msgs,
        {
          role: 'assistant',
          content: 'I apologize, but I\'m having trouble connecting right now. Please try again in a moment.',
        },
      ]);
    } finally {
      setLoading(false);
      
      // Scroll to bottom of chat
      setTimeout(() => {
        chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    }
  }

  if (loadingAgent) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <h1 className="text-2xl font-bold mb-4">Agent Not Found</h1>
            <p>The agent you're looking for doesn't exist or you don't have permission to access it.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card className="border shadow-md">
        <CardContent className="p-0">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-lg">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
                {agent.avatar_url ? (
                  <img src={agent.avatar_url} alt={agent.name} className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                    {agent.name.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <div className="font-semibold text-white text-lg">{agent.name}</div>
                <div className="text-xs text-white/90 flex items-center space-x-1.5">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span>Testing Mode</span>
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div 
            ref={chatRef} 
            className="h-[500px] overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900"
          >
            {messages.map((msg, i) => (
              <div key={`${msg.role}-${i}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] p-3.5 rounded-2xl shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] p-3.5 rounded-2xl bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-sm">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-75"></div>
                    <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce delay-150"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 rounded-b-lg">
            <div className="flex space-x-2">
              <Input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1"
                disabled={loading}
              />
              <Button 
                type="submit" 
                disabled={loading || !input.trim()}
                className="bg-gradient-to-r from-blue-600 to-purple-600"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
                  </svg>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}