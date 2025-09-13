"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X, ChevronDown, ChevronUp, User } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import "@/styles/header.css";
import { useAuthStatus } from "@/lib/hooks/useAuthStatus";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

interface SubMenuItem {
  title: string;
  href: string;
  description: string;
}

interface MenuItem {
  title: string;
  href?: string;
  subMenu?: SubMenuItem[];
  requiresAuth?: boolean;
}

const publicMenuItems: MenuItem[] = [
  {
    title: "Solutions",
    subMenu: [
      {
        title: "AI Chatbots",
        href: "/solutions/chatbots",
        description: "Intelligent conversational AI for your business",
      },
      {
        title: "Process Automation",
        href: "/solutions/automation",
        description: "Streamline workflows with AI-powered automation",
      },
      {
        title: "Data Analytics",
        href: "/solutions/analytics",
        description: "Turn your data into actionable insights",
      },
    ],
  },
  {
    title: "Platform",
    subMenu: [
      {
        title: "Features",
        href: "/platform/features",
        description: "Explore our powerful platform capabilities",
      },
      {
        title: "Integrations",
        href: "/platform/integrations",
        description: "Connect with your favorite tools and services",
      },
      {
        title: "Security",
        href: "/platform/security",
        description: "Enterprise-grade security and compliance",
      },
    ],
  },
  { title: "Pricing", href: "/pricing" },
];

const authenticatedMenuItems: MenuItem[] = [
  { title: "Dashboard", href: "/dashboard", requiresAuth: true },
  { title: "Agent", href: "/agents", requiresAuth: true },
  { title: "Analytics", href: "/analytics", requiresAuth: true },
];



export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { isAuthenticated, isLoading } = useAuthStatus();
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    setOpenDropdown(null);
  };

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await supabase.auth.signOut();
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsSigningOut(false);
      setOpenDropdown(null);
    }
  };

  const menuItems = isLoading ? publicMenuItems : [...publicMenuItems, ...(isAuthenticated ? authenticatedMenuItems : [])];

  return (
    <header 
      className={`fixed w-full z-50 transition-all duration-200 ${
        isScrolled 
          ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg shadow-lg' 
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300">
              <Image src="/logo-white.svg" alt="Intaj Logo" width={28} height={28} className="opacity-90" />
            </div>
            <div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
                Intaj
              </span>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">AI Automation Hub</div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            {menuItems.map((item) => (
              <div key={item.title} className="relative group">
                {item.href ? (
                  <Link 
                    href={item.href}
                    className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm font-medium"
                  >
                    {item.title}
                  </Link>
                ) : (
                  <button
                    onClick={() => setOpenDropdown(openDropdown === item.title ? null : item.title)}
                    className="flex items-center gap-1 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm font-medium"
                    suppressHydrationWarning
                  >
                    {item.title}
                    {openDropdown === item.title ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                )}
                {item.subMenu && (
                  <div 
                    className={`absolute top-full left-0 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl p-4 transition-all duration-200 ${
                      openDropdown === item.title 
                        ? 'opacity-100 translate-y-0 pointer-events-auto' 
                        : 'opacity-0 -translate-y-2 pointer-events-none'
                    }`}
                  >
                    <div className="space-y-3">
                      {item.subMenu.map((subItem) => (
                        <Link
                          key={subItem.title}
                          href={subItem.href}
                          className="block group"
                          onClick={() => setOpenDropdown(null)}
                        >
                          <div className="text-sm font-medium text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                            {subItem.title}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300">
                            {subItem.description}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div className="flex items-center gap-4 ml-4 pl-4 border-l border-gray-200 dark:border-gray-700">
              {isLoading ? (
                <div className="flex items-center gap-4">
                  <div className="h-4 w-4 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                </div>
              ) : !isAuthenticated ? (
                <>
                  <Link 
                    href="/auth"
                    className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm font-medium"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/signup"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 shadow-lg hover:shadow-blue-500/25"
                  >
                    Start Free Trial
                  </Link>
                </>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <button
                      onClick={() => setOpenDropdown(openDropdown === 'profile' ? null : 'profile')}
                      className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm font-medium"
                      suppressHydrationWarning
                    >
                      <User size={20} />
                      <span>Profile</span>
                      {openDropdown === 'profile' ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    
                    {/* Profile Dropdown */}
                    <div 
                      className={`absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl p-3 transition-all duration-200 ${
                        openDropdown === 'profile'
                          ? 'opacity-100 translate-y-0 pointer-events-auto'
                          : 'opacity-0 -translate-y-2 pointer-events-none'
                      }`}
                    >
                      <div className="space-y-2">
                        <Link
                          href="/profile"
                          className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          onClick={() => setOpenDropdown(null)}
                        >
                          Account Settings
                        </Link>
                        <Link
                          href="/dashboard"
                          className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          onClick={() => setOpenDropdown(null)}
                        >
                          Dashboard
                        </Link>
                        <Link
                          href="/connections"
                          className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          onClick={() => setOpenDropdown(null)}
                        >
                          Connections
                        </Link>
                        <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                        <button
                          onClick={handleSignOut}
                          disabled={isSigningOut}
                          className="w-full px-3 py-2 text-sm text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          {isSigningOut ? (
                            <div className="flex items-center justify-center">
                              <div className="h-4 w-4 border-2 border-red-600/20 border-t-red-600 rounded-full animate-spin"></div>
                              <span className="ml-2">Signing out...</span>
                            </div>
                          ) : (
                            "Sign Out"
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            className="lg:hidden text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="lg:hidden py-4 space-y-4">
            {menuItems.map((item) => (
              <div key={item.title}>
                {item.href ? (
                  <Link
                    href={item.href}
                    className="block text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.title}
                  </Link>
                ) : (
                  <>
                    <button
                      onClick={() => setOpenDropdown(openDropdown === item.title ? null : item.title)}
                      className="flex items-center justify-between w-full text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm font-medium"
                      suppressHydrationWarning
                    >
                      {item.title}
                      {openDropdown === item.title ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    {item.subMenu && openDropdown === item.title && (
                      <div className="mt-2 ml-4 space-y-2">
                        {item.subMenu.map((subItem) => (
                          <Link
                            key={subItem.title}
                            href={subItem.href}
                            className="block"
                            onClick={() => {
                              setIsMenuOpen(false);
                              setOpenDropdown(null);
                            }}
                          >
                            <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                              {subItem.title}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {subItem.description}
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}

            <div className="flex flex-col gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              {isLoading ? (
                <div className="flex justify-center py-2">
                  <div className="h-4 w-4 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                </div>
              ) : !isAuthenticated ? (
                <>
                  <Link
                    href="/auth"
                    className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Log In
                  </Link>
                  <Link
                    href="/signup"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 shadow-lg hover:shadow-blue-500/25 text-center"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Start Free Trial
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/profile"
                    className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <button
                    onClick={() => {
                      handleSignOut();
                      setIsMenuOpen(false);
                    }}
                    disabled={isSigningOut}
                    className="text-gray-600 dark:text-gray-300 hover:text-red-500 transition-colors text-sm font-medium text-left"
                  >
                    {isSigningOut ? (
                      <div className="flex items-center">
                        <div className="h-4 w-4 border-2 border-red-600/20 border-t-red-600 rounded-full animate-spin"></div>
                        <span className="ml-2">Signing out...</span>
                      </div>
                    ) : (
                      "Sign Out"
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
