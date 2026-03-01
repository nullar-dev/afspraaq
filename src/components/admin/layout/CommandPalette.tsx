'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, CalendarPlus, Calendar, UserPlus, Download, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  actions: Array<{
    id: string;
    label: string;
    icon: string;
    shortcut: string;
    href: string;
  }>;
  searchableItems: Array<{
    id: string;
    type: 'booking' | 'customer' | 'page';
    title: string;
    subtitle: string;
    href: string;
  }>;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  CalendarPlus,
  Calendar,
  UserPlus,
  Download,
};

// Internal component that manages its own state
function CommandPaletteContent({
  onClose,
  actions,
  searchableItems,
}: Omit<CommandPaletteProps, 'isOpen'>) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const query = search.trim().toLowerCase();
  const filteredActions = useMemo(
    () => actions.filter(a => a.label.toLowerCase().includes(query)),
    [actions, query]
  );
  const filteredItems = useMemo(
    () =>
      searchableItems.filter(
        item =>
          item.title.toLowerCase().includes(query) || item.subtitle.toLowerCase().includes(query)
      ),
    [query, searchableItems]
  );
  const allItems = useMemo(
    () => [
      ...filteredActions.map(a => ({ ...a, itemType: 'action' as const })),
      ...filteredItems.map(i => ({ ...i, itemType: 'item' as const })),
    ],
    [filteredActions, filteredItems]
  );
  const activeIndex =
    allItems.length === 0 ? 0 : Math.max(0, Math.min(selectedIndex, allItems.length - 1));

  const executeSelection = useCallback(
    (index: number) => {
      const selected = allItems[index];
      if (!selected || !selected.href) return;
      router.push(selected.href);
      onClose();
    },
    [allItems, onClose, router]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (allItems.length === 0) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex(current => (current + 1) % allItems.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex(current => (current - 1 + allItems.length) % allItems.length);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        executeSelection(activeIndex);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, allItems.length, executeSelection, onClose]);

  return (
    <>
      {/* Search Input */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-dark-400">
        <Search className="w-5 h-5 text-dark-900" />
        <input
          type="text"
          placeholder="Search bookings, customers, or navigate..."
          value={search}
          maxLength={120}
          aria-label="Search commands"
          onChange={e => {
            setSearch(e.target.value);
            setSelectedIndex(0);
          }}
          className="flex-1 bg-transparent text-white placeholder-dark-900 outline-none"
          autoFocus
        />
        <kbd className="px-2 py-1 text-xs bg-dark-200 rounded">ESC</kbd>
      </div>

      {/* Results */}
      <div className="max-h-[60vh] overflow-y-auto py-2">
        {allItems.length === 0 ? (
          <div className="px-4 py-8 text-center text-dark-900">No results found</div>
        ) : (
          <>
            {filteredActions.length > 0 && (
              <div className="px-4 py-2 text-xs font-medium text-dark-900 uppercase tracking-wider">
                Actions
              </div>
            )}

            {filteredActions.map((action, index) => {
              const Icon = iconMap[action.icon] || Calendar;
              const isSelected = activeIndex === index;

              return (
                <button
                  type="button"
                  key={action.id}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 transition-colors',
                    isSelected ? 'bg-gold/10' : 'hover:bg-dark-200'
                  )}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => executeSelection(index)}
                >
                  <Icon className="w-5 h-5 text-dark-900" />
                  <span className="flex-1 text-left">{action.label}</span>
                  <kbd className="px-2 py-0.5 text-xs bg-dark-200 rounded">{action.shortcut}</kbd>
                </button>
              );
            })}

            {filteredItems.length > 0 && (
              <div className="px-4 py-2 mt-2 text-xs font-medium text-dark-900 uppercase tracking-wider">
                Results
              </div>
            )}

            {filteredItems.map((item, idx) => {
              const index = filteredActions.length + idx;
              const isSelected = activeIndex === index;

              return (
                <button
                  type="button"
                  key={item.id}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 transition-colors',
                    isSelected ? 'bg-gold/10' : 'hover:bg-dark-200'
                  )}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => executeSelection(index)}
                >
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded capitalize',
                      item.type === 'booking' && 'bg-gold/20 text-gold',
                      item.type === 'customer' && 'bg-blue-500/20 text-blue-400',
                      item.type === 'page' && 'bg-purple-500/20 text-purple-400'
                    )}
                  >
                    {item.type}
                  </span>
                  <div className="flex-1 text-left">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-dark-900">{item.subtitle}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-dark-900" />
                </button>
              );
            })}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-dark-50 border-t border-dark-400 flex items-center gap-4 text-xs text-dark-900">
        <div className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-dark-200 rounded">↑↓</kbd>
          <span>Navigate</span>
        </div>
        <div className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-dark-200 rounded">↵</kbd>
          <span>Select</span>
        </div>
      </div>
    </>
  );
}

// Main component with keyboard handling
export function CommandPalette({ isOpen, onClose, actions, searchableItems }: CommandPaletteProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl mx-4 bg-dark-100 rounded-2xl border border-dark-400 shadow-2xl overflow-hidden animate-scale-in">
        <CommandPaletteContent
          onClose={onClose}
          actions={actions}
          searchableItems={searchableItems}
        />
      </div>
    </div>
  );
}
