import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the entire @supabase/ssr module
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => ({
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
    },
  })),
}));

describe('Supabase Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the module to clear cached client
    vi.resetModules();
    // Set required env vars for tests
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('should create browser client with env vars', async () => {
    const { createClient } = await import('@/utils/supabase/client');
    const client = createClient();
    expect(client).toBeDefined();
  });

  it('should return null from getSupabaseClient when URL is missing', async () => {
    vi.unstubAllEnvs();
    vi.resetModules();

    const { getSupabaseClient } = await import('@/utils/supabase/client');
    const client = getSupabaseClient();
    expect(client).toBeNull();
  });

  it('should return null from getSupabaseClient when key is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    vi.resetModules();

    const { getSupabaseClient } = await import('@/utils/supabase/client');
    const client = getSupabaseClient();
    expect(client).toBeNull();
  });

  it('should throw when createClient is called without env vars', async () => {
    vi.unstubAllEnvs();
    vi.resetModules();

    const { createClient } = await import('@/utils/supabase/client');
    expect(() => createClient()).toThrow('Supabase client not available');
  });

  it('should cache and return same client instance', async () => {
    vi.resetModules();
    const { getSupabaseClient } = await import('@/utils/supabase/client');

    const client1 = getSupabaseClient();
    const client2 = getSupabaseClient();

    expect(client1).toBe(client2);
  });
});
