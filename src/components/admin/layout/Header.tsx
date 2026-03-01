'use client';

import { Search, Menu, Bell, User } from 'lucide-react';

interface HeaderProps {
  user: {
    id: string;
    email: string | null;
    role: string;
  };
  onMenuClick: () => void;
  onSearchClick: () => void;
}

export function Header({ user, onMenuClick, onSearchClick }: HeaderProps) {
  return (
    <header className="h-16 bg-dark-100/80 backdrop-blur-xl border-b border-dark-400 sticky top-0 z-30">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-dark-200 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search Trigger */}
          <button
            onClick={onSearchClick}
            className="hidden sm:flex items-center gap-3 px-4 py-2 bg-dark-200 rounded-lg text-dark-900 hover:text-white transition-colors"
          >
            <Search className="w-4 h-4" />
            <span className="text-sm">Search...</span>
            <kbd className="hidden md:inline-flex px-2 py-0.5 text-xs bg-dark-300 rounded">⌘K</kbd>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-dark-200 rounded-lg transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-gold rounded-full"></span>
          </button>

          <div className="flex items-center gap-3 pl-3 border-l border-dark-400">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium">{user.email?.split('@')[0] || 'Admin'}</p>
              <p className="text-xs text-dark-900">{user.role}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-gold/20 border border-gold/30 flex items-center justify-center">
              <User className="w-5 h-5 text-gold" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
