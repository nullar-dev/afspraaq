import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '@/proxy';

const mockCreateServerClient = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}));

const getRedirectUrl = (location: string | null) => {
  expect(location).toBeTruthy();
  return new URL(location!);
};

describe('proxy middleware', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it('redirects protected routes to /login when Supabase env is unavailable', async () => {
    const request = new NextRequest('http://localhost:3000/booking/vehicle');

    const response = await proxy(request);
    const redirectUrl = getRedirectUrl(response.headers.get('location'));

    expect(response.status).toBe(307);
    expect(redirectUrl.pathname).toBe('/login');
    expect(redirectUrl.searchParams.get('redirect')).toBeNull();
  });

  it('allows public auth routes when Supabase env is unavailable', async () => {
    const request = new NextRequest('http://localhost:3000/login');

    const response = await proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('redirects authenticated users away from /login to /', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

    mockCreateServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'u1', email: 'user@example.com' } },
        }),
      },
    });

    const request = new NextRequest('http://localhost:3000/login');
    const response = await proxy(request);
    const redirectUrl = getRedirectUrl(response.headers.get('location'));

    expect(response.status).toBe(307);
    expect(redirectUrl.pathname).toBe('/');
  });

  it('allows authenticated users to access protected routes', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

    mockCreateServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'u1', email: 'user@example.com' } },
        }),
      },
    });

    const request = new NextRequest('http://localhost:3000/booking/vehicle');
    const response = await proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('redirects to /login when getUser rejects', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

    mockCreateServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockRejectedValue(new Error('Network error')),
      },
    });

    const request = new NextRequest('http://localhost:3000/booking/vehicle');
    const response = await proxy(request);
    const redirectUrl = getRedirectUrl(response.headers.get('location'));

    expect(response.status).toBe(307);
    expect(redirectUrl.pathname).toBe('/login');
    expect(redirectUrl.searchParams.get('redirect')).toBe('/');
  });

  it('redirects to /login when getUser resolves with null user', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

    mockCreateServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    });

    const request = new NextRequest('http://localhost:3000/booking/vehicle');
    const response = await proxy(request);
    const redirectUrl = getRedirectUrl(response.headers.get('location'));

    expect(response.status).toBe(307);
    expect(redirectUrl.pathname).toBe('/login');
    expect(redirectUrl.searchParams.get('redirect')).toBe('/');
  });

  it('sanitizes external redirect query values to avoid open redirects', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

    mockCreateServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    });

    const request = new NextRequest(
      'http://localhost:3000/booking/vehicle?redirect=https://evil.com/phish'
    );
    const response = await proxy(request);
    const redirectUrl = getRedirectUrl(response.headers.get('location'));

    expect(response.status).toBe(307);
    expect(redirectUrl.pathname).toBe('/login');
    expect(redirectUrl.searchParams.get('redirect')).toBe('/');
  });

  it('sanitizes malformed redirect query values with CRLF characters', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

    mockCreateServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    });

    const request = new NextRequest(
      'http://localhost:3000/booking/vehicle?redirect=%2Fsafe%0D%0ASet-Cookie%3Aevil%3D1'
    );
    const response = await proxy(request);
    const redirectUrl = getRedirectUrl(response.headers.get('location'));

    expect(response.status).toBe(307);
    expect(redirectUrl.pathname).toBe('/login');
    expect(redirectUrl.searchParams.get('redirect')).toBe('/');
  });

  it('handles unexpected getUser response shape by redirecting safely', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

    mockCreateServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: {} }),
      },
    });

    const request = new NextRequest(
      'http://localhost:3000/booking/vehicle?redirect=/booking/payment'
    );
    const response = await proxy(request);
    const redirectUrl = getRedirectUrl(response.headers.get('location'));

    expect(response.status).toBe(307);
    expect(redirectUrl.pathname).toBe('/login');
    expect(redirectUrl.searchParams.get('redirect')).toBe('/booking/payment');
  });
});
