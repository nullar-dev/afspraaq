'use client';

import React, { useState } from 'react';
import { Bell, Settings, User, Menu, X, Crown, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Header: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { state: authState, logout, extendSession } = useAuth();
  const router = useRouter();

  const navItems = [{ label: 'Support' }, { label: 'Dashboard' }, { label: 'Fleet Management' }];

  const handleLogout = async () => {
    await logout();
    router.push('/login');
    router.refresh();
  };

  const formatSessionTime = (seconds: number | null) => {
    if (!seconds) return 'less than a minute';
    const minutes = Math.max(1, Math.ceil(seconds / 60));
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-[#2A2A2A]">
      {authState.showSessionExpiryWarning && (
        <div className="bg-amber-500/15 border-b border-amber-400/30 px-4 py-2 text-xs sm:text-sm flex flex-wrap items-center justify-between gap-3">
          <p className="text-amber-100">
            Session expires in {formatSessionTime(authState.sessionSecondsRemaining)}.
          </p>
          <button
            type="button"
            onClick={() => void extendSession()}
            className="text-amber-200 hover:text-white font-medium"
          >
            Extend session
          </button>
        </div>
      )}
      <div className="h-[72px] max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gold to-gold-light flex items-center justify-center shadow-gold">
            <Crown className="w-5 h-5 text-[#0A0A0A]" />
          </div>
          <span className="text-white font-semibold text-lg tracking-tight hidden sm:block">
            GOLD CONFIGURATOR
          </span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-8">
          {navItems.map(item => (
            <button
              key={item.label}
              type="button"
              disabled
              title="Section coming soon"
              className="relative text-[#B0B0B0] text-sm font-medium transition-colors duration-200 group cursor-not-allowed"
            >
              {item.label}
              <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-gold transition-all duration-200 group-hover:w-full" />
            </button>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button className="p-2 text-[#B0B0B0] hover:text-gold transition-colors duration-200 hover:scale-110 transform">
            <Bell className="w-5 h-5" />
          </button>
          <button className="p-2 text-[#B0B0B0] hover:text-gold transition-colors duration-200 hover:scale-110 transform hidden sm:block">
            <Settings className="w-5 h-5" />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 group">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold to-gold-light flex items-center justify-center group-hover:shadow-gold transition-shadow duration-200">
                  <User className="w-4 h-4 text-[#0A0A0A]" />
                </div>
                {authState.user && (
                  <span className="hidden sm:block text-sm text-white font-medium">
                    {authState.user.firstName}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-[#141414] border-[#2A2A2A] min-w-[160px]"
            >
              <DropdownMenuItem className="text-white hover:bg-[#252525] focus:bg-[#252525] cursor-pointer">
                <User className="w-4 h-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="text-white hover:bg-[#252525] focus:bg-[#252525] cursor-pointer">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-400 hover:bg-red-500/10 focus:bg-red-500/10 cursor-pointer"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 text-[#B0B0B0] hover:text-white transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute top-[72px] left-0 right-0 bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-[#2A2A2A] animate-fade-in">
          <nav className="flex flex-col p-4 gap-2">
            {navItems.map(item => (
              <button
                key={item.label}
                type="button"
                disabled
                title="Section coming soon"
                className="text-[#B0B0B0] py-3 px-4 rounded-lg transition-colors cursor-not-allowed text-left"
              >
                {item.label}
              </button>
            ))}
            {authState.user && (
              <button
                onClick={handleLogout}
                className="text-red-400 hover:text-red-300 py-3 px-4 rounded-lg hover:bg-red-500/10 transition-colors text-left flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
