'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, Settings, Shield, Mail, Phone, MoreVertical, Edit, Trash2, Crown, User } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'owner' | 'admin' | 'manager' | 'agent' | 'viewer';
  status: 'active' | 'inactive' | 'pending';
  avatar?: string;
  lastActive: Date;
  permissions: string[];
  assignedInboxes: string[];
  createdAt: Date;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  color: string;
}

const defaultRoles: Role[] = [
  {
    id: 'owner',
    name: 'Owner',
    description: 'Full access to all features and settings',
    permissions: ['*'],
    color: 'bg-yellow-500'
  },
  {
    id: 'admin',
    name: 'Admin',
    description: 'Manage team, settings, and all conversations',
    permissions: ['manage_team', 'manage_settings', 'view_analytics', 'manage_conversations', 'manage_integrations'],
    color: 'bg-red-500'
  },
  {
    id: 'manager',
    name: 'Manager',
    description: 'Manage conversations and view analytics',
    permissions: ['view_analytics', 'manage_conversations', 'assign_conversations'],
    color: 'bg-purple-500'
  },
  {
    id: 'agent',
    name: 'Agent',
    description: 'Handle assigned conversations',
    permissions: ['view_conversations', 'respond_conversations'],
    color: 'bg-blue-500'
  },
  {
    id: 'viewer',
    name: 'Viewer',
    description: 'View-only access to conversations and analytics',
    permissions: ['view_conversations', 'view_analytics'],
    color: 'bg-gray-500'
  }
];

const defaultTeamMembers: TeamMember[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@company.com',
    phone: '+1 (555) 123-4567',
    role: 'owner',
    status: 'active',
    lastActive: new Date(),
    permissions: ['*'],
    assignedInboxes: ['general', 'support', 'sales'],
    createdAt: new Date('2024-01-01')
  },
  {
    id: '2',
    name: 'Sarah Wilson',
    email: 'sarah@company.com',
    phone: '+1 (555) 234-5678',
    role: 'admin',
    status: 'active',
    lastActive: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    permissions: ['manage_team', 'manage_settings', 'view_analytics', 'manage_conversations'],
    assignedInboxes: ['support', 'sales'],
    createdAt: new Date('2024-01-05')
  },
  {
    id: '3',
    name: 'Mike Johnson',
    email: 'mike@company.com',
    role: 'agent',
    status: 'active',
    lastActive: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    permissions: ['view_conversations', 'respond_conversations'],
    assignedInboxes: ['support'],
    createdAt: new Date('2024-01-10')
  },
  {
    id: '4',
    name: 'Emily Chen',
    email: 'emily@company.com',
    role: 'agent',
    status: 'inactive',
    lastActive: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
    permissions: ['view_conversations', 'respond_conversations'],
    assignedInboxes: ['sales'],
    createdAt: new Date('2024-01-12')
  },
  {
    id: '5',
    name: 'David Brown',
    email: 'david@company.com',
    role: 'manager',
    status: 'pending',
    lastActive: new Date('2024-01-15'),
    permissions: ['view_analytics', 'manage_conversations', 'assign_conversations'],
    assignedInboxes: [],
    createdAt: new Date('2024-01-15')
  }
];

export default function TeamManagement() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(defaultTeamMembers);
  const [roles] = useState<Role[]>(defaultRoles);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'agent',
    message: ''
  });

  const getRoleInfo = (roleId: string) => {
    return roles.find(r => r.id === roleId) || roles[0];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'inactive': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown size={16} className="text-yellow-400" />;
      case 'admin': return <Shield size={16} className="text-red-400" />;
      default: return <User size={16} className="text-blue-400" />;
    }
  };

  const formatLastActive = (date: Date) => {
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

  const handleInviteMember = () => {
    if (!inviteForm.email) return;

    const newMember: TeamMember = {
      id: Date.now().toString(),
      name: inviteForm.email.split('@')[0],
      email: inviteForm.email,
      role: inviteForm.role as any,
      status: 'pending',
      lastActive: new Date(),
      permissions: getRoleInfo(inviteForm.role).permissions,
      assignedInboxes: [],
      createdAt: new Date()
    };

    setTeamMembers(prev => [...prev, newMember]);
    setInviteForm({ email: '', role: 'agent', message: '' });
    setIsInviting(false);
  };

  const handleRemoveMember = (id: string) => {
    if (confirm('Are you sure you want to remove this team member?')) {
      setTeamMembers(prev => prev.filter(m => m.id !== id));
    }
  };

  const handleUpdateRole = (id: string, newRole: string) => {
    setTeamMembers(prev => prev.map(m => 
      m.id === id 
        ? { ...m, role: newRole as any, permissions: getRoleInfo(newRole).permissions }
        : m
    ));
  };

  const toggleMemberStatus = (id: string) => {
    setTeamMembers(prev => prev.map(m => 
      m.id === id 
        ? { ...m, status: m.status === 'active' ? 'inactive' : 'active' }
        : m
    ));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent mb-4">
              Team Management
            </h1>
            <p className="text-gray-400 text-lg">
              Manage your team members, roles, and permissions
            </p>
          </div>
          <button
            onClick={() => setIsInviting(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center space-x-2"
          >
            <UserPlus size={20} />
            <span>Invite Member</span>
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-[#141517]/50 backdrop-blur-xl border-gray-800/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Members</p>
                  <p className="text-2xl font-bold text-white">{teamMembers.length}</p>
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
                  <p className="text-sm text-gray-400">Active Members</p>
                  <p className="text-2xl font-bold text-green-400">
                    {teamMembers.filter(m => m.status === 'active').length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#141517]/50 backdrop-blur-xl border-gray-800/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Pending Invites</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {teamMembers.filter(m => m.status === 'pending').length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                  <Mail className="w-6 h-6 text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#141517]/50 backdrop-blur-xl border-gray-800/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Roles</p>
                  <p className="text-2xl font-bold text-purple-400">{roles.length}</p>
                </div>
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Members Table */}
        <Card className="bg-[#141517]/50 backdrop-blur-xl border-gray-800/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Users size={20} />
              <span>Team Members</span>
            </CardTitle>
            <CardDescription>
              Manage your team members and their access levels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Member</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Role</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Last Active</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Assigned Inboxes</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map((member) => {
                    const roleInfo = getRoleInfo(member.role);
                    return (
                      <tr key={member.id} className="border-b border-gray-800 hover:bg-gray-800/30">
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-sm">
                                {member.name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <div>
                              <p className="text-white font-medium">{member.name}</p>
                              <p className="text-gray-400 text-sm">{member.email}</p>
                              {member.phone && (
                                <p className="text-gray-500 text-xs">{member.phone}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-2">
                            {getRoleIcon(member.role)}
                            <Badge className={`${roleInfo.color}/20 text-white border-${roleInfo.color}/30`}>
                              {roleInfo.name}
                            </Badge>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <Badge className={getStatusColor(member.status)}>
                            {member.status}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-gray-300">{formatLastActive(member.lastActive)}</span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1">
                            {member.assignedInboxes.slice(0, 2).map((inbox) => (
                              <Badge key={inbox} variant="secondary" className="text-xs">
                                {inbox}
                              </Badge>
                            ))}
                            {member.assignedInboxes.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{member.assignedInboxes.length - 2}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-end space-x-2">
                            <select
                              value={member.role}
                              onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                              className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                              disabled={member.role === 'owner'}
                            >
                              {roles.map((role) => (
                                <option key={role.id} value={role.id}>
                                  {role.name}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => toggleMemberStatus(member.id)}
                              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                member.status === 'active'
                                  ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
                                  : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                              }`}
                              disabled={member.role === 'owner'}
                            >
                              {member.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                            {member.role !== 'owner' && (
                              <button
                                onClick={() => handleRemoveMember(member.id)}
                                className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Roles Overview */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-white mb-6">Role Permissions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roles.map((role) => (
              <Card key={role.id} className="bg-[#141517]/50 backdrop-blur-xl border-gray-800/50">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 ${role.color} rounded-full`}></div>
                    <CardTitle className="text-white">{role.name}</CardTitle>
                  </div>
                  <CardDescription>{role.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-300">Permissions:</h4>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.map((permission) => (
                        <Badge key={permission} variant="secondary" className="text-xs">
                          {permission === '*' ? 'All Permissions' : permission.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Invite Member Modal */}
        {isInviting && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-[#141517] border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Invite Team Member</CardTitle>
                <CardDescription>
                  Send an invitation to join your team
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter email address"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {roles.filter(r => r.id !== 'owner').map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name} - {role.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Personal Message (Optional)</label>
                  <textarea
                    value={inviteForm.message}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, message: e.target.value }))}
                    className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Add a personal message to the invitation"
                  />
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    onClick={() => setIsInviting(false)}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleInviteMember}
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Send Invitation
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
