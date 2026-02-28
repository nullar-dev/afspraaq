import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as listProfiles } from '@/app/api/admin/profiles/route';
import { GET as getProfile } from '@/app/api/admin/profiles/[id]/route';

const mockGetAdminAuthResult = vi.fn();
const mockCreateClient = vi.fn();

vi.mock('@/lib/admin-auth', () => ({
  getAdminAuthResult: () => mockGetAdminAuthResult(),
}));

vi.mock('@/utils/supabase/server', () => ({
  createClient: () => mockCreateClient(),
}));

describe('admin profiles routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 403 from list endpoint for non-admin users', async () => {
    mockGetAdminAuthResult.mockResolvedValue({ status: 'forbidden' });

    const request = new NextRequest('http://localhost:3000/api/admin/profiles');
    const response = await listProfiles(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe('forbidden');
  });

  it('returns 503 from list endpoint when auth is unavailable', async () => {
    mockGetAdminAuthResult.mockResolvedValue({ status: 'unavailable' });

    const request = new NextRequest('http://localhost:3000/api/admin/profiles');
    const response = await listProfiles(request);
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error.code).toBe('auth_unavailable');
  });

  it('returns 401 from list endpoint when unauthenticated', async () => {
    mockGetAdminAuthResult.mockResolvedValue({ status: 'unauthenticated' });

    const request = new NextRequest('http://localhost:3000/api/admin/profiles');
    const response = await listProfiles(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('unauthenticated');
  });

  it('returns paginated profile list for admins', async () => {
    mockGetAdminAuthResult.mockResolvedValue({
      status: 'ok',
      user: { id: 'admin-1', email: 'admin@example.com', role: 'admin' },
    });

    const mockRange = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'u1',
          email: 'u1@example.com',
          role: 'user',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      ],
      count: 1,
      error: null,
    });
    const mockOrder = vi.fn().mockReturnValue({ range: mockRange });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    mockCreateClient.mockResolvedValue({
      from: vi.fn(() => ({ select: mockSelect })),
    });

    const request = new NextRequest(
      'http://localhost:3000/api/admin/profiles?page=1&perPage=25&sortField=created_at&sortOrder=DESC'
    );
    const response = await listProfiles(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.total).toBe(1);
    expect(body.data).toHaveLength(1);
  });

  it('returns queried ids list for admins', async () => {
    mockGetAdminAuthResult.mockResolvedValue({
      status: 'ok',
      user: { id: 'admin-1', email: 'admin@example.com', role: 'admin' },
    });

    const mockIn = vi.fn().mockResolvedValue({
      data: [{ id: 'u1', email: 'u1@example.com', role: 'user' }],
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ in: mockIn });
    mockCreateClient.mockResolvedValue({
      from: vi.fn(() => ({ select: mockSelect })),
    });

    const request = new NextRequest('http://localhost:3000/api/admin/profiles?ids=u1,u2');
    const response = await listProfiles(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
  });

  it('returns 500 when ids query fails', async () => {
    mockGetAdminAuthResult.mockResolvedValue({
      status: 'ok',
      user: { id: 'admin-1', email: 'admin@example.com', role: 'admin' },
    });

    const mockIn = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'db error' },
    });
    const mockSelect = vi.fn().mockReturnValue({ in: mockIn });
    mockCreateClient.mockResolvedValue({
      from: vi.fn(() => ({ select: mockSelect })),
    });

    const request = new NextRequest('http://localhost:3000/api/admin/profiles?ids=u1,u2');
    const response = await listProfiles(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe('query_failed');
  });

  it('returns 500 when list query fails', async () => {
    mockGetAdminAuthResult.mockResolvedValue({
      status: 'ok',
      user: { id: 'admin-1', email: 'admin@example.com', role: 'admin' },
    });

    const mockRange = vi.fn().mockResolvedValue({
      data: null,
      count: null,
      error: { message: 'db error' },
    });
    const mockOrder = vi.fn().mockReturnValue({ range: mockRange });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    mockCreateClient.mockResolvedValue({
      from: vi.fn(() => ({ select: mockSelect })),
    });

    const request = new NextRequest('http://localhost:3000/api/admin/profiles');
    const response = await listProfiles(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe('query_failed');
  });

  it('returns 503 when profile list client is unavailable', async () => {
    mockGetAdminAuthResult.mockResolvedValue({
      status: 'ok',
      user: { id: 'admin-1', email: 'admin@example.com', role: 'admin' },
    });
    mockCreateClient.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/admin/profiles');
    const response = await listProfiles(request);
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error.code).toBe('auth_unavailable');
  });

  it('returns profile by id for admins', async () => {
    mockGetAdminAuthResult.mockResolvedValue({
      status: 'ok',
      user: { id: 'admin-1', email: 'admin@example.com', role: 'admin' },
    });

    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'u1',
        email: 'u1@example.com',
        role: 'user',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockCreateClient.mockResolvedValue({
      from: vi.fn(() => ({ select: mockSelect })),
    });

    const response = await getProfile(new Request('http://localhost:3000/api/admin/profiles/u1'), {
      params: Promise.resolve({ id: 'u1' }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.id).toBe('u1');
    expect(body.data.email).toBe('u1@example.com');
  });

  it('returns 503 on profile by id when auth is unavailable', async () => {
    mockGetAdminAuthResult.mockResolvedValue({ status: 'unavailable' });

    const response = await getProfile(new Request('http://localhost:3000/api/admin/profiles/u1'), {
      params: Promise.resolve({ id: 'u1' }),
    });
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error.code).toBe('auth_unavailable');
  });

  it('returns 500 when profile by id query fails', async () => {
    mockGetAdminAuthResult.mockResolvedValue({
      status: 'ok',
      user: { id: 'admin-1', email: 'admin@example.com', role: 'admin' },
    });

    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'db error' },
    });
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockCreateClient.mockResolvedValue({
      from: vi.fn(() => ({ select: mockSelect })),
    });

    const response = await getProfile(new Request('http://localhost:3000/api/admin/profiles/u1'), {
      params: Promise.resolve({ id: 'u1' }),
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe('query_failed');
  });

  it('returns 503 when profile by id client is unavailable', async () => {
    mockGetAdminAuthResult.mockResolvedValue({
      status: 'ok',
      user: { id: 'admin-1', email: 'admin@example.com', role: 'admin' },
    });
    mockCreateClient.mockResolvedValue(null);

    const response = await getProfile(new Request('http://localhost:3000/api/admin/profiles/u1'), {
      params: Promise.resolve({ id: 'u1' }),
    });
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error.code).toBe('auth_unavailable');
  });

  it('returns 404 when profile id does not exist', async () => {
    mockGetAdminAuthResult.mockResolvedValue({
      status: 'ok',
      user: { id: 'admin-1', email: 'admin@example.com', role: 'admin' },
    });

    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockCreateClient.mockResolvedValue({
      from: vi.fn(() => ({ select: mockSelect })),
    });

    const response = await getProfile(new Request('http://localhost:3000/api/admin/profiles/u1'), {
      params: Promise.resolve({ id: 'u1' }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('not_found');
  });
});
