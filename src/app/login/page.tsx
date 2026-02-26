'use client';

import { useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { getSupabaseClient } from '@/utils/supabase/client';
import { inputClasses } from '@/lib/styles';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const successMessage = useMemo(() => {
    return searchParams.get('registered') === 'true'
      ? 'Account created successfully! Please sign in.'
      : '';
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!supabase) {
      setError('Authentication is not available. Please try again later.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Custom error messages - don't expose raw Supabase errors
      const errorMsg = error.message.toLowerCase();
      if (
        errorMsg.includes('invalid login credentials') ||
        errorMsg.includes('invalid credentials')
      ) {
        setError('Invalid email or password. Please try again.');
      } else if (errorMsg.includes('too many requests')) {
        setError('Too many attempts. Please wait a moment and try again.');
      } else {
        setError('Unable to sign in. Please check your credentials and try again.');
      }
      setLoading(false);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold to-gold-light flex items-center justify-center mx-auto mb-4 animate-pulse-gold">
            <Lock className="w-8 h-8 text-[#0A0A0A]" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Welcome Back</h1>
          <p className="text-[#B0B0B0] text-base">Sign in to continue to your account</p>
        </div>

        {/* Login Form */}
        <div className="bg-gradient-to-br from-[#141414] to-[#0F0F0F] rounded-2xl border border-[#2A2A2A] p-5 sm:p-8 animate-fade-in-up">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className={`text-sm font-medium flex items-center gap-2 transition-colors ${
                  focusedField === 'email' ? 'text-gold' : 'text-[#B0B0B0]'
                }`}
              >
                <Mail className="w-4 h-4" />
                Email Address
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  className={inputClasses(focusedField, 'email')}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className={`text-sm font-medium flex items-center gap-2 transition-colors ${
                  focusedField === 'password' ? 'text-gold' : 'text-[#B0B0B0]'
                }`}
              >
                <Lock className="w-4 h-4" />
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  className={inputClasses(focusedField, 'password')}
                  required
                />
              </div>
            </div>

            {/* Success */}
            {successMessage && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 text-sm">
                {successMessage}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-base font-semibold bg-gold hover:bg-gold-light text-[#0A0A0A] transition-all duration-300 rounded-xl"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-[#0A0A0A]/30 border-t-[#0A0A0A] rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign In
                  <ArrowRight className="w-5 h-5" />
                </span>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="h-px bg-gradient-to-r from-transparent via-[#2A2A2A] to-transparent" />
          </div>

          {/* Register Link */}
          <p className="text-center text-[#B0B0B0] text-sm">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="text-gold hover:text-gold-light font-medium transition-colors"
            >
              Create one
            </Link>
          </p>
        </div>

        {/* Back to Home */}
        <p className="text-center mt-6">
          <Link href="/" className="text-[#6B6B6B] hover:text-gold text-sm transition-colors">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}

export function LoginFormFallback() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4 py-10">
      <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginForm />
    </Suspense>
  );
}
