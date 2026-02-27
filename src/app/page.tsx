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
        // ignore
      } finally {
        setLoading(false);
      }
    };

    getUser();

    if (supabase) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
        setUser(session?.user ?? null);
      });

      return () => subscription.unsubscribe();
    }
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
    return (
      <div className="page">
        <div className="spinner" data-testid="loading-spinner" />
      </div>
    );
  }

  return (
    <main className="page">
      <div className="card">
        <h1>Welcome to Afspraaq</h1>
        <p>{supabase ? 'Authentication Ready' : 'Demo Mode'}</p>

        {user ? (
          <>
            <p>{user.email ?? 'No email'}</p>
            <button onClick={handleSignOut}>Sign Out</button>
          </>
        ) : (
          <div>
            <Link href="/login">Sign In</Link>
            {' | '}
            <Link href="/register">Get Started</Link>
          </div>
        )}
      </div>
    </main>
  );
}
