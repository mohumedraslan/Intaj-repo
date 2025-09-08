'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, AlertTriangle, CheckCircle, TrendingUp, TrendingDown, Target, Users, MessageSquare } from 'lucide-react';

interface SLAMetric {
  id: string;
  name: string;
  description: string;
  target: number; // in minutes
  current: number; // in minutes
  status: 'meeting' | 'warning' | 'breach';
  trend: 'up' | 'down' | 'stable';
  conversations: number;
  breaches: number;
}

interface SLAAlert {
  id: string;
  conversationId: string;
  customerName: string;
  subject: string;
  timeRemaining: number; // in minutes
  severity: 'warning' | 'critical' | 'breach';
  assignedTo?: string;
  channel: string;
}

interface TeamPerformance {
  agentId: string;
  agentName: string;
  avgResponseTime: number;
  slaCompliance: number;
  conversationsHandled: number;
  breaches: number;
  status: 'excellent' | 'good' | 'needs-improvement';
}

const slaMetrics: SLAMetric[] = [
  {
    id: 'first-response',
    name: 'First Response Time',
    description: 'Time to first agent response',
    target: 15,
    current: 12,
    status: 'meeting',
    trend: 'down',
    conversations: 156,
    breaches: 8
  },
  {
    id: 'resolution-time',
    name: 'Resolution Time',
    description: 'Time to resolve conversation',
    target: 120,
    current: 98,
    status: 'meeting',
    trend: 'down',
    conversations: 89,
    breaches: 12
  },
  {
    id: 'escalation-time',
    name: 'Escalation Response',
    description: 'Time to respond to escalated issues',
    target: 5,
    current: 7,
    status: 'breach',
    trend: 'up',
    conversations: 23,
    breaches: 15
  },
  {
    id: 'follow-up-time',
    name: 'Follow-up Time',
    description: 'Time to follow up on pending issues',
    target: 60,
    current: 55,
    status: 'warning',
    trend: 'stable',
    conversations: 34,
    breaches: 3
  }
];

const slaAlerts: SLAAlert[] = [
  {
    id: '1',
    conversationId: 'conv-123',
    customerName: 'Alice Johnson',
    subject: 'Integration Help Needed',
    timeRemaining: -15,
    severity: 'breach',
    assignedTo: 'John Doe',
    channel: 'website'
  },
  {
    id: '2',
    conversationId: 'conv-124',
    customerName: 'Bob Smith',
    subject: 'Billing Question',
    timeRemaining: 5,
    severity: 'critical',
    assignedTo: 'Sarah Wilson',
    channel: 'email'
  },
  {
    id: '3',
    conversationId: 'conv-125',
    customerName: 'Carol Davis',
    subject: 'Feature Request',
    timeRemaining: 25,
    severity: 'warning',
    channel: 'whatsapp'
  },
  {
    id: '4',
    conversationId: 'conv-126',
    customerName: 'David Brown',
    subject: 'Technical Issue',
    timeRemaining: -5,
    severity: 'breach',
    assignedTo: 'Mike Johnson',
    channel: 'facebook'
  }
];

const teamPerformance: TeamPerformance[] = [
  {
    agentId: '1',
    agentName: 'John Doe',
    avgResponseTime: 8,
    slaCompliance: 92,
    conversationsHandled: 45,
    breaches: 3,
    status: 'excellent'
  },
  {
    agentId: '2',
    agentName: 'Sarah Wilson',
    avgResponseTime: 12,
    slaCompliance: 88,
    conversationsHandled: 38,
    breaches: 5,
    status: 'good'
  },
  {
    agentId: '3',
    agentName: 'Mike Johnson',
    avgResponseTime: 18,
    slaCompliance: 75,
    conversationsHandled: 32,
    breaches: 8,
    status: 'needs-improvement'
  },
  {
    agentId: '4',
    agentName: 'Emily Chen',
    avgResponseTime: 15,
    slaCompliance: 82,
    conversationsHandled: 28,
    breaches: 6,
    status: 'good'
  }
];

export default function SLAMonitoring() {
  const [metrics] = useState<SLAMetric[]>(slaMetrics);
  const [alerts] = useState<SLAAlert[]>(slaAlerts);
  const [performance] = useState<TeamPerformance[]>(teamPerformance);
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h');

  const getMetricStatusColor = (status: string) => {
    switch (status) {
      case 'meeting': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'warning': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'breach': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'warning': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'critical': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'breach': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getPerformanceStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'good': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'needs-improvement': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp size={16} className="text-red-400" />;
      case 'down': return <TrendingDown size={16} className="text-green-400" />;
      default: return <Target size={16} className="text-gray-400" />;
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes < 0) return `${Math.abs(minutes)}m overdue`;
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const calculateProgress = (current: number, target: number) => {
    return Math.min((target / Math.max(current, 1)) * 100, 100);
  };

  const overallCompliance = metrics.reduce((acc, metric) => {
    const compliance = ((metric.conversations - metric.breaches) / metric.conversations) * 100;
    return acc + compliance;
  }, 0) / metrics.length;

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent mb-4">
              SLA Monitoring
            </h1>
            <p className="text-gray-400 text-lg">
              Track service level agreements and team performance
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-[#141517]/50 backdrop-blur-xl border-gray-800/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Overall Compliance</p>
                  <p className="text-2xl font-bold text-green-400">{overallCompliance.toFixed(1)}%</p>
                </div>
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#141517]/50 backdrop-blur-xl border-gray-800/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Active Alerts</p>
                  <p className="text-2xl font-bold text-red-400">{alerts.length}</p>
                </div>
                <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#141517]/50 backdrop-blur-xl border-gray-800/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Avg Response Time</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {Math.round(metrics.reduce((acc, m) => acc + m.current, 0) / metrics.length)}m
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#141517]/50 backdrop-blur-xl border-gray-800/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Conversations</p>
                  <p className="text-2xl font-bold text-purple-400">
                    {metrics.reduce((acc, m) => acc + m.conversations, 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SLA Metrics */}
        <Card className="bg-[#141517]/50 backdrop-blur-xl border-gray-800/50 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Target size={20} />
              <span>SLA Metrics</span>
            </CardTitle>
            <CardDescription>
              Current performance against service level agreements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {metrics.map((metric) => (
                <div key={metric.id} className="p-4 bg-gray-800/30 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-white">{metric.name}</h3>
                      <p className="text-gray-400 text-sm">{metric.description}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getTrendIcon(metric.trend)}
                      <Badge className={getMetricStatusColor(metric.status)}>
                        {metric.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Current: {formatTime(metric.current)}</span>
                      <span className="text-gray-400">Target: {formatTime(metric.target)}</span>
                    </div>
                    
                    <Progress 
                      value={calculateProgress(metric.current, metric.target)}
                      className="h-2"
                    />

                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{metric.conversations} conversations</span>
                      <span>{metric.breaches} breaches</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Active Alerts */}
          <Card className="bg-[#141517]/50 backdrop-blur-xl border-gray-800/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <AlertTriangle size={20} />
                <span>Active Alerts</span>
              </CardTitle>
              <CardDescription>
                Conversations requiring immediate attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div key={alert.id} className="p-4 bg-gray-800/30 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-white">{alert.customerName}</h4>
                        <p className="text-gray-300 text-sm">{alert.subject}</p>
                        <p className="text-gray-400 text-xs">
                          {alert.channel} • {alert.assignedTo || 'Unassigned'}
                        </p>
                      </div>
                      <Badge className={getAlertSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${
                        alert.timeRemaining < 0 ? 'text-red-400' : 'text-yellow-400'
                      }`}>
                        {formatTime(alert.timeRemaining)}
                      </span>
                      <button className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors">
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Team Performance */}
          <Card className="bg-[#141517]/50 backdrop-blur-xl border-gray-800/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <Users size={20} />
                <span>Team Performance</span>
              </CardTitle>
              <CardDescription>
                Individual agent SLA compliance and metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performance.map((agent) => (
                  <div key={agent.agentId} className="p-4 bg-gray-800/30 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-xs">
                            {agent.agentName.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium text-white">{agent.agentName}</h4>
                          <p className="text-gray-400 text-xs">
                            {agent.conversationsHandled} conversations
                          </p>
                        </div>
                      </div>
                      <Badge className={getPerformanceStatusColor(agent.status)}>
                        {agent.status.replace('-', ' ')}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Avg Response</p>
                        <p className="text-white font-medium">{agent.avgResponseTime}m</p>
                      </div>
                      <div>
                        <p className="text-gray-400">SLA Compliance</p>
                        <p className="text-white font-medium">{agent.slaCompliance}%</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Breaches</p>
                        <p className="text-white font-medium">{agent.breaches}</p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <Progress value={agent.slaCompliance} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
