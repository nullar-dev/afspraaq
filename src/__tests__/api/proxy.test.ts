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

describe('proxy proxy', () => {
  const originalEnv = process.env;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('redirects protected routes to /login when Supabase env is unavailable', async () => {
    const request = new NextRequest('http://localhost:3000/booking/vehicle');

    const response = await proxy(request);
    const redirectUrl = getRedirectUrl(response.headers.get('location'));

    expect(response.status).toBe(307);
    expect(redirectUrl.pathname).toBe('/login');
    expect(redirectUrl.searchParams.get('redirect')).toBeNull();
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('allows public auth routes when Supabase env is unavailable', async () => {
    const request = new NextRequest('http://localhost:3000/login');

    const response = await proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('x-frame-options')).toBe('DENY');
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
    expect(redirectUrl.searchParams.get('redirect')).toBe('/booking/vehicle');
    expect(consoleWarnSpy).toHaveBeenCalled();
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
    expect(redirectUrl.searchParams.get('redirect')).toBe('/booking/vehicle');
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
    expect(redirectUrl.searchParams.get('redirect')).toBe('/booking/vehicle');
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
    expect(redirectUrl.searchParams.get('redirect')).toBe('/booking/vehicle');
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

  it('preserves /admin as safe redirect target for unauthenticated requests', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

    mockCreateServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    });

    const request = new NextRequest('http://localhost:3000/admin');
    const response = await proxy(request);
    const redirectUrl = getRedirectUrl(response.headers.get('location'));

    expect(response.status).toBe(307);
    expect(redirectUrl.pathname).toBe('/login');
    expect(redirectUrl.searchParams.get('redirect')).toBe('/admin');
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });
});
