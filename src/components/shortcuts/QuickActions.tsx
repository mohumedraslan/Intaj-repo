"use client";
import { useState, useEffect, useRef } from "react";
import { Search, Plus, MessageSquare, Bot, Users, BarChart3, Settings, Zap, Command, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  shortcut: string;
  action: () => void;
  category: string;
}

interface QuickActionsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickActions({ isOpen, onClose }: QuickActionsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const actions: QuickAction[] = [
    {
      id: "create-chatbot",
      title: "Create New Chatbot",
      description: "Build a new AI chatbot from scratch",
      icon: <Bot className="w-5 h-5" />,
      shortcut: "⌘+N",
      action: () => router.push("/chatbots/new"),
      category: "Create"
    },
    {
      id: "new-conversation",
      title: "Start New Conversation",
      description: "Begin a new chat conversation",
      icon: <MessageSquare className="w-5 h-5" />,
      shortcut: "⌘+T",
      action: () => router.push("/conversations/new"),
      category: "Create"
    },
    {
      id: "invite-team",
      title: "Invite Team Member",
      description: "Add a new member to your team",
      icon: <Users className="w-5 h-5" />,
      shortcut: "⌘+I",
      action: () => router.push("/team?action=invite"),
      category: "Team"
    },
    {
      id: "view-analytics",
      title: "View Analytics",
      description: "Check your chatbot performance metrics",
      icon: <BarChart3 className="w-5 h-5" />,
      shortcut: "⌘+A",
      action: () => router.push("/analytics"),
      category: "Analytics"
    },
    {
      id: "dashboard",
      title: "Go to Dashboard",
      description: "Navigate to your main dashboard",
      icon: <Zap className="w-5 h-5" />,
      shortcut: "⌘+D",
      action: () => router.push("/dashboard"),
      category: "Navigation"
    },
    {
      id: "connections",
      title: "Manage Connections",
      description: "Connect or manage your messaging channels",
      icon: <MessageSquare className="w-5 h-5" />,
      shortcut: "⌘+C",
      action: () => router.push("/connections"),
      category: "Integration"
    },
    {
      id: "chat-widget",
      title: "Chat Widget Settings",
      description: "Configure your website chat widget",
      icon: <MessageSquare className="w-5 h-5" />,
      shortcut: "⌘+W",
      action: () => router.push("/chat-widget"),
      category: "Integration"
    },
    {
      id: "team-management",
      title: "Team Management",
      description: "Manage team members and permissions",
      icon: <Users className="w-5 h-5" />,
      shortcut: "⌘+M",
      action: () => router.push("/team"),
      category: "Team"
    },
    {
      id: "settings",
      title: "Account Settings",
      description: "Manage your account and preferences",
      icon: <Settings className="w-5 h-5" />,
      shortcut: "⌘+,",
      action: () => router.push("/settings"),
      category: "Settings"
    }
  ];

  const filteredActions = actions.filter(action =>
    action.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    action.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    action.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedActions = filteredActions.reduce((groups, action) => {
    const category = action.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(action);
    return groups;
  }, {} as Record<string, QuickAction[]>);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredActions.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredActions[selectedIndex]) {
            filteredActions[selectedIndex].action();
            onClose();
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, filteredActions, onClose]);

  const handleActionClick = (action: QuickAction) => {
    action.action();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-[20vh]">
      <div className="bg-[#1a1b1e] rounded-xl shadow-2xl w-full max-w-2xl border border-gray-700 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-700">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search for actions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none"
          />
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Actions List */}
        <div className="max-h-96 overflow-y-auto">
          {Object.keys(groupedActions).length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No actions found for "{searchQuery}"</p>
            </div>
          ) : (
            Object.entries(groupedActions).map(([category, categoryActions]) => (
              <div key={category} className="p-2">
                <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {category}
                </div>
                {categoryActions.map((action, actionIndex) => {
                  const globalIndex = filteredActions.indexOf(action);
                  return (
                    <button
                      key={action.id}
                      onClick={() => handleActionClick(action)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors ${
                        globalIndex === selectedIndex
                          ? 'bg-blue-500/20 border border-blue-500/30'
                          : 'hover:bg-gray-800/50'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        globalIndex === selectedIndex
                          ? 'bg-blue-500/30 text-blue-400'
                          : 'bg-gray-700/50 text-gray-400'
                      }`}>
                        {action.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white truncate">
                          {action.title}
                        </div>
                        <div className="text-sm text-gray-400 truncate">
                          {action.description}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 font-mono">
                        {action.shortcut}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700 bg-gray-800/30">
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs">↑↓</kbd>
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs">↵</kbd>
              <span>Select</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs">Esc</kbd>
              <span>Close</span>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            {filteredActions.length} actions
          </div>
        </div>
      </div>
    </div>
  );
}

// Global keyboard shortcuts hook
export function useKeyboardShortcuts() {
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command/Ctrl + K for quick actions
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsQuickActionsOpen(true);
        return;
      }

      // Only handle other shortcuts if quick actions is not open
      if (isQuickActionsOpen) return;

      // Global shortcuts
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case 'n':
            e.preventDefault();
            router.push('/chatbots/new');
            break;
          case 't':
            e.preventDefault();
            router.push('/conversations/new');
            break;
          case 'd':
            e.preventDefault();
            router.push('/dashboard');
            break;
          case 'a':
            e.preventDefault();
            router.push('/analytics');
            break;
          case 'c':
            e.preventDefault();
            router.push('/connections');
            break;
          case 'w':
            e.preventDefault();
            router.push('/chat-widget');
            break;
          case 'm':
            e.preventDefault();
            router.push('/team');
            break;
          case 'i':
            e.preventDefault();
            router.push('/team?action=invite');
            break;
          case ',':
            e.preventDefault();
            router.push('/settings');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isQuickActionsOpen, router]);

  return {
    isQuickActionsOpen,
    setIsQuickActionsOpen
  };
}

// Keyboard shortcuts help component
export function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  const shortcuts = [
    { key: "⌘+K", description: "Open quick actions" },
    { key: "⌘+N", description: "Create new chatbot" },
    { key: "⌘+T", description: "Start new conversation" },
    { key: "⌘+D", description: "Go to dashboard" },
    { key: "⌘+A", description: "View analytics" },
    { key: "⌘+C", description: "Manage connections" },
    { key: "⌘+W", description: "Chat widget settings" },
    { key: "⌘+M", description: "Team management" },
    { key: "⌘+I", description: "Invite team member" },
    { key: "⌘+,", description: "Account settings" },
  ];

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 w-12 h-12 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors shadow-lg border border-gray-700 z-40"
        title="Keyboard shortcuts"
      >
        <Command className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1b1e] rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="font-semibold text-white">Keyboard Shortcuts</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              {shortcuts.map((shortcut, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-gray-300">{shortcut.description}</span>
                  <kbd className="px-2 py-1 bg-gray-700 rounded text-xs font-mono text-gray-300">
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
