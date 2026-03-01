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
  '/admin',
  '/booking/vehicle',
  '/booking/services',
  '/booking/schedule',
  '/booking/customer',
  '/booking/payment',
]);

const SAFE_LOGIN_MESSAGES = new Set([
  'Invalid email or password.',
  'Please verify your email before signing in.',
  'Too many attempts. Please wait a moment and try again.',
  'Unable to sign in right now. Please try again later.',
  'Authentication is unavailable.',
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
      const rememberedEmail = sessionStorage.getItem('rememberedEmail');
      if (rememberedEmail) {
        setEmail(rememberedEmail);
        setRememberMe(true);
      }
    } catch {
      // Storage can be unavailable in some browser privacy modes.
    }
  }, []);

  const toSafeLoginError = (err: unknown) => {
    if (!(err instanceof Error)) return 'Unable to sign in. Please try again.';
    const message = err.message.trim();
    if (SAFE_LOGIN_MESSAGES.has(message)) return message;
    return 'Unable to sign in. Please try again.';
  };

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
      try {
        if (rememberMe) {
          sessionStorage.setItem('rememberedEmail', email.trim().toLowerCase());
        } else {
          sessionStorage.removeItem('rememberedEmail');
        }
      } catch {
        // Storage can be unavailable in some browser privacy modes.
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
      setError(toSafeLoginError(err));
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
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M21.35 11.1h-9.18v2.98h5.27c-.23 1.5-1.13 2.77-2.42 3.62v2.25h3.9c2.28-2.1 3.58-5.2 3.58-8.85c0-.6-.05-1.18-.15-1.75"
              />
              <path
                fill="currentColor"
                d="M12.17 22c3.24 0 5.95-1.07 7.93-2.9l-3.9-2.25c-1.08.73-2.47 1.16-4.03 1.16c-3.1 0-5.73-2.1-6.66-4.92H1.5v2.33A9.83 9.83 0 0 0 12.17 22"
              />
              <path
                fill="currentColor"
                d="M5.51 13.09a5.9 5.9 0 0 1 0-3.76V7H1.5a9.83 9.83 0 0 0 0 8.42z"
              />
              <path
                fill="currentColor"
                d="M12.17 5.99c1.76 0 3.34.6 4.58 1.78l3.43-3.43A9.72 9.72 0 0 0 12.17 2A9.83 9.83 0 0 0 1.5 7l4.01 2.33c.93-2.82 3.56-4.92 6.66-4.92"
              />
            </svg>
            Continue with Google
          </button>
          <button
            disabled
            title="OAuth sign-in coming soon"
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 sm:py-4 rounded-xl bg-[#2F2F2F] text-white font-medium border border-[#3A3A3A] opacity-60 cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M2 3h9.5v9.5H2zM12.5 3H22v9.5h-9.5zM2 13.5h9.5V23H2zM12.5 13.5H22V23h-9.5z"
              />
            </svg>
            Continue with Microsoft
          </button>
          <button
            disabled
            title="OAuth sign-in coming soon"
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 sm:py-4 rounded-xl bg-[#000000] text-white font-medium border border-[#2A2A2A] opacity-60 cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M16.72 12.86c-.03-2.53 2.07-3.75 2.16-3.8c-1.18-1.72-3-1.95-3.64-1.98c-1.55-.16-3.03.91-3.82.91s-2-.89-3.29-.87c-1.69.03-3.25.98-4.12 2.5c-1.76 3.05-.45 7.55 1.27 10.04c.84 1.21 1.84 2.56 3.16 2.51c1.27-.05 1.75-.82 3.29-.82c1.54 0 1.97.82 3.31.79c1.37-.03 2.23-1.24 3.07-2.45c.97-1.4 1.37-2.76 1.39-2.83c-.03-.01-2.66-1.02-2.69-4zM14.22 5.43c.7-.85 1.17-2.03 1.04-3.2c-1.01.04-2.24.67-2.96 1.52c-.65.75-1.22 1.95-1.07 3.1c1.13.09 2.29-.57 2.99-1.42"
              />
            </svg>
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
          <Lock className="w-3.5 h-3.5" />
          <span>Secured with 256-bit encryption</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
