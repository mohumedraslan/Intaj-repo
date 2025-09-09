'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';

interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}

const navigationItems: NavItem[] = [
  {
    label: 'Features',
    href: '/features',
  },
  {
    label: 'Pricing',
    href: '/pricing',
  },
  {
    label: 'Services',
    href: '/services',
  },
  {
    label: 'Company',
    href: '#',
    children: [
      { label: 'About', href: '/about-us' },
      { label: 'Services', href: '/services' },
      { label: 'Blog', href: '/blog' },
      { label: 'Contact', href: '/contact-us' },
    ],
  },
  {
    label: 'Resources',
    href: '#',
    children: [
      { label: 'FAQ', href: '/faq' },
      { label: 'Privacy Policy', href: '/privacy-policy' },
      { label: 'Terms of Service', href: '/terms-of-service' },
    ],
  },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const pathname = usePathname();
  const session = useSession();
  const supabase = useSupabaseClient();

  const isActive = (href: string) => pathname === href;

  return (
    <header className="bg-white shadow-sm fixed w-full z-50">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center">
              <Image
                src="/logo.svg"
                alt="Intaj Logo"
                width={120}
                height={40}
                className="h-8 w-auto"
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex lg:gap-x-8">
            {navigationItems.map(item => (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => setActiveDropdown(item.label)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <Link
                  href={item.href}
                  className={`flex items-center gap-1 px-3 py-2 text-sm font-medium ${
                    isActive(item.href)
                      ? 'text-primary-600'
                      : 'text-gray-700 hover:text-primary-500'
                  }`}
                >
                  {item.label}
                  {item.children && (
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </Link>

                {/* Dropdown Menu */}
                {item.children && activeDropdown === item.label && (
                  <div className="absolute left-0 mt-2 w-48 rounded-md bg-white py-2 shadow-lg ring-1 ring-black ring-opacity-5">
                    {item.children.map(child => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`block px-4 py-2 text-sm ${
                          isActive(child.href)
                            ? 'bg-gray-100 text-primary-600'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-primary-500'
                        }`}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Right Section */}
          <div className="hidden lg:flex lg:items-center lg:gap-x-6">
            {session?.user ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-gray-700 hover:text-primary-500"
                >
                  Dashboard
                </Link>
                <Link
                  href="/profile"
                  className="text-sm font-medium text-gray-700 hover:text-primary-500"
                >
                  {session.user.email || 'Profile'}
                </Link>
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="text-sm font-medium text-gray-700 hover:text-primary-500"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth?type=login"
                  className="text-sm font-medium text-gray-700 hover:text-primary-500"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth?type=register"
                  className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-500"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex lg:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md p-2 text-gray-700 hover:bg-gray-100 hover:text-primary-500"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <X className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden">
            <div className="space-y-1 pb-3 pt-2">
              {navigationItems.map(item => (
                <div key={item.label}>
                  <button
                    onClick={() =>
                      setActiveDropdown(activeDropdown === item.label ? null : item.label)
                    }
                    className={`flex w-full items-center justify-between px-3 py-2 text-base font-medium ${
                      isActive(item.href)
                        ? 'bg-primary-50 text-primary-600'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-primary-500'
                    }`}
                  >
                    {item.label}
                    {item.children && (
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
                    )}
                  </button>
                  {item.children && activeDropdown === item.label && (
                    <div className="space-y-1 px-4 py-2">
                      {item.children.map(child => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`block py-2 pl-4 pr-3 text-base ${
                            isActive(child.href)
                              ? 'text-primary-600'
                              : 'text-gray-700 hover:text-primary-500'
                          }`}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 pb-3 pt-4">
              {session ? (
                <div className="space-y-1 px-3">
                  <Link
                    href="/dashboard"
                    className="block px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-primary-500"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/profile"
                    className="block px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-primary-500"
                  >
                    Profile
                  </Link>
                </div>
              ) : (
                <div className="space-y-1 px-3">
                  <Link
                    href="/auth?type=login"
                    className="block px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-primary-500"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/auth?type=register"
                    className="block w-full rounded-md bg-primary-600 px-3 py-2 text-center text-base font-medium text-white shadow-sm hover:bg-primary-500"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
