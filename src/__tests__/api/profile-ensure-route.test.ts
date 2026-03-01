import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { NextRequest } from 'next/server';
import {
  POST,
  GET,
  __resetEnsureProfileRateLimitForTests,
} from '@/app/api/auth/profile/ensure/route';

const mockCreateClient = vi.fn();
const mockUpsert = vi.fn();

vi.mock('@/utils/supabase/server', () => ({
  createClient: () => mockCreateClient(),
}));

describe('auth profile ensure route', () => {
  let consoleErrorSpy: MockInstance;
  let consoleWarnSpy: MockInstance;

  const makeRequest = (url = 'http://localhost:3000/api/auth/profile/ensure') =>
    new NextRequest(url, {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
        'x-requested-with': 'XMLHttpRequest',
      },
    });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
    __resetEnsureProfileRateLimitForTests();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    consoleErrorSpy?.mockRestore();
    consoleWarnSpy?.mockRestore();
  });

  it('returns 405 for GET', async () => {
    const response = await GET();
    expect(response.status).toBe(405);
  });

  it('returns 503 when auth is unavailable', async () => {
    mockCreateClient.mockResolvedValue(null);
    const response = await POST(makeRequest());
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
    const response = await POST(makeRequest());
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
    const response = await POST(makeRequest());
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mockUpsert).toHaveBeenCalledWith(
      { id: 'u1', email: 'user@example.com' },
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

    const response = await POST(makeRequest());
    expect(response.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledWith({ id: 'u2', email: null }, { onConflict: 'id' });
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

    const response = await POST(makeRequest());
    const body = await response.json();
    expect(response.status).toBe(500);
    expect(body.error.code).toBe('profile_repair_failed');
  });

  it('returns 403 when browser request header is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/profile/ensure', {
      method: 'POST',
      headers: { origin: 'http://localhost:3000' },
    });
    const response = await POST(request);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('forbidden_request');
  });

  it('returns 403 when origin is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/profile/ensure', {
      method: 'POST',
      headers: { 'x-requested-with': 'XMLHttpRequest' },
    });
    const response = await POST(request);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('forbidden_origin');
  });

  it('allows explicit origin allowlist via ALLOWED_ORIGINS', async () => {
    process.env.ALLOWED_ORIGINS = 'https://app.example.com,https://admin.example.com';
    mockUpsert.mockResolvedValue({ error: null });
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'u-allowed', email: 'allowed@example.com' } },
        }),
      },
      from: vi.fn(() => ({ upsert: mockUpsert })),
    });

    const request = new NextRequest('https://app.example.com/api/auth/profile/ensure', {
      method: 'POST',
      headers: {
        origin: 'https://admin.example.com',
        'x-requested-with': 'XMLHttpRequest',
      },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
  });

  it('fails closed when ALLOWED_ORIGINS is missing', async () => {
    delete process.env.ALLOWED_ORIGINS;

    const request = new NextRequest('https://app.example.com/api/auth/profile/ensure', {
      method: 'POST',
      headers: {
        origin: 'https://app.example.com',
        'x-requested-with': 'XMLHttpRequest',
      },
    });
    const response = await POST(request);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('forbidden_origin');
  });

  it('returns 429 when per-user profile ensure requests exceed route limit', async () => {
    mockUpsert.mockResolvedValue({ error: null });
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'rate-user', email: 'rate@example.com' } },
        }),
      },
      from: vi.fn(() => ({ upsert: mockUpsert })),
    });

    let response: Awaited<ReturnType<typeof POST>> | null = null;
    for (let i = 0; i < 11; i += 1) {
      response = await POST(makeRequest());
    }

    expect(response).not.toBeNull();
    if (!response) throw new Error('Expected response');
    expect(response.status).toBe(429);
  });

  it('triggers periodic profile ensure rate-limit cleanup path', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    let counter = 0;

    mockUpsert.mockResolvedValue({ error: null });
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockImplementation(async () => {
          counter += 1;
          return {
            data: { user: { id: `cleanup-profile-${counter}`, email: `u${counter}@x.com` } },
          };
        }),
      },
      from: vi.fn(() => ({ upsert: mockUpsert })),
    });

    let response: Awaited<ReturnType<typeof POST>> | null = null;
    for (let i = 0; i < 25; i += 1) {
      if (i === 10) {
        vi.setSystemTime(new Date('2026-01-01T00:01:05.000Z'));
      }
      response = await POST(makeRequest());
      expect(response.status).toBe(200);
    }

    expect(response).not.toBeNull();
    vi.useRealTimers();
  });
});
