'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, CalendarDays, Users, Clock, BarChart3, Settings } from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  CalendarDays,
  Users,
  Clock,
  BarChart3,
  Settings,
};

interface MobileNavProps {
  navigation: Array<{
    id: string;
    label: string;
    icon: string;
    href: string;
  }>;
}

export function MobileNav({ navigation }: MobileNavProps) {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-dark-100 border-t border-dark-400 z-50">
      <div className="h-full flex items-center justify-around px-2">
        {navigation.slice(0, 5).map(item => {
          const Icon = iconMap[item.icon] || LayoutDashboard;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors',
                isActive ? 'text-gold' : 'text-dark-900'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
