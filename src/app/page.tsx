'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User } from 'lucide-react';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getUser();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-md border-b border-[#2A2A2A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[72px]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-gold-light flex items-center justify-center">
                <span className="text-[#0A0A0A] font-bold text-lg">A</span>
              </div>
              <span className="text-white font-semibold text-xl">Afspraaq</span>
            </div>

            <div className="flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-[#B0B0B0]">
                    <User className="w-5 h-5" />
                    <span className="text-sm">{user.email}</span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="px-4 py-2 text-sm font-medium text-white bg-[#1E1E1E] hover:bg-[#252525] rounded-lg transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <a
                    href="/login"
                    className="px-4 py-2 text-sm font-medium text-[#B0B0B0] hover:text-white transition-colors"
                  >
                    Sign In
                  </a>
                  <a
                    href="/register"
                    className="px-4 py-2 text-sm font-semibold bg-gold hover:bg-gold-light text-[#0A0A0A] rounded-lg transition-colors"
                  >
                    Get Started
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-[72px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 text-gold text-sm font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
              Authentication Ready
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              Welcome to <span className="text-gradient-gold">Afspraaq</span>
            </h1>

            <p className="text-[#B0B0B0] text-lg sm:text-xl max-w-2xl mx-auto mb-10">
              Your scheduling and booking system is ready.
              {user ? ' You are signed in!' : ' Sign up to get started.'}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {user ? (
                <button
                  onClick={handleSignOut}
                  className="px-8 py-3 text-base font-semibold bg-gold hover:bg-gold-light text-[#0A0A0A] rounded-xl transition-all hover:shadow-gold-lg"
                >
                  Sign Out
                </button>
              ) : (
                <>
                  <a
                    href="/register"
                    className="px-8 py-3 text-base font-semibold bg-gold hover:bg-gold-light text-[#0A0A0A] rounded-xl transition-all hover:shadow-gold-lg"
                  >
                    Get Started
                  </a>
                  <a
                    href="/login"
                    className="px-8 py-3 text-base font-medium text-white bg-[#1E1E1E] hover:bg-[#252525] border border-[#2A2A2A] rounded-xl transition-all"
                  >
                    Sign In
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Status Cards */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[#141414] border border-[#2A2A2A] animate-fade-in-up stagger-1">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4">
                <User className="w-6 h-6 text-green-500" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">Authentication</h3>
              <p className="text-[#6B6B6B] text-sm">
                {user ? 'You are signed in' : 'Not signed in'}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#141414] border border-[#2A2A2A] animate-fade-in-up stagger-2">
              <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center mb-4">
                <span className="text-gold">🔗</span>
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">Database</h3>
              <p className="text-[#6B6B6B] text-sm">Connected to Supabase</p>
            </div>

            <div className="p-6 rounded-2xl bg-[#141414] border border-[#2A2A2A] animate-fade-in-up stagger-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                <span className="text-blue-500">🚀</span>
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">Deployment</h3>
              <p className="text-[#6B6B6B] text-sm">Running on Coolify</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
