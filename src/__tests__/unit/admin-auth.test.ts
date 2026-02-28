import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAdminAuthResult } from '@/lib/admin-auth';

const mockCreateClient = vi.fn();

vi.mock('@/utils/supabase/server', () => ({
  createClient: () => mockCreateClient(),
}));

describe('admin auth helper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unavailable when supabase client is missing', async () => {
    mockCreateClient.mockResolvedValue(null);

    await expect(getAdminAuthResult()).resolves.toEqual({ status: 'unavailable' });
  });

  it('returns unauthenticated when auth user is missing', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    });

    await expect(getAdminAuthResult()).resolves.toEqual({ status: 'unauthenticated' });
  });

  it('returns forbidden when profile lookup fails', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'boom' },
    });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'u@x.com' } } }),
      },
      from: vi.fn(() => ({ select })),
    });

    await expect(getAdminAuthResult()).resolves.toEqual({ status: 'forbidden' });
  });

  it('returns forbidden when role is not admin', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { role: 'user' },
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'u@x.com' } } }),
      },
      from: vi.fn(() => ({ select })),
    });

    await expect(getAdminAuthResult()).resolves.toEqual({ status: 'forbidden' });
  });

  it('returns ok with admin user payload', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { role: 'admin' },
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'admin-1', email: 'admin@example.com' } },
        }),
      },
      from: vi.fn(() => ({ select })),
    });

    await expect(getAdminAuthResult()).resolves.toEqual({
      status: 'ok',
      user: {
        id: 'admin-1',
        email: 'admin@example.com',
        role: 'admin',
      },
    });
  });
});
