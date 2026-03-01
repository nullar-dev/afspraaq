'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, CalendarDays, Users, Clock, BarChart3, Settings, X } from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  CalendarDays,
  Users,
  Clock,
  BarChart3,
  Settings,
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  navigation: Array<{
    id: string;
    label: string;
    icon: string;
    href: string;
  }>;
}

export function Sidebar({ isOpen, onClose, navigation }: SidebarProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const isItemActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
          role="button"
          tabIndex={0}
          aria-label="Close sidebar"
          onKeyDown={event => {
            if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onClose();
            }
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-dark-100 border-r border-dark-400',
          'transform transition-transform duration-300 ease-out',
          'lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-dark-400">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold to-gold-600 flex items-center justify-center">
              <span className="text-dark font-bold text-lg">A</span>
            </div>
            <span className="font-bold text-lg">Admin</span>
          </Link>

          <button
            onClick={onClose}
            className="ml-auto lg:hidden p-2 hover:bg-dark-200 rounded-lg"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navigation.map(item => {
            const Icon = iconMap[item.icon] || LayoutDashboard;
            const isActive = isItemActive(item.href);

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                  'hover:bg-dark-200 group',
                  isActive && 'bg-gold/10 text-gold border border-gold/20'
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 transition-colors',
                    isActive ? 'text-gold' : 'text-dark-900 group-hover:text-white'
                  )}
                />
                <span
                  className={cn(
                    'font-medium',
                    isActive ? 'text-gold' : 'text-dark-900 group-hover:text-white'
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
