import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetAdminAuthResult = vi.fn();
const mockRedirect = vi.fn();

vi.mock('@/lib/admin-auth', () => ({
  getAdminAuthResult: () => mockGetAdminAuthResult(),
}));

vi.mock('next/navigation', () => ({
  redirect: (path: string) => mockRedirect(path),
}));

vi.mock('@/components/admin/layout/AdminLayoutClient', () => ({
  AdminLayoutClient: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="admin-layout">{children}</div>
  ),
}));

describe('admin layout guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to login when auth is unavailable', async () => {
    mockGetAdminAuthResult.mockResolvedValue({ status: 'unavailable' });
    const { default: AdminLayout } = await import('@/app/admin/layout');
    await AdminLayout({ children: <div>Test</div> });
    expect(mockRedirect).toHaveBeenCalledWith('/login?redirect=/admin');
  });

  it('redirects to login when unauthenticated', async () => {
    mockGetAdminAuthResult.mockResolvedValue({ status: 'unauthenticated' });
    const { default: AdminLayout } = await import('@/app/admin/layout');
    await AdminLayout({ children: <div>Test</div> });
    expect(mockRedirect).toHaveBeenCalledWith('/login?redirect=/admin');
  });

  it('redirects to home when forbidden', async () => {
    mockGetAdminAuthResult.mockResolvedValue({ status: 'forbidden', reason: 'role_mismatch' });
    const { default: AdminLayout } = await import('@/app/admin/layout');
    await AdminLayout({ children: <div>Test</div> });
    expect(mockRedirect).toHaveBeenCalledWith('/');
  });

  it('redirects to login when auth result is null', async () => {
    mockGetAdminAuthResult.mockResolvedValue(null);
    const { default: AdminLayout } = await import('@/app/admin/layout');
    await AdminLayout({ children: <div>Test</div> });
    expect(mockRedirect).toHaveBeenCalledWith('/login?redirect=/admin');
  });

  it('renders children for authorized admin', async () => {
    mockGetAdminAuthResult.mockResolvedValue({
      status: 'ok',
      user: { id: 'a1', email: 'admin@example.com', role: 'admin' },
    });
    const { default: AdminLayout } = await import('@/app/admin/layout');
    const element = await AdminLayout({ children: <div data-testid="content">Content</div> });

    expect(mockRedirect).not.toHaveBeenCalled();
    expect(element).not.toBeNull();
  });

  it('redirects to login when auth check throws', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      mockGetAdminAuthResult.mockRejectedValue(new Error('db down'));
      const { default: AdminLayout } = await import('@/app/admin/layout');
      await AdminLayout({ children: <div>Test</div> });
      expect(mockRedirect).toHaveBeenCalledWith('/login?redirect=/admin');
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
