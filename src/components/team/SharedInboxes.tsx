'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Inbox, MessageSquare, Users, Clock, Filter, Search, MoreVertical, User, Tag, Archive, Reply, Forward } from 'lucide-react';

interface Conversation {
  id: string;
  subject: string;
  customer: {
    name: string;
    email: string;
    avatar?: string;
  };
  channel: 'whatsapp' | 'facebook' | 'instagram' | 'website' | 'email';
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  lastMessage: {
    content: string;
    timestamp: Date;
    sender: 'customer' | 'agent';
  };
  tags: string[];
  unreadCount: number;
  createdAt: Date;
  slaStatus: 'on-time' | 'warning' | 'overdue';
  slaDeadline: Date;
}

interface SharedInbox {
  id: string;
  name: string;
  description: string;
  channels: string[];
  assignedAgents: string[];
  conversationCount: number;
  unreadCount: number;
  avgResponseTime: number; // in minutes
  color: string;
}

const defaultInboxes: SharedInbox[] = [
  {
    id: 'general',
    name: 'General Support',
    description: 'General customer inquiries and support requests',
    channels: ['website', 'email'],
    assignedAgents: ['agent1', 'agent2', 'agent3'],
    conversationCount: 45,
    unreadCount: 12,
    avgResponseTime: 15,
    color: 'bg-blue-500'
  },
  {
    id: 'sales',
    name: 'Sales Inquiries',
    description: 'Sales questions and lead qualification',
    channels: ['whatsapp', 'facebook', 'website'],
    assignedAgents: ['agent2', 'agent4'],
    conversationCount: 28,
    unreadCount: 8,
    avgResponseTime: 8,
    color: 'bg-green-500'
  },
  {
    id: 'technical',
    name: 'Technical Support',
    description: 'Technical issues and troubleshooting',
    channels: ['email', 'website'],
    assignedAgents: ['agent1', 'agent3'],
    conversationCount: 19,
    unreadCount: 5,
    avgResponseTime: 25,
    color: 'bg-purple-500'
  },
  {
    id: 'social',
    name: 'Social Media',
    description: 'Social media interactions and DMs',
    channels: ['facebook', 'instagram'],
    assignedAgents: ['agent4'],
    conversationCount: 33,
    unreadCount: 15,
    avgResponseTime: 12,
    color: 'bg-pink-500'
  }
];

const sampleConversations: Conversation[] = [
  {
    id: '1',
    subject: 'Integration Help Needed',
    customer: {
      name: 'Alice Johnson',
      email: 'alice@company.com'
    },
    channel: 'website',
    status: 'open',
    priority: 'high',
    assignedTo: 'agent1',
    lastMessage: {
      content: 'I need help setting up the WhatsApp integration for my business',
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
      sender: 'customer'
    },
    tags: ['integration', 'whatsapp'],
    unreadCount: 2,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    slaStatus: 'warning',
    slaDeadline: new Date(Date.now() + 1000 * 60 * 45)
  },
  {
    id: '2',
    subject: 'Billing Question',
    customer: {
      name: 'Bob Smith',
      email: 'bob@startup.io'
    },
    channel: 'email',
    status: 'pending',
    priority: 'medium',
    lastMessage: {
      content: 'Can you explain the pricing tiers for your platform?',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      sender: 'customer'
    },
    tags: ['billing', 'pricing'],
    unreadCount: 1,
    createdAt: new Date(Date.now() - 1000 * 60 * 60),
    slaStatus: 'on-time',
    slaDeadline: new Date(Date.now() + 1000 * 60 * 60 * 2)
  },
  {
    id: '3',
    subject: 'Feature Request',
    customer: {
      name: 'Carol Davis',
      email: 'carol@enterprise.com'
    },
    channel: 'whatsapp',
    status: 'open',
    priority: 'low',
    assignedTo: 'agent2',
    lastMessage: {
      content: 'Would love to see analytics export feature',
      timestamp: new Date(Date.now() - 1000 * 60 * 45),
      sender: 'customer'
    },
    tags: ['feature-request', 'analytics'],
    unreadCount: 0,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
    slaStatus: 'on-time',
    slaDeadline: new Date(Date.now() + 1000 * 60 * 60 * 4)
  }
];

export default function SharedInboxes() {
  const [inboxes] = useState<SharedInbox[]>(defaultInboxes);
  const [selectedInbox, setSelectedInbox] = useState<SharedInbox>(defaultInboxes[0]);
  const [conversations, setConversations] = useState<Conversation[]>(sampleConversations);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const getChannelIcon = (channel: string) => {
    const icons = {
      whatsapp: '📱',
      facebook: '📘',
      instagram: '📷',
      website: '🌐',
      email: '📧'
    };
    return icons[channel as keyof typeof icons] || '💬';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'resolved': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'closed': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getSlaStatusColor = (status: string) => {
    switch (status) {
      case 'on-time': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'overdue': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         conv.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         conv.customer.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || conv.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || conv.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      <div className="flex h-screen">
        {/* Sidebar - Inboxes */}
        <div className="w-80 bg-[#141517] border-r border-gray-800 flex flex-col">
          <div className="p-6 border-b border-gray-800">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Shared Inboxes
            </h1>
            <p className="text-gray-400 text-sm mt-1">Manage team conversations</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {inboxes.map((inbox) => (
              <Card
                key={inbox.id}
                className={`cursor-pointer transition-all duration-200 ${
                  selectedInbox.id === inbox.id
                    ? 'bg-blue-600/20 border-blue-500/50'
                    : 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-800/70'
                }`}
                onClick={() => setSelectedInbox(inbox)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 ${inbox.color} rounded-full`}></div>
                      <h3 className="font-semibold text-white">{inbox.name}</h3>
                    </div>
                    {inbox.unreadCount > 0 && (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                        {inbox.unreadCount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm mb-3">{inbox.description}</p>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{inbox.conversationCount} conversations</span>
                    <span>~{inbox.avgResponseTime}m avg</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Main Content - Conversations */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-[#141517] border-b border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 ${selectedInbox.color} rounded-full`}></div>
                <h2 className="text-xl font-bold text-white">{selectedInbox.name}</h2>
                <Badge className="bg-gray-600/20 text-gray-300">
                  {filteredConversations.length} conversations
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-400 hover:text-white transition-colors">
                  <Archive size={20} />
                </button>
                <button className="p-2 text-gray-400 hover:text-white transition-colors">
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Priority</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No conversations found</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`p-6 hover:bg-gray-800/30 cursor-pointer transition-colors ${
                      selectedConversation?.id === conversation.id ? 'bg-blue-600/10' : ''
                    }`}
                    onClick={() => setSelectedConversation(conversation)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {conversation.customer.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{conversation.customer.name}</h3>
                          <p className="text-gray-400 text-sm">{conversation.customer.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">{getChannelIcon(conversation.channel)}</span>
                        <span className="text-gray-400 text-sm">{formatTime(conversation.lastMessage.timestamp)}</span>
                        {conversation.unreadCount > 0 && (
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <h4 className="font-medium text-white mb-2">{conversation.subject}</h4>
                    <p className="text-gray-300 text-sm mb-3 line-clamp-2">
                      {conversation.lastMessage.content}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(conversation.status)}>
                          {conversation.status}
                        </Badge>
                        <Badge className={getPriorityColor(conversation.priority)}>
                          {conversation.priority}
                        </Badge>
                        {conversation.assignedTo && (
                          <Badge variant="secondary" className="flex items-center space-x-1">
                            <User size={12} />
                            <span>Assigned</span>
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock size={14} className={getSlaStatusColor(conversation.slaStatus)} />
                        <span className={`text-xs ${getSlaStatusColor(conversation.slaStatus)}`}>
                          SLA: {formatTime(conversation.slaDeadline)}
                        </span>
                      </div>
                    </div>

                    {conversation.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {conversation.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs flex items-center space-x-1">
                            <Tag size={10} />
                            <span>{tag}</span>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Conversation Detail Panel */}
        {selectedConversation && (
          <div className="w-96 bg-[#141517] border-l border-gray-800 flex flex-col">
            <div className="p-6 border-b border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white">Conversation Details</h3>
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400">Customer</label>
                  <p className="text-white font-medium">{selectedConversation.customer.name}</p>
                  <p className="text-gray-300 text-sm">{selectedConversation.customer.email}</p>
                </div>

                <div>
                  <label className="text-sm text-gray-400">Status</label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(selectedConversation.status)}>
                      {selectedConversation.status}
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-400">Priority</label>
                  <div className="mt-1">
                    <Badge className={getPriorityColor(selectedConversation.priority)}>
                      {selectedConversation.priority}
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-400">Assigned To</label>
                  <p className="text-white">{selectedConversation.assignedTo || 'Unassigned'}</p>
                </div>

                <div>
                  <label className="text-sm text-gray-400">SLA Status</label>
                  <p className={getSlaStatusColor(selectedConversation.slaStatus)}>
                    {selectedConversation.slaStatus} - Due {formatTime(selectedConversation.slaDeadline)}
                  </p>
                </div>

                <div>
                  <label className="text-sm text-gray-400">Tags</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedConversation.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 p-6">
              <div className="space-y-3">
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2">
                  <Reply size={16} />
                  <span>Reply</span>
                </button>
                <button className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2">
                  <Forward size={16} />
                  <span>Forward</span>
                </button>
                <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  Mark as Resolved
                </button>
                <button className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors">
                  Assign to Me
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
