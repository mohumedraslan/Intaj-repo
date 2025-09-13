'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from '@supabase/auth-helpers-react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Database, 
  HelpCircle,
  BarChart2,
  Settings,
  Users,
  FileText,
  CreditCard,
  Code,
  Plug,
  AlertCircle
} from 'lucide-react';

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: SidebarItem[];
}

const sidebarItems: SidebarItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Connections',
    href: '/dashboard/connections',
    icon: Plug,
  },
  {
    label: 'AI Agents',
    href: '/dashboard/chatbots',
    icon: MessageSquare,
  },
  {
    label: 'Content Studio',
    href: '/dashboard/content',
    icon: FileText,
  },
  {
    label: 'Analytics',
    href: '/dashboard/analytics',
    icon: BarChart2,
  },
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const session = useSession();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  if (!session) {
    return null;
  }

  const isActive = (href: string) => pathname === href;
  const isDropdownActive = (item: SidebarItem) => 
    item.children?.some(child => isActive(child.href)) || isActive(item.href);

  return (
    <div className="flex h-full w-64 flex-col bg-white shadow-sm">
      <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
        <div className="flex-1 space-y-1 bg-white px-3">
          {sidebarItems.map((item) => (
            <div key={item.href}>
              {item.children ? (
                <div>
                  <button
                    onClick={() => setActiveDropdown(activeDropdown === item.label ? null : item.label)}
                    className={`
                      group flex w-full items-center rounded-md px-3 py-2 text-sm font-medium
                      ${isDropdownActive(item) 
                        ? 'bg-primary-50 text-primary-600' 
                        : 'text-gray-700 hover:bg-gray-50 hover:text-primary-500'}
                    `}
                  >
                    <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    <svg
                      className={`h-5 w-5 transition-transform ${
                        activeDropdown === item.label ? 'rotate-180' : ''
                      }`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  {activeDropdown === item.label && (
                    <div className="mt-1 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`
                            group flex items-center rounded-md py-2 pl-10 pr-2 text-sm font-medium
                            ${isActive(child.href)
                              ? 'bg-primary-50 text-primary-600'
                              : 'text-gray-700 hover:bg-gray-50 hover:text-primary-500'}
                          `}
                        >
                          <child.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href={item.href}
                  className={`
                    group flex items-center rounded-md px-3 py-2 text-sm font-medium
                    ${isActive(item.href)
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-primary-500'}
                  `}
                >
                  <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  {item.label}
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* User Section */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
              {session.user?.email?.[0].toUpperCase() || 'U'}
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-700 truncate">
              {session.user?.email}
            </p>
            <Link
              href="/profile"
              className="text-xs font-medium text-gray-500 hover:text-primary-500"
            >
              View profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
