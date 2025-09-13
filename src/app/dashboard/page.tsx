'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDashboardData } from '@/lib/hooks/useDashboardData';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import OnboardingChecklist from '@/components/onboarding/OnboardingChecklist';
import UserProfile from '@/components/UserProfile';

export default function DashboardPage() {
  const pathname = usePathname() || '';
  const { data: { stats, recentActivity }, loading, error } = useDashboardData();
  const [userId, setUserId] = useState<string | null>(null);
  const [onboardingSteps, setOnboardingSteps] = useState<{
    created_first_agent: boolean;
    added_data_source: boolean;
    created_first_connection: boolean;
    has_dismissed: boolean;
  }>({ created_first_agent: false, added_data_source: false, created_first_connection: false, has_dismissed: false });

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setUserId(data.session.user.id);
        // Fetch onboarding steps
        const { data: userData, error } = await supabase
          .from('user_settings')
          .select('onboarding_steps')
          .eq('user_id', data.session.user.id)
          .single();

        if (userData && userData.onboarding_steps) {
          setOnboardingSteps(userData.onboarding_steps);
        }
      }
    };

    checkAuth();
  }, []);

  return (
    <div className="flex h-[100dvh] bg-[#0a0a0b] text-[#f8fafc] font-sans antialiased">
      {/* Sidebar */}
      <aside className="w-80 bg-[#141517] border-r border-gray-700/50 flex flex-col">
        <div className="p-6 border-b border-gray-700/50">
          <Link href="http://localhost:3001/pricing" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <div className="w-5 h-5 bg-white rounded-sm opacity-90"></div>
            </div>
            <div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent">Intaj</span>
              <div className="text-xs text-gray-400">AI Automation Hub</div>
            </div>
          </Link>
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
            href="/dashboard/agents" 
            className={`sidebar-link flex items-center space-x-3 p-3 rounded-lg ${
              pathname.includes('/agents') || pathname.includes('/chatbots') ? 'bg-primary-500/20 text-primary-500' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
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
            >              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Settings</span>
            </Link>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-[#141517] border-b border-gray-700/50 flex items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold">Dashboard</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <button 
                onClick={() => {/* Add notification functionality */}}
                className="w-10 h-10 rounded-full bg-gray-700/50 flex items-center justify-center text-gray-300 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>
            </div>
            <div className="h-8 w-px bg-gray-700/50"></div>
            <UserProfile />
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#0a0a0b]">
          {/* Onboarding Checklist */}
          {userId && !onboardingSteps.has_dismissed && (
            <div className="mb-8">
              <OnboardingChecklist 
                onboardingSteps={onboardingSteps} 
                userId={userId} 
              />
            </div>
          )}

          {/* Stats Overview */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Stats Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#141517] rounded-xl p-6 border border-gray-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Total Agents</div>
                    <div className="text-2xl font-bold">{stats.totalAgents}</div>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-500">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-400">
                  <span className="text-green-500">↑ 12%</span> from last month
                </div>
              </div>
              <div className="bg-[#141517] rounded-xl p-6 border border-gray-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Total Connections</div>
                    <div className="text-2xl font-bold">{stats.totalConnections}</div>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-500">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-400">
                  <span className="text-green-500">↑ 8%</span> from last month
                </div>
              </div>
              <div className="bg-[#141517] rounded-xl p-6 border border-gray-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Total Messages</div>
                    <div className="text-2xl font-bold">{stats.totalMessages}</div>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-500">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-400">
                  <span className="text-green-500">↑ 24%</span> from last month
                </div>
              </div>
              <div className="bg-[#141517] rounded-xl p-6 border border-gray-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Data Sources</div>
                    <div className="text-2xl font-bold">{stats.totalDataSources}</div>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-500">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-400">
                  <span className="text-green-500">↑ 16%</span> from last month
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link href="/dashboard/agents/new" className="bg-[#141517] rounded-xl p-6 border border-gray-700/50 hover:border-primary-500/50 hover:bg-[#18191c] transition-colors group">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-500 group-hover:bg-blue-500/30 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-lg font-medium">Create New Agent</div>
                    <div className="text-sm text-gray-400">Build a custom AI agent</div>
                  </div>
                </div>
              </Link>
              <Link href="/dashboard/connections/whatsapp" className="bg-[#141517] rounded-xl p-6 border border-gray-700/50 hover:border-primary-500/50 hover:bg-[#18191c] transition-colors group">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-500 group-hover:bg-purple-500/30 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-lg font-medium">Add Connection</div>
                    <div className="text-sm text-gray-400">Connect to platforms</div>
                  </div>
                </div>
              </Link>
              <Link href="/dashboard/content" className="bg-[#141517] rounded-xl p-6 border border-gray-700/50 hover:border-primary-500/50 hover:bg-[#18191c] transition-colors group">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-500 group-hover:bg-cyan-500/30 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-lg font-medium">Create Content</div>
                    <div className="text-sm text-gray-400">Generate AI content</div>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <div className="bg-[#141517] rounded-xl border border-gray-700/50 overflow-hidden">
              <div className="p-6">
                {recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-start space-x-4">
                        <div className="w-10 h-10 rounded-full bg-gray-700/50 flex items-center justify-center text-gray-300">
                          {activity.type === 'chatbot_created' && (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          )}
                          {activity.type === 'connection_created' && (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                          )}
                          {activity.type === 'data_source_added' && (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm">{activity.description}</div>
                          <div className="text-xs text-gray-400">{activity.timestamp}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-lg">No recent activity</div>
                    <div className="text-sm">Your recent actions will appear here</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}