'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, Globe, Users, Bot, Settings, BarChart3, MessageSquare, 
  Zap, Shield, CreditCard, FileText, Home, User, Database,
  ArrowRight, ExternalLink, Copy, CheckCircle
} from 'lucide-react';

interface Route {
  path: string;
  name: string;
  description: string;
  category: 'Core' | 'Dashboard' | 'Agent Management' | 'Integrations' | 'Admin' | 'API' | 'Auth';
  status: 'Active' | 'Development' | 'Planned';
  icon: React.ReactNode;
  subRoutes?: Route[];
}

const routes: Route[] = [
  // Core Routes
  {
    path: '/',
    name: 'Landing Page',
    description: 'Main landing page with hero section and features',
    category: 'Core',
    status: 'Active',
    icon: <Home className="w-4 h-4" />
  },
  {
    path: '/about-us',
    name: 'About Us',
    description: 'Company information and team details',
    category: 'Core',
    status: 'Active',
    icon: <Users className="w-4 h-4" />
  },
  {
    path: '/pricing',
    name: 'Pricing',
    description: 'Subscription plans and pricing tiers',
    category: 'Core',
    status: 'Active',
    icon: <CreditCard className="w-4 h-4" />
  },

  // Authentication
  {
    path: '/auth/signin',
    name: 'Sign In',
    description: 'User authentication and login',
    category: 'Auth',
    status: 'Active',
    icon: <User className="w-4 h-4" />
  },
  {
    path: '/auth/signup',
    name: 'Sign Up',
    description: 'User registration and account creation',
    category: 'Auth',
    status: 'Active',
    icon: <User className="w-4 h-4" />
  },

  // Dashboard Routes
  {
    path: '/dashboard',
    name: 'Main Dashboard',
    description: 'Overview of user agents, analytics, and quick actions',
    category: 'Dashboard',
    status: 'Active',
    icon: <BarChart3 className="w-4 h-4" />,
    subRoutes: [
      {
        path: '/dashboard/agents',
        name: 'Agents Management',
        description: 'Create, edit, and manage AI agents',
        category: 'Agent Management',
        status: 'Active',
        icon: <Bot className="w-4 h-4" />
      },
      {
        path: '/dashboard/analytics',
        name: 'Analytics',
        description: 'Performance metrics and usage statistics',
        category: 'Dashboard',
        status: 'Active',
        icon: <BarChart3 className="w-4 h-4" />
      }
    ]
  },

  // Agent Management
  {
    path: '/agents/[id]',
    name: 'Agent Details',
    description: 'Individual agent configuration and management',
    category: 'Agent Management',
    status: 'Active',
    icon: <Bot className="w-4 h-4" />,
    subRoutes: [
      {
        path: '/agents/[id]/dashboard',
        name: 'Agent Dashboard',
        description: 'Live conversations, analytics, and performance metrics',
        category: 'Agent Management',
        status: 'Active',
        icon: <BarChart3 className="w-4 h-4" />
      },
      {
        path: '/agents/[id]/configure',
        name: 'Agent Configuration',
        description: 'Settings, integrations, knowledge base, and advanced options',
        category: 'Agent Management',
        status: 'Active',
        icon: <Settings className="w-4 h-4" />
      },
      {
        path: '/agents/[id]/test',
        name: 'Agent Testing',
        description: 'Test agent responses and behavior',
        category: 'Agent Management',
        status: 'Active',
        icon: <MessageSquare className="w-4 h-4" />
      }
    ]
  },

  // Templates
  {
    path: '/templates',
    name: 'Agent Templates',
    description: 'Pre-built agent templates for different use cases',
    category: 'Agent Management',
    status: 'Active',
    icon: <FileText className="w-4 h-4" />
  },

  // Integrations
  {
    path: '/connections',
    name: 'Connections',
    description: 'Manage platform integrations and API connections',
    category: 'Integrations',
    status: 'Active',
    icon: <Zap className="w-4 h-4" />
  },

  // User Management
  {
    path: '/profile',
    name: 'User Profile',
    description: 'User account settings and preferences',
    category: 'Core',
    status: 'Active',
    icon: <User className="w-4 h-4" />
  },

  // Admin Routes
  {
    path: '/admin',
    name: 'Admin Dashboard',
    description: 'Administrative controls and system management',
    category: 'Admin',
    status: 'Active',
    icon: <Shield className="w-4 h-4" />,
    subRoutes: [
      {
        path: '/admin/users',
        name: 'User Management',
        description: 'Manage user accounts and permissions',
        category: 'Admin',
        status: 'Development',
        icon: <Users className="w-4 h-4" />
      },
      {
        path: '/admin/routing',
        name: 'Routing Overview',
        description: 'Platform routing structure and navigation',
        category: 'Admin',
        status: 'Active',
        icon: <Globe className="w-4 h-4" />
      },
      {
        path: '/admin/system',
        name: 'System Settings',
        description: 'Platform configuration and system settings',
        category: 'Admin',
        status: 'Planned',
        icon: <Settings className="w-4 h-4" />
      }
    ]
  },

  // API Routes
  {
    path: '/api/agents',
    name: 'Agents API',
    description: 'CRUD operations for agent management',
    category: 'API',
    status: 'Active',
    icon: <Database className="w-4 h-4" />
  },
  {
    path: '/api/integrations/telegram',
    name: 'Telegram Integration API',
    description: 'Webhook handling for Telegram bot messages',
    category: 'API',
    status: 'Active',
    icon: <MessageSquare className="w-4 h-4" />
  },
  {
    path: '/api/integrations/whatsapp',
    name: 'WhatsApp Integration API',
    description: 'Webhook handling for WhatsApp Business messages',
    category: 'API',
    status: 'Development',
    icon: <MessageSquare className="w-4 h-4" />
  },
  {
    path: '/api/auth',
    name: 'Authentication API',
    description: 'User authentication and session management',
    category: 'API',
    status: 'Active',
    icon: <Shield className="w-4 h-4" />
  }
];

export default function AdminRoutingPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [copiedPath, setCopiedPath] = useState<string>('');

  const categories = ['All', ...Array.from(new Set(routes.map(r => r.category)))];
  
  const filteredRoutes = routes.filter(route => {
    const matchesSearch = route.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         route.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         route.path.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || route.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Development': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'Planned': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'Core': 'bg-blue-500/20 text-blue-400',
      'Dashboard': 'bg-purple-500/20 text-purple-400',
      'Agent Management': 'bg-green-500/20 text-green-400',
      'Integrations': 'bg-orange-500/20 text-orange-400',
      'Admin': 'bg-red-500/20 text-red-400',
      'API': 'bg-cyan-500/20 text-cyan-400',
      'Auth': 'bg-yellow-500/20 text-yellow-400'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-500/20 text-gray-400';
  };

  const copyToClipboard = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(''), 2000);
  };

  const routeStats = {
    total: routes.length,
    active: routes.filter(r => r.status === 'Active').length,
    development: routes.filter(r => r.status === 'Development').length,
    planned: routes.filter(r => r.status === 'Planned').length
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent mb-4">
            Platform Routing Overview
          </h1>
          <p className="text-gray-400 text-lg">
            Complete navigation structure and API endpoints for the Intaj platform
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-[#141517]/50 backdrop-blur-xl border-gray-800/50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-white mb-1">{routeStats.total}</div>
              <div className="text-xs text-gray-400">Total Routes</div>
            </CardContent>
          </Card>
          <Card className="bg-[#141517]/50 backdrop-blur-xl border-gray-800/50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-400 mb-1">{routeStats.active}</div>
              <div className="text-xs text-gray-400">Active</div>
            </CardContent>
          </Card>
          <Card className="bg-[#141517]/50 backdrop-blur-xl border-gray-800/50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-400 mb-1">{routeStats.development}</div>
              <div className="text-xs text-gray-400">In Development</div>
            </CardContent>
          </Card>
          <Card className="bg-[#141517]/50 backdrop-blur-xl border-gray-800/50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-400 mb-1">{routeStats.planned}</div>
              <div className="text-xs text-gray-400">Planned</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search routes, descriptions, or paths..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-800/50 border-gray-700 text-white"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className={selectedCategory === category 
                  ? "bg-blue-600 hover:bg-blue-700" 
                  : "border-gray-600 text-gray-300 hover:border-blue-500"
                }
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Routes Grid */}
        <div className="space-y-6">
          {filteredRoutes.map((route) => (
            <Card key={route.path} className="bg-[#141517]/50 backdrop-blur-xl border-gray-800/50 hover:border-gray-700/50 transition-all duration-300">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      {route.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg text-white">{route.name}</CardTitle>
                      <CardDescription className="text-gray-400">
                        {route.description}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getCategoryColor(route.category)}>
                      {route.category}
                    </Badge>
                    <Badge className={getStatusColor(route.status)}>
                      {route.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Main Route Path */}
                  <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <code className="text-sm text-cyan-400 bg-gray-900/50 px-2 py-1 rounded">
                        {route.path}
                      </code>
                      {route.path.startsWith('/api') && (
                        <Badge className="bg-orange-500/20 text-orange-400 text-xs">
                          API
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(route.path)}
                        className="text-gray-400 hover:text-white"
                      >
                        {copiedPath === route.path ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                      {!route.path.startsWith('/api') && route.status === 'Active' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(route.path, '_blank')}
                          className="text-gray-400 hover:text-white"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Sub Routes */}
                  {route.subRoutes && route.subRoutes.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-400 mb-2">
                        <ArrowRight className="w-4 h-4 mr-1" />
                        Sub Routes
                      </div>
                      {route.subRoutes.map((subRoute) => (
                        <div key={subRoute.path} className="flex items-center justify-between p-2 bg-gray-900/30 rounded-lg ml-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-6 h-6 bg-gray-700 rounded flex items-center justify-center">
                              {subRoute.icon}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-white">{subRoute.name}</div>
                              <code className="text-xs text-cyan-400">{subRoute.path}</code>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getStatusColor(subRoute.status)} size="sm">
                              {subRoute.status}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(subRoute.path)}
                              className="text-gray-400 hover:text-white"
                            >
                              {copiedPath === subRoute.path ? (
                                <CheckCircle className="w-3 h-3" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredRoutes.length === 0 && (
          <div className="text-center py-12">
            <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No routes found</h3>
            <p className="text-gray-400">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>
    </div>
  );
}
