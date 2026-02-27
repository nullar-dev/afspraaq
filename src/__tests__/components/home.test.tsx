import { beforeEach, describe, expect, it, vi } from 'vitest';
import Home from '../../app/page';

const mockRedirect = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});

const mockCreateClient = vi.fn();

vi.mock('next/navigation', () => ({
  redirect: (path: string) => mockRedirect(path),
}));

vi.mock('../../utils/supabase/server', () => ({
  createClient: () => mockCreateClient(),
}));

describe('Home Page Redirects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to login when Supabase client is unavailable', async () => {
    mockCreateClient.mockResolvedValueOnce(null);

    await expect(Home()).rejects.toThrow('REDIRECT:/login');
  });

  it('redirects authenticated users to booking', async () => {
    mockCreateClient.mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: '123', email: 'test@example.com' } },
        }),
      },
    });

    await expect(Home()).rejects.toThrow('REDIRECT:/booking/vehicle');
  });

  it('redirects unauthenticated users to login', async () => {
    mockCreateClient.mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
        }),
      },
    });

    await expect(Home()).rejects.toThrow('REDIRECT:/login');
  });
});
