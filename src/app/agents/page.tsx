'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import '@/styles/agents.css';

type AgentStatus = 'online' | 'training' | 'offline';
type AgentType = 'chatbot' | 'sales' | 'marketing' | 'all';

interface AgentStats {
  key: string;
  value: string | number;
  label: string;
  color: string;
}

interface Agent {
  id: string;
  name: string;
  type: Exclude<AgentType, 'all'>;
  role: string;
  status: AgentStatus;
  avatar: React.ReactNode;
  message: string;
  activity: string;
  stats: AgentStats[];
  gradientClass: string;
  hoverBorderClass: string;
}

export default function AgentsPage() {
  const [selectedType, setSelectedType] = useState<AgentType>('all');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overallStats, setOverallStats] = useState({
    activeAgents: 0,
    conversationsToday: 0,
    avgResponseTime: '0s',
    resolutionRate: 0
  });

  useEffect(() => {
    const fetchUserAgents = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setError('Please log in to view your agents');
          setLoading(false);
          return;
        }

        // Fetch user's chatbots as agents
        const { data: chatbots, error: chatbotsError } = await supabase
          .from('chatbots')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (chatbotsError) {
          setError(chatbotsError.message);
          setLoading(false);
          return;
        }

        // Fetch messages for statistics
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .in('chatbot_id', chatbots?.map(bot => bot.id) || [])
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        if (messagesError) {
          console.error('Error fetching messages:', messagesError);
        }

        // Transform chatbots into agents
        const transformedAgents: Agent[] = chatbots?.map((chatbot, index) => {
          const botMessages = messages?.filter(msg => msg.chatbot_id === chatbot.id) || [];
          const todayMessages = botMessages.length;
          const avgResponseTime = '1.2s'; // Placeholder - would need more complex calculation
          
          const agentType: Exclude<AgentType, 'all'> = 
            chatbot.name.toLowerCase().includes('sales') ? 'sales' :
            chatbot.name.toLowerCase().includes('marketing') ? 'marketing' : 'chatbot';

          return {
            id: chatbot.id,
            name: chatbot.name,
            type: agentType,
            role: chatbot.description || `${agentType === 'chatbot' ? 'Customer Support' : agentType === 'sales' ? 'Sales' : 'Marketing'} Agent`,
            status: (chatbot.status === 'active' ? 'online' : 'offline') as AgentStatus,
            avatar: getAgentAvatar(agentType),
            message: chatbot.settings?.welcome_message || "How can I help you today?",
            activity: chatbot.status === 'active' ? 
              (agentType === 'sales' ? 'Qualifying leads...' : 
               agentType === 'marketing' ? 'Creating content...' : 
               'Helping customers...') : 'Offline',
            stats: [
              { key: "chats", value: todayMessages.toString(), label: "Chats Today", color: "text-blue-400" },
              { key: "satisfaction", value: "94%", label: "Satisfaction", color: "text-green-400" },
              { key: "response", value: avgResponseTime, label: "Avg Response", color: "text-cyan-400" }
            ],
            gradientClass: agentType === 'sales' ? 'gradient-sales' : 
                          agentType === 'marketing' ? 'gradient-marketing' : 'gradient-neural',
            hoverBorderClass: agentType === 'sales' ? 'hover:border-orange-500/50' :
                             agentType === 'marketing' ? 'hover:border-green-500/50' : 'hover:border-blue-500/50'
          };
        }) || [];

        setAgents(transformedAgents);

        // Calculate overall stats
        const activeCount = transformedAgents.filter(agent => agent.status === 'online').length;
        const totalMessages = messages?.length || 0;
        const avgResolution = transformedAgents.length > 0 ? 
          Math.round(transformedAgents.reduce((acc, agent) => acc + 94, 0) / transformedAgents.length) : 0;

        setOverallStats({
          activeAgents: activeCount,
          conversationsToday: totalMessages,
          avgResponseTime: '1.2s',
          resolutionRate: avgResolution
        });

      } catch (err) {
        setError('Failed to fetch agents data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserAgents();
  }, []);

  const getAgentAvatar = (type: Exclude<AgentType, 'all'>) => {
    if (type === 'sales') {
      return (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
        </svg>
      );
    } else if (type === 'marketing') {
      return (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
        </svg>
      );
    } else {
      return (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
        </svg>
      );
    }
  };

  // Template agents for when user has no chatbots
  const templateAgents: Agent[] = [
    {
      id: '1',
      name: 'Support Assistant',
      type: 'chatbot',
      role: 'Customer Support Chatbot',
      status: 'online',
      avatar: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
        </svg>
      ),
      message: "How can I help you with your account today? I can assist with billing, technical issues, and general questions.",
      activity: "Helping customers...",
      stats: [
        { key: "chats", value: "142", label: "Chats Today", color: "text-blue-400" },
        { key: "satisfaction", value: "96%", label: "Satisfaction", color: "text-green-400" },
        { key: "response", value: "0.8s", label: "Avg Response", color: "text-cyan-400" }
      ],
      gradientClass: "gradient-neural",
      hoverBorderClass: "hover:border-blue-500/50"
    },
    {
      id: '2',
      name: 'Sales Pro',
      type: 'sales',
      role: 'Lead Qualification Agent',
      status: 'online',
      avatar: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
        </svg>
      ),
      message: "I'd love to show you how our platform can increase your sales by 40%. What's your biggest challenge right now?",
      activity: "Qualifying leads...",
      stats: [
        { key: "leads", value: "23", label: "Leads Today", color: "text-orange-400" },
        { key: "conversion", value: "67%", label: "Conversion", color: "text-green-400" },
        { key: "revenue", value: "$2.4k", label: "Revenue", color: "text-yellow-400" }
      ],
      gradientClass: "gradient-sales",
      hoverBorderClass: "hover:border-orange-500/50"
    },
    {
      id: '3',
      name: 'Marketing Guru',
      type: 'marketing',
      role: 'Content & Campaign Agent',
      status: 'training',
      avatar: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
        </svg>
      ),
      message: "Just generated 5 social media posts and 2 email campaigns for your product launch. Want to review them?",
      activity: "Creating content...",
      stats: [
        { key: "content", value: "18", label: "Content Pieces", color: "text-green-400" },
        { key: "engagement", value: "4.2%", label: "Engagement", color: "text-purple-400" },
        { key: "reach", value: "1.2k", label: "Reach", color: "text-cyan-400" }
      ],
      gradientClass: "gradient-marketing",
      hoverBorderClass: "hover:border-green-500/50"
    }
  ];

  const statsDisplay = [
    {
      value: overallStats.activeAgents.toString(),
      label: "Active Agents",
      status: { type: 'online' as AgentStatus, text: 'All Online' }
    },
    {
      value: overallStats.conversationsToday.toString(),
      label: "Conversations Today",
      trend: { value: '+12%', text: 'vs yesterday', color: 'text-cyan-400' }
    },
    {
      value: overallStats.avgResponseTime,
      label: "Avg Response Time",
      trend: { value: '-0.3s', text: 'improvement', color: 'text-green-400' }
    },
    {
      value: `${overallStats.resolutionRate}%`,
      label: "Resolution Rate",
      trend: { value: '', text: 'Above target', color: 'text-blue-400' }
    }
  ];

  const agentTypes: { type: AgentType; label: string; hoverBorder: string }[] = [
    { type: 'all', label: 'All Agents', hoverBorder: 'hover:border-blue-500' },
    { type: 'chatbot', label: 'Chatbots', hoverBorder: 'hover:border-blue-500' },
    { type: 'sales', label: 'Sales Agents', hoverBorder: 'hover:border-orange-500' },
    { type: 'marketing', label: 'Marketing Agents', hoverBorder: 'hover:border-green-500' }
  ];

  const filteredAgents = agents.filter(
    agent => selectedType === 'all' || agent.type === selectedType
  );

  return (
    <div className="min-h-screen neural-grid pt-24 pb-12">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-float delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl animate-float animation-delay-4000"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Header Section */}
        <div className="mb-12 animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-2">
                <span className="text-gradient">AI Agents</span> Control Center
              </h1>
              <p className="text-xl text-gray-300">Manage your intelligent workforce of AI agents</p>
            </div>
            <button className="gradient-neural px-8 py-3 rounded-lg text-white font-semibold hover:opacity-90 transition-all duration-300 transform hover:-translate-y-1 shadow-lg">
              <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              Create New Agent
            </button>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            {statsDisplay.map((stat, index) => (
              <div key={index} className="glass-card p-6 rounded-xl text-center">
                <div className="text-3xl font-bold text-gradient mb-2">{stat.value}</div>
                <div className="text-gray-300 text-sm">{stat.label}</div>
                {'status' in stat ? (
                  <div className="flex items-center justify-center mt-2">
                    <div className={`w-2 h-2 agent-status-${stat.status.type} rounded-full animate-pulse mr-2`}></div>
                    <span className="text-xs text-green-400">{stat.status.text}</span>
                  </div>
                ) : 'trend' in stat ? (
                  <div className={`text-xs ${stat.trend.color} mt-2`}>
                    {stat.trend.value} {stat.trend.text}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          {/* Agent Type Tabs */}
          <div className="flex space-x-4 mb-8 overflow-x-auto">
            {agentTypes.map(({ type, label, hoverBorder }) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`agent-tab px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
                  selectedType === type
                    ? 'bg-blue-600/20 border border-blue-500 text-blue-300'
                    : `bg-bg-tertiary border border-gray-600 text-gray-300 ${hoverBorder}`
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Agents Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredAgents.map((agent) => (
            <div
              key={agent.id}
              className={`agent-card glass-card p-8 rounded-2xl transition-all duration-300 transform hover:-translate-y-2 animate-slide-up ${agent.hoverBorderClass}`}
              data-type={agent.type}
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 ${agent.type === 'sales' ? 'sales-avatar' : agent.type === 'marketing' ? 'marketing-avatar' : 'agent-avatar'} rounded-full flex items-center justify-center animate-pulse-ai`}>
                    {agent.avatar}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-1">{agent.name}</h3>
                    <p className="text-gray-400 text-sm">{agent.role}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 agent-status-${agent.status} rounded-full ${agent.status !== 'offline' ? 'animate-pulse' : ''}`}></div>
                  <span className={`text-xs ${
                    agent.status === 'online' ? 'text-green-400' :
                    agent.status === 'training' ? 'text-yellow-400' :
                    'text-gray-400'
                  }`}>
                    {agent.status === 'online' ? 'Online' :
                     agent.status === 'training' ? 'Training' :
                     'Offline'}
                  </span>
                </div>
              </div>

              <div className="bg-bg-tertiary rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-2 mb-2">
                  <div className={`w-6 h-6 ${
                    agent.type === 'sales' ? 'bg-orange-500' :
                    agent.type === 'marketing' ? 'bg-green-500' :
                    'bg-blue-500'
                  } rounded-full ${agent.status !== 'offline' ? 'animate-bot-thinking' : ''}`}></div>
                  <span className="text-sm text-gray-300 animate-typing">{agent.activity}</span>
                </div>
                <div className={`${
                  agent.type === 'sales' ? 'bg-orange-500/20' :
                  agent.type === 'marketing' ? 'bg-green-500/20' :
                  'bg-blue-500/20'
                } rounded-lg p-3 text-sm`}>
                  {agent.message}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                {agent.stats.map((stat) => (
                  <div key={stat.key} className="text-center">
                    <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
                    <div className="text-xs text-gray-400">{stat.label}</div>
                  </div>
                ))}
              </div>

              <div className="flex space-x-2">
                <button className={`flex-1 ${agent.gradientClass} px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity`}>
                  Configure
                </button>
                <button className={`px-4 py-2 bg-bg-tertiary border border-gray-600 text-gray-300 rounded-lg text-sm hover:border-${
                  agent.type === 'sales' ? 'orange' :
                  agent.type === 'marketing' ? 'green' :
                  'blue'
                }-500 transition-colors`}>
                  {agent.type === 'sales' ? 'Pipeline' :
                   agent.type === 'marketing' ? 'Campaigns' :
                   'Analytics'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
