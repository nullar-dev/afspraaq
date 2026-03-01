import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CommandPalette } from '@/components/admin/layout/CommandPalette';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('CommandPalette', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const props = {
    isOpen: true,
    onClose: vi.fn(),
    actions: [
      {
        id: 'new-booking',
        label: 'New Booking',
        icon: 'CalendarPlus',
        shortcut: '⌘N',
        href: '/admin/bookings?new=1',
      },
      {
        id: 'view-calendar',
        label: 'View Calendar',
        icon: 'Calendar',
        shortcut: '⌘C',
        href: '/admin/schedule',
      },
    ],
    searchableItems: [
      {
        id: 'dashboard',
        type: 'page' as const,
        title: 'Dashboard',
        subtitle: 'Navigate to Dashboard',
        href: '/admin',
      },
    ],
  };

  it('navigates and closes when clicking an action', () => {
    const onClose = vi.fn();
    render(<CommandPalette {...props} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /new booking/i }));

    expect(mockPush).toHaveBeenCalledWith('/admin/bookings?new=1');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('supports arrow navigation and enter selection', () => {
    const onClose = vi.fn();
    render(<CommandPalette {...props} onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'Enter' });

    expect(mockPush).toHaveBeenCalledWith('/admin/schedule');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on escape key', () => {
    const onClose = vi.fn();
    render(<CommandPalette {...props} onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
