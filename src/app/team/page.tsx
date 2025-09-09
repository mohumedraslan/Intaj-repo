'use client';

import TeamManagement from '@/components/team/TeamManagement';
import SharedInboxes from '@/components/team/SharedInboxes';
import SLAMonitoring from '@/components/team/SLAMonitoring';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Inbox, Clock, Shield, BarChart3, Settings } from 'lucide-react';

export default function TeamPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'inboxes' | 'sla'>(
    'overview'
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'members', label: 'Team Members', icon: Users },
    { id: 'inboxes', label: 'Shared Inboxes', icon: Inbox },
    { id: 'sla', label: 'SLA Monitoring', icon: Clock },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'members':
        return <TeamManagement />;
      case 'inboxes':
        return <SharedInboxes />;
      case 'sla':
        return <SLAMonitoring />;
      default:
        return (
          <div className="min-h-screen bg-[#0a0a0b] text-white p-8">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent mb-4">
                  Team Overview
                </h1>
                <p className="text-gray-400 text-lg">
                  Comprehensive team management and collaboration tools
                </p>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card className="bg-[#141517]/50 backdrop-blur-xl border-gray-800/50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">Team Members</p>
                        <p className="text-2xl font-bold text-white">12</p>
                      </div>
                      <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#141517]/50 backdrop-blur-xl border-gray-800/50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">Active Inboxes</p>
                        <p className="text-2xl font-bold text-green-400">4</p>
                      </div>
                      <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <Inbox className="w-6 h-6 text-green-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#141517]/50 backdrop-blur-xl border-gray-800/50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">SLA Compliance</p>
                        <p className="text-2xl font-bold text-purple-400">94%</p>
                      </div>
                      <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                        <Clock className="w-6 h-6 text-purple-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#141517]/50 backdrop-blur-xl border-gray-800/50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">Avg Response</p>
                        <p className="text-2xl font-bold text-cyan-400">8m</p>
                      </div>
                      <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                        <BarChart3 className="w-6 h-6 text-cyan-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Feature Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card
                  className="bg-[#141517]/50 backdrop-blur-xl border-gray-800/50 hover:border-gray-700/50 transition-all duration-300 cursor-pointer"
                  onClick={() => setActiveTab('members')}
                >
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <CardTitle className="text-white">Team Management</CardTitle>
                        <CardDescription>Manage team members and roles</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-gray-300">
                      <li>• Invite and manage team members</li>
                      <li>• Role-based access control</li>
                      <li>• Permission management</li>
                      <li>• Activity monitoring</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card
                  className="bg-[#141517]/50 backdrop-blur-xl border-gray-800/50 hover:border-gray-700/50 transition-all duration-300 cursor-pointer"
                  onClick={() => setActiveTab('inboxes')}
                >
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <Inbox className="w-6 h-6 text-green-400" />
                      </div>
                      <div>
                        <CardTitle className="text-white">Shared Inboxes</CardTitle>
                        <CardDescription>Collaborative conversation management</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-gray-300">
                      <li>• Multi-channel conversations</li>
                      <li>• Team collaboration</li>
                      <li>• Assignment and routing</li>
                      <li>• Real-time updates</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card
                  className="bg-[#141517]/50 backdrop-blur-xl border-gray-800/50 hover:border-gray-700/50 transition-all duration-300 cursor-pointer"
                  onClick={() => setActiveTab('sla')}
                >
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                        <Clock className="w-6 h-6 text-purple-400" />
                      </div>
                      <div>
                        <CardTitle className="text-white">SLA Monitoring</CardTitle>
                        <CardDescription>Track service level agreements</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-gray-300">
                      <li>• Response time tracking</li>
                      <li>• SLA compliance metrics</li>
                      <li>• Performance alerts</li>
                      <li>• Team performance analytics</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-[#141517]/50 backdrop-blur-xl border-gray-800/50">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                        <Shield className="w-6 h-6 text-yellow-400" />
                      </div>
                      <div>
                        <CardTitle className="text-white">Access Control</CardTitle>
                        <CardDescription>Security and permissions</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-gray-300">
                      <li>• Role-based permissions</li>
                      <li>• Feature access control</li>
                      <li>• Audit logs</li>
                      <li>• Security monitoring</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-[#141517]/50 backdrop-blur-xl border-gray-800/50">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                        <BarChart3 className="w-6 h-6 text-cyan-400" />
                      </div>
                      <div>
                        <CardTitle className="text-white">Analytics</CardTitle>
                        <CardDescription>Team performance insights</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-gray-300">
                      <li>• Response time analytics</li>
                      <li>• Conversation metrics</li>
                      <li>• Agent performance</li>
                      <li>• Customer satisfaction</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-[#141517]/50 backdrop-blur-xl border-gray-800/50">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                        <Settings className="w-6 h-6 text-red-400" />
                      </div>
                      <div>
                        <CardTitle className="text-white">Configuration</CardTitle>
                        <CardDescription>Team settings and preferences</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-gray-300">
                      <li>• Workflow automation</li>
                      <li>• Notification settings</li>
                      <li>• Integration preferences</li>
                      <li>• Custom fields</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        );
    }
  };

  if (activeTab !== 'overview') {
    return renderContent();
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      {/* Navigation Tabs */}
      <div className="bg-[#141517] border-b border-gray-800 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex space-x-1 bg-gray-800/30 rounded-lg p-1 w-fit">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {renderContent()}
    </div>
  );
}
