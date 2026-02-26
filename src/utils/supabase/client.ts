import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseClient() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  client = createBrowserClient(url, key);
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
