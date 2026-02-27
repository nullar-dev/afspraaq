'use client';

import { useEffect, useState, useMemo } from 'react';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import Link from 'next/link';
import { getSupabaseClient } from '@/utils/supabase/client';

export default function Home() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => getSupabaseClient(), []);

  useEffect(() => {
    const getUser = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUser(user);
      } catch {
        // Ignore auth errors in UI
      } finally {
        setLoading(false);
      }
    };

    getUser();

    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSignOut = async () => {
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  if (loading) {
    return <main>Loading...</main>;
  }

  return (
    <main>
      <h1>Welcome to Afspraaq</h1>
      <p>{supabase ? 'Authentication Ready' : 'Demo Mode'}</p>

      {user ? (
        <section>
          <p>{user.email ?? 'No email'}</p>
          <button onClick={handleSignOut}>Sign Out</button>
        </section>
      ) : (
        <section>
          <Link href="/login">Sign In</Link>
          {' | '}
          <Link href="/register">Get Started</Link>
        </section>
      )}
    </main>
  );
}
