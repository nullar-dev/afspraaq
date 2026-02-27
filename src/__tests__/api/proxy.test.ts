import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '@/proxy';

const mockCreateServerClient = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}));

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

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/login');
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

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/');
  });
});
