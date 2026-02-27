'use client';

import { useEffect, useState, useMemo } from 'react';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import Link from 'next/link';
import { getSupabaseClient } from '@/utils/supabase/client';

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#0A0A0A',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: '#141414',
  borderRadius: '16px',
  border: '1px solid #2A2A2A',
  padding: '48px',
  textAlign: 'center',
};

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
      <div style={pageStyle}>
        <div
          style={{
            width: '24px',
            height: '24px',
            border: '2px solid rgba(212, 168, 83, 0.3)',
            borderTopColor: '#D4A853',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
      </div>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={{ color: '#FFFFFF', fontSize: '32px', marginBottom: '16px' }}>
          Welcome to Afspraaq
        </h1>
        <p style={{ color: '#B0B0B0', fontSize: '16px', marginBottom: '24px' }}>
          {supabase ? 'Authentication Ready' : 'Demo Mode'}
        </p>

        {user ? (
          <div>
            <p style={{ color: '#FFFFFF', marginBottom: '16px' }}>{user.email ?? 'No email'}</p>
            <button
              onClick={handleSignOut}
              style={{
                padding: '12px 24px',
                backgroundColor: '#D4A853',
                color: '#0A0A0A',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <Link href="/login" style={{ color: '#D4A853' }}>
              Sign In
            </Link>
            <span style={{ color: '#6B6B6B' }}>|</span>
            <Link href="/register" style={{ color: '#D4A853' }}>
              Get Started
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
