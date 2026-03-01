import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Sidebar } from '@/components/admin/layout/Sidebar';

const mockPathname = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

describe('Sidebar', () => {
  const navigation = [
    { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', href: '/admin' },
    { id: 'settings', label: 'Settings', icon: 'Settings', href: '/admin/settings' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.mockReturnValue('/admin');
  });

  it('has an accessible close button on mobile', () => {
    const { container } = render(
      <Sidebar isOpen={true} onClose={vi.fn()} navigation={navigation} />
    );

    expect(container.querySelector('button[aria-label="Close sidebar"]')).toBeTruthy();
  });

  it('highlights parent item for nested routes', () => {
    mockPathname.mockReturnValue('/admin/settings/profile');
    render(<Sidebar isOpen={true} onClose={vi.fn()} navigation={navigation} />);

    const settingsText = screen.getByText('Settings');
    expect((settingsText as HTMLElement).className).toContain('text-gold');
  });

  it('closes on escape key', () => {
    const onClose = vi.fn();
    render(<Sidebar isOpen={true} onClose={onClose} navigation={navigation} />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
