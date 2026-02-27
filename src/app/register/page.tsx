'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '@/utils/supabase/client';

export default function RegisterPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    if (!supabase) {
      setError('Registration is not available. Please try again later.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      const errorMsg = error.message.toLowerCase();
      if (errorMsg.includes('password')) {
        setError('Password does not meet requirements.');
      } else if (errorMsg.includes('too many requests')) {
        setError('Too many attempts. Please wait a moment and try again.');
      } else {
        setError('Unable to create account. Please try again later.');
      }
      setLoading(false);
      return;
    }

    router.push('/login?registered=true');
  };

  return (
    <main>
      <h1>Create Account</h1>
      <p>Sign up to get started</p>

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
            placeholder="At least 8 characters"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            type="password"
            placeholder="Repeat your password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        {error && <p>{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <p>
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
      <p>
        <Link href="/">Back to home</Link>
      </p>
    </main>
  );
}
