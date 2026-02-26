import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createClient } from '@/utils/supabase/client';

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
    // Set required env vars for tests
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should create browser client with env vars', () => {
    const client = createClient();
    expect(client).toBeDefined();
  });

  it('should throw when SUPABASE_URL is missing', () => {
    vi.unstubAllEnvs();
    vi.resetModules();
    // Need fresh import after env reset
    expect(() => {
      const { createClient } = require('../../../utils/supabase/client');
      createClient();
    }).toThrow();
  });

  it('should throw when env var is empty string', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key');
    vi.resetModules();
    expect(() => {
      const { createClient } = require('../../../utils/supabase/client');
      createClient();
    }).toThrow();
  });
});
