'use client';

import { useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '@/utils/supabase/client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const successMessage = useMemo(
    () =>
      searchParams.get('registered') === 'true'
        ? 'Account created successfully! Please sign in.'
        : '',
    [searchParams]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!supabase) {
      setError('Authentication is not available. Please try again later.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
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
      return;
    }

    const redirectParam = searchParams.get('redirect');
    const safeRedirect =
      redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')
        ? redirectParam
        : '/';
    router.push(safeRedirect);
    router.refresh();
  };

  return (
    <main>
      <h1>Welcome Back</h1>
      <p>Sign in to continue to your account</p>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            placeholder="john@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>

        {successMessage && <p>{successMessage}</p>}
        {error && <p>{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p>
        Don&apos;t have an account? <Link href="/register">Create one</Link>
      </p>
      <p>
        <Link href="/">Back to home</Link>
      </p>
    </main>
  );
}

export function LoginFormFallback() {
  return (
    <main>
      <div data-testid="loading-spinner">Loading...</div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginForm />
    </Suspense>
  );
}
