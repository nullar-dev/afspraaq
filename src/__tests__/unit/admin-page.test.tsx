import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetAdminAuthResult = vi.fn();
const mockRedirect = vi.fn();

vi.mock('@/lib/admin-auth', () => ({
  getAdminAuthResult: () => mockGetAdminAuthResult(),
}));

vi.mock('next/navigation', () => ({
  redirect: (path: string) => mockRedirect(path),
}));

vi.mock('@/components/admin/AdminApp', () => ({
  default: () => <div data-testid="admin-app">Admin App</div>,
}));

describe('admin page guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to login when auth is unavailable', async () => {
    mockGetAdminAuthResult.mockResolvedValue({ status: 'unavailable' });
    const { default: AdminPage } = await import('@/app/admin/page');
    await AdminPage();
    expect(mockRedirect).toHaveBeenCalledWith('/login?redirect=/admin');
  });

  it('redirects to login when unauthenticated', async () => {
    mockGetAdminAuthResult.mockResolvedValue({ status: 'unauthenticated' });
    const { default: AdminPage } = await import('@/app/admin/page');
    await AdminPage();
    expect(mockRedirect).toHaveBeenCalledWith('/login?redirect=/admin');
  });

  it('redirects to home when forbidden', async () => {
    mockGetAdminAuthResult.mockResolvedValue({ status: 'forbidden', reason: 'role_mismatch' });
    const { default: AdminPage } = await import('@/app/admin/page');
    await AdminPage();
    expect(mockRedirect).toHaveBeenCalledWith('/');
  });

  it('returns admin app for authorized admin', async () => {
    mockGetAdminAuthResult.mockResolvedValue({
      status: 'ok',
      user: { id: 'a1', email: 'admin@example.com', role: 'admin' },
    });
    const { default: AdminPage } = await import('@/app/admin/page');
    const element = await AdminPage();

    expect(mockRedirect).not.toHaveBeenCalled();
    expect(element).toBeTruthy();
  });

  it('redirects to login when auth check throws', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGetAdminAuthResult.mockRejectedValue(new Error('db down'));
    const { default: AdminPage } = await import('@/app/admin/page');
    await AdminPage();
    expect(mockRedirect).toHaveBeenCalledWith('/login?redirect=/admin');
    consoleErrorSpy.mockRestore();
  });
});
