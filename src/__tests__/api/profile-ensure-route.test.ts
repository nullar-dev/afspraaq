import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST, GET } from '@/app/api/auth/profile/ensure/route';

const mockCreateClient = vi.fn();
const mockUpsert = vi.fn();

vi.mock('@/utils/supabase/server', () => ({
  createClient: () => mockCreateClient(),
}));

describe('auth profile ensure route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 405 for GET', async () => {
    const response = await GET();
    expect(response.status).toBe(405);
  });

  it('returns 503 when auth is unavailable', async () => {
    mockCreateClient.mockResolvedValue(null);
    const response = await POST();
    const body = await response.json();
    expect(response.status).toBe(503);
    expect(body.error.code).toBe('auth_unavailable');
  });

  it('returns 401 when user is missing', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    });
    const response = await POST();
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error.code).toBe('unauthenticated');
  });

  it('upserts normalized user profile when authenticated', async () => {
    mockUpsert.mockResolvedValue({ error: null });
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'u1', email: 'USER@EXAMPLE.COM ' } },
        }),
      },
      from: vi.fn(() => ({ upsert: mockUpsert })),
    });
    const response = await POST();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mockUpsert).toHaveBeenCalledWith(
      { id: 'u1', email: 'user@example.com', role: 'user' },
      { onConflict: 'id' }
    );
  });

  it('stores null email when auth user has no email', async () => {
    mockUpsert.mockResolvedValue({ error: null });
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'u2', email: undefined } },
        }),
      },
      from: vi.fn(() => ({ upsert: mockUpsert })),
    });

    const response = await POST();
    expect(response.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledWith(
      { id: 'u2', email: null, role: 'user' },
      { onConflict: 'id' }
    );
  });

  it('returns 500 when profile upsert fails', async () => {
    mockUpsert.mockResolvedValue({ error: { message: 'db fail' } });
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'u3', email: 'u3@example.com' } },
        }),
      },
      from: vi.fn(() => ({ upsert: mockUpsert })),
    });

    const response = await POST();
    const body = await response.json();
    expect(response.status).toBe(500);
    expect(body.error.code).toBe('profile_repair_failed');
  });
});
