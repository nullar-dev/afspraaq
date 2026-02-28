import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { AuthProvider, DataProvider } from 'react-admin';

const captured: { dataProvider: DataProvider | null; authProvider: AuthProvider | null } = {
  dataProvider: null,
  authProvider: null,
};

vi.mock('react-admin', () => ({
  Admin: ({
    dataProvider,
    authProvider,
    children,
  }: {
    dataProvider: unknown;
    authProvider: unknown;
    children: ReactNode;
  }) => {
    captured.dataProvider = dataProvider as DataProvider;
    captured.authProvider = authProvider as AuthProvider;
    return <div data-testid="admin-root">{children}</div>;
  },
  Resource: ({ name }: { name: string }) => <div data-testid={`resource-${name}`} />,
  List: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Datagrid: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  EmailField: () => null,
  TextField: () => null,
}));

describe('AdminApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    captured.dataProvider = null;
    captured.authProvider = null;
  });

  it('renders admin resource shell', async () => {
    const { default: AdminApp } = await import('@/components/admin/AdminApp');
    render(<AdminApp />);

    expect(screen.getByTestId('admin-root')).toBeTruthy();
    expect(screen.getByTestId('resource-profiles')).toBeTruthy();
    expect(captured.dataProvider).toBeTruthy();
    expect(captured.authProvider).toBeTruthy();
  });

  it('builds list/getOne/getMany requests through admin API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ id: 'u1' }],
          total: 1,
          user: { id: 'a1', email: 'a@x.com' },
        }),
      })
    );
    const { default: AdminApp } = await import('@/components/admin/AdminApp');
    render(<AdminApp />);

    const dp = captured.dataProvider;
    if (!dp) throw new Error('expected data provider');
    await dp.getList('profiles', {
      pagination: { page: 2, perPage: 10 },
      sort: { field: 'email', order: 'ASC' },
    });
    await dp.getOne('profiles', { id: 'u1' });
    await dp.getMany('profiles', { ids: ['u1', 'u2'] });

    expect(fetch).toHaveBeenCalledWith(
      '/api/admin/profiles?page=2&perPage=10&sortField=email&sortOrder=ASC',
      expect.any(Object)
    );
    expect(fetch).toHaveBeenCalledWith('/api/admin/profiles/u1', expect.any(Object));
    expect(fetch).toHaveBeenCalledWith('/api/admin/profiles?ids=u1%2Cu2', expect.any(Object));
  });

  it('throws on failed admin API response and disabled mutations', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: { message: 'Forbidden' } }),
      })
    );
    const { default: AdminApp } = await import('@/components/admin/AdminApp');
    render(<AdminApp />);
    const dp = captured.dataProvider;
    if (!dp) throw new Error('expected data provider');

    await expect(
      dp.getList('profiles', {
        pagination: { page: 1, perPage: 25 },
        sort: { field: 'created_at', order: 'DESC' },
      })
    ).rejects.toThrow('Forbidden');

    await expect(dp.update('profiles', { id: 'u1', data: {}, previousData: {} })).rejects.toThrow(
      'Profile updates are not enabled yet.'
    );
    await expect(dp.create('profiles', { data: {} })).rejects.toThrow(
      'Profile creation is managed by auth flow.'
    );
    await expect(dp.delete('profiles', { id: 'u1' })).rejects.toThrow(
      'Profile deletion is not enabled.'
    );
  });

  it('supports admin auth provider methods', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ user: { id: 'admin-1', email: 'admin@example.com' } }),
      })
    );
    const { default: AdminApp } = await import('@/components/admin/AdminApp');
    render(<AdminApp />);
    const ap = captured.authProvider;
    if (
      !ap?.checkAuth ||
      !ap.getIdentity ||
      !ap.getPermissions ||
      !ap.logout ||
      !ap.checkError ||
      !ap.login
    ) {
      throw new Error('expected full auth provider');
    }

    await expect(ap.checkAuth({})).resolves.toBeUndefined();
    await expect(ap.getIdentity()).resolves.toEqual({
      id: 'admin-1',
      fullName: 'admin@example.com',
    });
    await expect(ap.getPermissions({})).resolves.toEqual(['admin']);
    await expect(ap.logout({})).resolves.toBeUndefined();
    await expect(ap.checkError({})).resolves.toBeUndefined();
    await expect(ap.login({})).rejects.toThrow('Use the main login page to sign in.');
  });

  it('returns email fallback in getIdentity and covers passive provider methods', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ user: { id: 'admin-2', email: null } }),
      })
    );
    const { default: AdminApp } = await import('@/components/admin/AdminApp');
    render(<AdminApp />);
    const ap = captured.authProvider;
    const dp = captured.dataProvider;
    if (!ap?.getIdentity || !dp) throw new Error('expected providers');

    await expect(ap.getIdentity()).resolves.toEqual({
      id: 'admin-2',
      fullName: 'Admin',
    });
    await expect(
      dp.getManyReference('profiles', {
        target: 'id',
        id: 'u1',
        pagination: { page: 1, perPage: 25 },
        sort: { field: 'created_at', order: 'DESC' },
        filter: {},
      })
    ).resolves.toEqual({ data: [], total: 0 });
    await expect(dp.updateMany('profiles', { ids: ['u1'], data: {} })).resolves.toEqual({
      data: [],
    });
    await expect(dp.deleteMany('profiles', { ids: ['u1'] })).resolves.toEqual({ data: [] });
  });

  it('uses default requestJson error message when payload has no explicit message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({}),
      })
    );
    const { default: AdminApp } = await import('@/components/admin/AdminApp');
    render(<AdminApp />);
    const dp = captured.dataProvider;
    if (!dp) throw new Error('expected data provider');

    await expect(dp.getOne('profiles', { id: 'u1' })).rejects.toThrow('Admin API request failed');
  });
});
