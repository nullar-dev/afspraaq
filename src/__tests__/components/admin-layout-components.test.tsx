import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from '@/components/admin/layout/Header';
import { MobileNav } from '@/components/admin/layout/MobileNav';

const mockPathname = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

describe('Admin layout components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.mockReturnValue('/admin');
  });

  it('renders fallback admin name when email is null', () => {
    render(
      <Header
        user={{ id: 'u1', email: null, role: 'admin' }}
        onMenuClick={vi.fn()}
        onSearchClick={vi.fn()}
      />
    );

    expect(screen.getByText('Admin')).toBeTruthy();
  });

  it('highlights active item in mobile nav', () => {
    render(
      <MobileNav
        navigation={[
          { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', href: '/admin' },
          { id: 'bookings', label: 'Bookings', icon: 'CalendarDays', href: '/admin/bookings' },
        ]}
      />
    );

    const dashboardText = screen.getByText('Dashboard');
    const dashboardLink = dashboardText.closest('a');
    expect(dashboardLink).toBeTruthy();
    expect((dashboardLink as HTMLElement).className).toContain('text-gold');
  });
});
