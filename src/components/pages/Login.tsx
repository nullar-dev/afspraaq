'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Check, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const ALLOWED_REDIRECTS = new Set([
  '/',
  '/booking/vehicle',
  '/booking/services',
  '/booking/schedule',
  '/booking/customer',
  '/booking/payment',
]);

const Login: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, state } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email: string | null; password: string | null }>(
    { email: null, password: null }
  );

  const successMessage = useMemo(
    () =>
      searchParams.get('registered') === 'true'
        ? 'Account created successfully! Please sign in.'
        : '',
    [searchParams]
  );

  useEffect(() => {
    try {
      const rememberedEmail = localStorage.getItem('rememberedEmail');
      if (rememberedEmail) {
        setEmail(rememberedEmail);
        setRememberMe(true);
      }
    } catch {
      // Storage can be unavailable in some browser privacy modes.
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextFieldErrors: { email: string | null; password: string | null } = {
      email: null,
      password: null,
    };
    if (!email.trim()) nextFieldErrors.email = 'Email is required.';
    if (!password) nextFieldErrors.password = 'Password is required.';
    setFieldErrors(nextFieldErrors);
    if (nextFieldErrors.email || nextFieldErrors.password) {
      setError('Please correct the highlighted fields.');
      return;
    }
    if (isSubmitting || state.isLoading) return;

    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password);
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      const redirectParam = searchParams.get('redirect');
      const safeRedirect =
        redirectParam &&
        redirectParam.length <= 200 &&
        redirectParam.startsWith('/') &&
        !redirectParam.startsWith('//') &&
        !redirectParam.includes('\\') &&
        !redirectParam.includes('\n') &&
        !redirectParam.includes('\r') &&
        ALLOWED_REDIRECTS.has(redirectParam)
          ? redirectParam
          : '/booking/vehicle';
      router.push(safeRedirect);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClasses = (fieldName: string) => `
    bg-[#1E1E1E] border-2 text-white placeholder:text-[#4A4A4A]
    transition-all duration-300 rounded-xl py-5 sm:py-6 pl-12 pr-4
    ${
      focusedField === fieldName
        ? 'border-gold shadow-gold ring-2 ring-gold/20'
        : 'border-[#2A2A2A] hover:border-[#3A3A3A]'
    }
  `;

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4 sm:px-6 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 sm:mb-10">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gold to-gold-light flex items-center justify-center shadow-gold animate-pulse-gold">
            <svg
              className="w-8 h-8 sm:w-10 sm:h-10 text-[#0A0A0A]"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-[#B0B0B0]">Sign in to continue your booking</p>
        </div>

        <div className="space-y-3 mb-6">
          <button
            disabled
            title="OAuth sign-in coming soon"
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 sm:py-4 rounded-xl bg-white text-[#0A0A0A] font-medium opacity-60 cursor-not-allowed"
          >
            Continue with Google
          </button>
          <button
            disabled
            title="OAuth sign-in coming soon"
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 sm:py-4 rounded-xl bg-[#2F2F2F] text-white font-medium border border-[#3A3A3A] opacity-60 cursor-not-allowed"
          >
            Continue with Microsoft
          </button>
          <button
            disabled
            title="OAuth sign-in coming soon"
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 sm:py-4 rounded-xl bg-[#000000] text-white font-medium border border-[#2A2A2A] opacity-60 cursor-not-allowed"
          >
            Continue with Apple
          </button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-[#2A2A2A]" />
          <span className="text-[#6B6B6B] text-sm">or continue with email</span>
          <div className="flex-1 h-px bg-[#2A2A2A]" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
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
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onInput={() => setFieldErrors(prev => ({ ...prev, email: null }))}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                className={inputClasses('email')}
                autoComplete="email"
                inputMode="email"
                required
              />
              {fieldErrors.email && (
                <p className="text-red-400 text-xs mt-2">{fieldErrors.email}</p>
              )}
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <Mail className="w-5 h-5 text-[#6B6B6B]" />
              </div>
            </div>
          </div>

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
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onInput={() => setFieldErrors(prev => ({ ...prev, password: null }))}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                className={`${inputClasses('password')} pr-12`}
                autoComplete="current-password"
                required
              />
              {fieldErrors.password && (
                <p className="text-red-400 text-xs mt-2">{fieldErrors.password}</p>
              )}
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <Lock className="w-5 h-5 text-[#6B6B6B]" />
              </div>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B6B6B] hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {successMessage && (
            <p className="text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-lg p-3">
              {successMessage}
            </p>
          )}
          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="sr-only"
                aria-label="Remember me"
              />
              <div
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
                  rememberMe ? 'bg-gold border-gold' : 'border-[#4A4A4A] group-hover:border-gold/50'
                }`}
              >
                {rememberMe && <Check className="w-3 h-3 text-[#0A0A0A]" />}
              </div>
              <span className="text-sm text-[#B0B0B0] group-hover:text-white transition-colors">
                Remember me
              </span>
            </label>
            <button
              type="button"
              disabled
              className="text-sm text-[#6B6B6B] cursor-not-allowed"
              title="Password reset coming soon"
            >
              Forgot password?
            </button>
          </div>

          <Button
            type="submit"
            disabled={state.isLoading || isSubmitting || !email || !password}
            className="w-full bg-gold hover:bg-gold-light text-[#0A0A0A] font-bold py-5 sm:py-6 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-gold disabled:opacity-50 disabled:cursor-not-allowed text-base sm:text-lg"
          >
            {state.isLoading || isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
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

        <p className="mt-6 text-center text-[#B0B0B0]">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="text-gold hover:text-gold-light font-semibold transition-colors"
          >
            Create one
          </Link>
        </p>

        <div className="mt-8 flex items-center justify-center gap-2 text-[#4A4A4A] text-xs">
          <span>Secured with 256-bit encryption</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
