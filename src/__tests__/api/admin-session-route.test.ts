import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/admin/session/route';

const mockGetAdminAuthResult = vi.fn();

vi.mock('@/lib/admin-auth', () => ({
  getAdminAuthResult: () => mockGetAdminAuthResult(),
}));

describe('admin session route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 503 when auth is unavailable', async () => {
    mockGetAdminAuthResult.mockResolvedValue({ status: 'unavailable' });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error.code).toBe('auth_unavailable');
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
  });

  it('returns 401 when request is unauthenticated', async () => {
    mockGetAdminAuthResult.mockResolvedValue({ status: 'unauthenticated' });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('unauthenticated');
  });

  it('returns 403 when user is not admin', async () => {
    mockGetAdminAuthResult.mockResolvedValue({ status: 'forbidden', reason: 'role_mismatch' });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe('forbidden');
  });

  it('returns 200 for authenticated admin session', async () => {
    mockGetAdminAuthResult.mockResolvedValue({
      status: 'ok',
      user: {
        id: 'admin-1',
        email: 'admin@example.com',
        role: 'admin',
      },
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.user).toEqual({
      id: 'admin-1',
      email: 'admin@example.com',
      role: 'admin',
    });
  });
});
