'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDashboardData } from '@/lib/hooks/useDashboardData';
import { supabase } from '@/lib/supabaseClient';
import OnboardingChecklist from '@/components/onboarding/OnboardingChecklist';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

export default function DashboardPage() {
  const pathname = usePathname();
  const { data, loading, error } = useDashboardData();
  const [profile, setProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<any>(null);
  const [onboardingSteps, setOnboardingSteps] = useState({
    created_first_chatbot: false,
    added_data_source: false,
    connected_channel: false,
    has_dismissed: false
  });

  useEffect(() => {
    async function fetchUserProfile() {
      try {
        setLoadingProfile(true);
        
        // Get the current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          setProfileError(userError);
          return;
        }
        
        if (!user) {
          setProfileError(new Error('No user found'));
          return;
        }

        // Fetch the user's profile
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (error) {
          // Handle the error silently - we can still show the dashboard
          setProfileError(error);
        } else if (profile) {
          setProfile(profile);
          setOnboardingSteps(profile.onboarding_steps || {
            created_first_chatbot: false,
            added_data_source: false,
            connected_channel: false,
            has_dismissed: false
          });
        }
      } catch (error) {
        // Set the error state but don't log to console
        setProfileError(error);
      } finally {
        setLoadingProfile(false);
      }
    }
    
    fetchUserProfile();
  }, []);

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
          <div className="flex items-center space-x-3 p-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200 truncate">
                {profile?.full_name || 'User'}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {profile?.email || 'Loading...'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Top bar */}
        <div className="border-b border-gray-700/50 bg-[#141517] p-4 flex justify-between items-center">
          <div className="relative w-96">
            <input
              type="text"
              placeholder="Search..."
              className="w-full bg-[#1e1f23] border border-gray-700/50 rounded-lg py-2 px-4 pl-10 text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            />
            <svg className="w-5 h-5 text-gray-500 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="flex items-center space-x-4">
            <button className="p-2 rounded-lg bg-[#1e1f23] text-gray-400 hover:text-gray-200">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            <button className="p-2 rounded-lg bg-[#1e1f23] text-gray-400 hover:text-gray-200">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Dashboard content */}
        <div className="p-6">
          {/* Onboarding checklist */}
          {!loading && !loadingProfile && (
            <OnboardingChecklist 
              steps={onboardingSteps} 
              onUpdateStep={(step, value) => {
                setOnboardingSteps(prev => ({
                  ...prev,
                  [step]: value
                }));
              }}
              onDismiss={() => {
                setOnboardingSteps(prev => ({
                  ...prev,
                  has_dismissed: true
                }));
              }}
            />
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
            <div className="bg-[#141517] border border-gray-700/50 rounded-xl p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-400 text-sm">Active Chatbots</p>
                  <h3 className="text-2xl font-bold text-white mt-1">{data.stats.activeBots}</h3>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className="text-green-500 flex items-center text-sm">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                  {data.stats.weeklyBotGrowth}%
                </span>
                <span className="text-gray-500 text-sm ml-2">vs last week</span>
              </div>
            </div>

            <div className="bg-[#141517] border border-gray-700/50 rounded-xl p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-400 text-sm">Conversations</p>
                  <h3 className="text-2xl font-bold text-white mt-1">{data.stats.conversations}</h3>
                </div>
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                  </svg>
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className="text-green-500 flex items-center text-sm">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                  {data.stats.conversationGrowth}%
                </span>
                <span className="text-gray-500 text-sm ml-2">vs last week</span>
              </div>
            </div>

            <div className="bg-[#141517] border border-gray-700/50 rounded-xl p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-400 text-sm">Avg. Response Time</p>
                  <h3 className="text-2xl font-bold text-white mt-1">{data.stats.responseTime}s</h3>
                </div>
                <div className="p-3 bg-cyan-500/10 rounded-lg">
                  <svg className="w-6 h-6 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className="text-green-500 flex items-center text-sm">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                  {Math.abs(data.stats.responseTimeImprovement * 100)}%
                </span>
                <span className="text-gray-500 text-sm ml-2">faster than last week</span>
              </div>
            </div>

            <div className="bg-[#141517] border border-gray-700/50 rounded-xl p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-400 text-sm">User Satisfaction</p>
                  <h3 className="text-2xl font-bold text-white mt-1">{data.stats.satisfaction}%</h3>
                </div>
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className="text-green-500 flex items-center text-sm">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                  {data.stats.satisfactionGrowth}%
                </span>
                <span className="text-gray-500 text-sm ml-2">vs last week</span>
              </div>
            </div>
          </div>

          {/* Platform distribution and recent activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <div className="lg:col-span-1 bg-[#141517] border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-lg font-medium text-white">Platform Distribution</h3>
              <div className="mt-6 space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-400">WhatsApp</span>
                    <span className="text-sm text-gray-400">{data.platforms.whatsapp}</span>
                  </div>
                  <div className="w-full bg-gray-700/30 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${(data.platforms.whatsapp / Math.max(1, Object.values(data.platforms).reduce((a, b) => a + b, 0))) * 100}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-400">Facebook</span>
                    <span className="text-sm text-gray-400">{data.platforms.facebook}</span>
                  </div>
                  <div className="w-full bg-gray-700/30 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(data.platforms.facebook / Math.max(1, Object.values(data.platforms).reduce((a, b) => a + b, 0))) * 100}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-400">Instagram</span>
                    <span className="text-sm text-gray-400">{data.platforms.instagram}</span>
                  </div>
                  <div className="w-full bg-gray-700/30 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${(data.platforms.instagram / Math.max(1, Object.values(data.platforms).reduce((a, b) => a + b, 0))) * 100}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-400">Website</span>
                    <span className="text-sm text-gray-400">{data.platforms.web}</span>
                  </div>
                  <div className="w-full bg-gray-700/30 rounded-full h-2">
                    <div className="bg-cyan-500 h-2 rounded-full" style={{ width: `${(data.platforms.web / Math.max(1, Object.values(data.platforms).reduce((a, b) => a + b, 0))) * 100}%` }}></div>
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <Button className="w-full bg-primary-500 hover:bg-primary-600 text-white">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Add Connection
                </Button>
              </div>
            </div>

            <div className="lg:col-span-2 bg-[#141517] border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-lg font-medium text-white">Recent Activity</h3>
              <div className="mt-6 space-y-6">
                {data.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex">
                    <div className="mr-4">
                      {activity.type === 'conversation' && (
                        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                          <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                      )}
                      {activity.type === 'connection' && (
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                        </div>
                      )}
                      {activity.type === 'update' && (
                        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </div>
                      )}
                      {activity.type === 'signup' && (
                        <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                          <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-gray-200">{activity.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
