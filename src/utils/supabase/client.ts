import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseClient() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Return null if env vars are missing or are placeholder values (CI/testing)
  if (!url || !key || url.includes('placeholder') || key === 'placeholder-key') {
    return null;
  }

  try {
    client = createBrowserClient(url, key);
  } catch {
    // If client creation fails (e.g., invalid URL), return null
    client = null;
  }
  return client;
}

// Export for backwards compatibility
export function createClient() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase client not available');
  }
  return supabase;
}
