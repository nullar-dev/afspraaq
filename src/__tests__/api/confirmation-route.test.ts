import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, __resetRateLimitStoreForTests } from '@/app/api/bookings/confirmation/route';

const mockCreateClient = vi.fn();

vi.mock('@/utils/supabase/server', () => ({
  createClient: () => mockCreateClient(),
}));

describe('bookings confirmation route', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.ALLOWED_ORIGINS;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    __resetRateLimitStoreForTests();
  });

  it('returns 403 when origin is missing or invalid', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
      },
    });

    const request = new NextRequest('http://localhost:3000/api/bookings/confirmation', {
      method: 'POST',
      headers: {
        'x-requested-with': 'XMLHttpRequest',
      },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe('forbidden_origin');
    expect(body.error.message).toBe('Forbidden');
    expect(body.error.supportCode).toMatch(/^SUP-[A-F0-9]{8}$/);
  });

  it('fails closed in production when ALLOWED_ORIGINS is missing', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    delete process.env.ALLOWED_ORIGINS;

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
      },
    });

    const request = new NextRequest('https://nullar.dev/api/bookings/confirmation', {
      method: 'POST',
      headers: {
        origin: 'https://nullar.dev',
        'x-requested-with': 'XMLHttpRequest',
      },
    });

    const response = await POST(request);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe('forbidden_origin');
  });

  it('returns 403 when origin header is missing', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
      },
    });

    const request = new NextRequest('http://localhost:3000/api/bookings/confirmation', {
      method: 'POST',
      headers: {
        'x-requested-with': 'XMLHttpRequest',
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it('returns 405 for unsupported GET method', async () => {
    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(405);
    expect(body.error.code).toBe('method_not_allowed');
  });

  it('returns 503 when auth client is unavailable', async () => {
    mockCreateClient.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/bookings/confirmation', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
        'x-requested-with': 'XMLHttpRequest',
      },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error.code).toBe('auth_unavailable');
    expect(body.error.message).toBe('Authentication unavailable');
    expect(body.error.supportCode).toMatch(/^SUP-[A-F0-9]{8}$/);
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('returns 401 when user is unauthenticated', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    });

    const request = new NextRequest('http://localhost:3000/api/bookings/confirmation', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
        'x-requested-with': 'XMLHttpRequest',
      },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('unauthenticated');
    expect(body.error.message).toBe('Unauthorized');
    expect(body.error.supportCode).toMatch(/^SUP-[A-F0-9]{8}$/);
    expect(response.headers.get('x-frame-options')).toBe('DENY');
  });

  it('returns a high-entropy confirmation code for authenticated users', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
      },
    });

    const request = new NextRequest('http://localhost:3000/api/bookings/confirmation', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
        'x-requested-with': 'XMLHttpRequest',
      },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.code).toMatch(/^GC-[A-F0-9]{32}$/);
    expect(response.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
  });

  it('allows explicit origin allowlist via ALLOWED_ORIGINS', async () => {
    process.env.ALLOWED_ORIGINS = 'https://app.example.com,https://admin.example.com';
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
      },
    });

    const request = new NextRequest('https://app.example.com/api/bookings/confirmation', {
      method: 'POST',
      headers: {
        origin: 'https://admin.example.com',
        'x-requested-with': 'XMLHttpRequest',
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });

  it('returns 429 when per-user confirmation requests exceed route limit', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'rate-user' } } }),
      },
    });

    const request = new NextRequest('http://localhost:3000/api/bookings/confirmation', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
        'x-requested-with': 'XMLHttpRequest',
        'x-forwarded-for': '203.0.113.10',
      },
    });

    let response: Awaited<ReturnType<typeof POST>> | null = null;
    for (let i = 0; i < 31; i += 1) {
      response = await POST(request);
      if (i < 30) {
        expect(response.status).toBe(200);
      }
    }

    expect(response).not.toBeNull();
    if (!response) throw new Error('Expected a response from POST');
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBeTruthy();
  });
});
