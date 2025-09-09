'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDashboardData } from '@/lib/hooks/useDashboardData';

export default function DashboardPage() {
  const pathname = usePathname() || '';
  const { data: { stats, recentActivity }, loading, error } = useDashboardData();
  return (
    <div className="flex h-[100dvh] bg-[#0a0a0b] text-[#f8fafc] font-sans antialiased">
      {/* Sidebar */}
      <aside className="w-80 bg-[#141517] border-r border-gray-700/50 flex flex-col">
        <div className="p-6 border-b border-gray-700/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <div className="w-5 h-5 bg-white rounded-sm opacity-90"></div>
            </div>
            <div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent">Intaj</span>
              <div className="text-xs text-gray-400">AI Automation Hub</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link 
            href="/dashboard" 
            className={`sidebar-link flex items-center space-x-3 p-3 rounded-lg ${
              pathname === '/dashboard' ? 'bg-primary-500/20 text-primary-500' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
            </svg>
            <span>Dashboard</span>
          </Link>
          <Link 
            href="/dashboard/connections" 
            className={`sidebar-link flex items-center space-x-3 p-3 rounded-lg ${
              pathname.includes('/connections') ? 'bg-primary-500/20 text-primary-500' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span>Connections</span>
          </Link>
          <Link 
            href="/dashboard/chatbots" 
            className={`sidebar-link flex items-center space-x-3 p-3 rounded-lg ${
              pathname.includes('/chatbots') ? 'bg-primary-500/20 text-primary-500' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>Chatbots</span>
          </Link>
          <Link 
            href="/dashboard/agents" 
            className={`sidebar-link flex items-center space-x-3 p-3 rounded-lg ${
              pathname.includes('/agents') ? 'bg-primary-500/20 text-primary-500' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span>AI Agents</span>
          </Link>
          <Link 
            href="/dashboard/content" 
            className={`sidebar-link flex items-center space-x-3 p-3 rounded-lg ${
              pathname.includes('/content') ? 'bg-primary-500/20 text-primary-500' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <span>Content Studio</span>
          </Link>
          <Link 
            href="/dashboard/analytics" 
            className={`sidebar-link flex items-center space-x-3 p-3 rounded-lg ${
              pathname.includes('/analytics') ? 'bg-primary-500/20 text-primary-500' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2 2z" />
            </svg>
            <span>Analytics</span>
          </Link>
          <div className="border-t border-gray-700/50 pt-4 mt-4">
            <Link 
              href="/dashboard/settings" 
              className={`sidebar-link flex items-center space-x-3 p-3 rounded-lg ${
                pathname.includes('/settings') ? 'bg-primary-500/20 text-primary-500' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Settings</span>
            </Link>
          </div>
        </nav>
        <div className="p-4 border-t border-gray-700/50">
          <div className="flex items-center space-x-3 p-3 rounded-lg bg-[#1f2024]">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">JD</span>
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-200">John Doe</div>
              <div className="text-xs text-gray-400">Pro Plan</div>
            </div>
            <button 
              className="text-gray-400 hover:text-gray-200 transition-colors"
              title="Sign out"
              aria-label="Sign out"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-[#141517] border-b border-gray-700/50 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Dashboard</h1>
              <p className="text-gray-400">Welcome back! Here&apos;s what&apos;s happening with your AI automation.</p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <input type="text" placeholder="Search..." className="bg-[#1f2024] border border-gray-600 rounded-lg px-4 py-2 pl-10 text-gray-200 focus:border-blue-500 focus:outline-none w-64" />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              {/* Notifications */}
              <button 
                className="relative p-2 text-gray-400 hover:text-gray-200 transition-colors"
                title="View notifications"
                aria-label="View notifications"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-5.405-5.405a2.032 2.032 0 01-.595-1.43V11a6.5 6.5 0 11-13 0v-0.834c0-.532-.217-1.04-.595-1.43L0 17h5m10 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              </button>
              {/* Quick Actions */}
              <Link
                href="/dashboard/chatbots/new"
                className="bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                <span>Create Bot</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto bg-[#0a0a0b] p-8">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-red-500">Error loading dashboard data: {error.message || 'An unknown error occurred'}</div>
            </div>
          ) : (
            <div data-tour="dashboard-overview">
              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8" data-tour="analytics-cards">
                {/* Active Bots */}
            <div className="bg-[#1f2024] glass-card p-6 rounded-2xl hover:border-blue-500/30 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-500">Live</span>
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-1">{stats.activeBots}</div>
              <div className="text-gray-400 text-sm">Active Bots</div>
              {stats.weeklyBotGrowth > 0 && (
                <div className="text-xs text-green-500 mt-2">+{stats.weeklyBotGrowth} this week</div>
              )}
            </div>
            {/* Today's Conversations */}
            <div className="bg-[#1f2024] glass-card p-6 rounded-2xl hover:border-purple-500/30 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-500 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2v-6a2 2 0 012-2h8z" /></svg>
                </div>
                <div className="text-xs text-purple-500">Today</div>
              </div>
              <div className="text-3xl font-bold text-white mb-1">{stats.conversations}</div>
              <div className="text-gray-400 text-sm">Conversations</div>
              {stats.conversationGrowth !== 0 && (
                <div className={`text-xs ${stats.conversationGrowth > 0 ? 'text-green-500' : 'text-red-500'} mt-2`}>
                  {stats.conversationGrowth > 0 ? '+' : ''}{stats.conversationGrowth}% vs yesterday
                </div>
              )}
            </div>
            {/* Response Time */}
            <div className="bg-[#1f2024] glass-card p-6 rounded-2xl hover:border-cyan-500/30 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-cyan-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div className="text-xs text-cyan-500">Avg</div>
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                {stats.responseTime.toFixed(1)}s
              </div>
              <div className="text-gray-400 text-sm">Response Time</div>
              {stats.responseTimeImprovement !== 0 && (
                <div className={`text-xs ${stats.responseTimeImprovement < 0 ? 'text-green-500' : 'text-red-500'} mt-2`}>
                  {stats.responseTimeImprovement < 0 ? '' : '+'}
                  {stats.responseTimeImprovement.toFixed(1)}s vs avg
                </div>
              )}
            </div>
            {/* Satisfaction Rate */}
            <div className="bg-[#1f2024] glass-card p-6 rounded-2xl hover:border-green-500/30 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                </div>
                <div className="text-xs text-green-500">Rating</div>
              </div>
              <div className="text-3xl font-bold text-white mb-1">{stats.satisfaction.toFixed(1)}%</div>
              <div className="text-gray-400 text-sm">Satisfaction</div>
              {stats.satisfactionGrowth !== 0 && (
                <div className={`text-xs ${stats.satisfactionGrowth > 0 ? 'text-green-500' : 'text-red-500'} mt-2`}>
                  {stats.satisfactionGrowth > 0 ? '+' : ''}
                  {stats.satisfactionGrowth.toFixed(1)}% this month
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Quick Actions */}
            <div className="bg-[#1f2024] glass-card p-6 rounded-2xl" data-tour="quick-actions">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                <span>Quick Actions</span>
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <Link href="/dashboard/chatbots/create">
                  <button className="w-full bg-gradient-to-r from-blue-500 to-purple-500 p-4 rounded-lg text-white font-medium hover:opacity-90 transition-opacity flex flex-col items-center space-y-2" data-tour="create-chatbot-btn">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    <span>Create Chatbot</span>
                  </button>
                </Link>
                <Link href="/connections">
                  <button className="w-full bg-gradient-to-r from-green-500 to-emerald-500 p-4 rounded-lg text-white font-medium hover:opacity-90 transition-opacity flex flex-col items-center space-y-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                    <span>Connect Channel</span>
                  </button>
                </Link>
                <Link href="/profile">
                  <button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 p-4 rounded-lg text-white font-medium hover:opacity-90 transition-opacity flex flex-col items-center space-y-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    <span>Invite Team</span>
                  </button>
                </Link>
                <Link href="/analytics">
                  <button className="w-full bg-gradient-to-r from-orange-500 to-red-500 p-4 rounded-lg text-white font-medium hover:opacity-90 transition-opacity flex flex-col items-center space-y-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2 2z" /></svg>
                    <span>View Analytics</span>
                  </button>
                </Link>
              </div>
            </div>
            
            {/* Recent Activity */}
            <div className="bg-[#1f2024] glass-card p-6 rounded-2xl" data-tour="chatbots-section">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>Recent Activity</span>
              </h3>
              <div className="space-y-4">
                {recentActivity?.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-4 p-3 bg-[#23242a] rounded-lg">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      activity.type === 'conversation' ? 'bg-blue-500' :
                      activity.type === 'connection' ? 'bg-green-500' :
                      activity.type === 'update' ? 'bg-purple-500' :
                      'bg-cyan-500'
                    }`}>
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {activity.type === 'conversation' && (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        )}
                        {activity.type === 'connection' && (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        )}
                        {activity.type === 'update' && (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        )}
                        {activity.type === 'signup' && (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        )}
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-200">{activity.message}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(activity.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
