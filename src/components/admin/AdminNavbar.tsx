'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, LayoutDashboard, Users, Settings, LogOut, Shield } from 'lucide-react';

export default function AdminNavbar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const navItems = [
    { text: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, path: '/admin/dashboard' },
    { text: 'Users', icon: <Users className="h-4 w-4" />, path: '/admin/dashboard' },
    { text: 'Settings', icon: <Settings className="h-4 w-4" />, path: '/admin/dashboard' },
  ];

  return (
    <>
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-4">
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <SheetTrigger asChild>
                <Button className="p-2 bg-transparent hover:bg-gray-700 border-none">
                  <Menu className="h-5 w-5 text-white" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 bg-gray-800 border-gray-700">
                <div className="flex flex-col h-full">
                  <div className="flex items-center space-x-2 p-4 border-b border-gray-700">
                    <Shield className="h-5 w-5 text-blue-500" />
                    <h2 className="text-lg font-semibold text-white">Admin Panel</h2>
                  </div>
                  
                  <nav className="flex-1 p-4">
                    <div className="space-y-2">
                      {navItems.map((item) => (
                        <Link
                          key={item.text}
                          href={item.path}
                          onClick={() => setDrawerOpen(false)}
                          className="flex items-center space-x-3 px-3 py-2 rounded-md text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                        >
                          {item.icon}
                          <span>{item.text}</span>
                        </Link>
                      ))}
                    </div>
                    
                    <div className="border-t border-gray-700 mt-6 pt-6">
                      <button
                        onClick={handleSignOut}
                        className="flex items-center space-x-3 px-3 py-2 rounded-md text-gray-300 hover:bg-gray-700 hover:text-white transition-colors w-full"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
            
            <h1 className="text-xl font-bold text-white">Intaj AI Admin</h1>
          </div>
          
          <Link href="/dashboard">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              Back to App
            </Button>
          </Link>
        </div>
      </header>
    </>
  );
}