'use client';

import { useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { getSupabaseClient } from '@/utils/supabase/client';

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#0A0A0A',
  padding: '40px 20px',
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '420px',
  backgroundColor: '#141414',
  borderRadius: '16px',
  border: '1px solid #2A2A2A',
  padding: '32px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '20px 16px',
  borderRadius: '12px',
  border: '2px solid #2A2A2A',
  backgroundColor: '#1E1E1E',
  color: '#FFFFFF',
  fontSize: '16px',
  boxSizing: 'border-box',
};

const inputFocusedStyle: React.CSSProperties = {
  ...inputStyle,
  borderColor: '#D4A853',
  boxShadow: '0 0 0 2px rgba(212, 168, 83, 0.2)',
};

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
    } else {
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ color: '#FFFFFF', fontSize: '28px', marginBottom: '8px' }}>Welcome Back</h1>
          <p style={{ color: '#B0B0B0', fontSize: '14px' }}>Sign in to continue to your account</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <Label
              htmlFor="email"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: focusedField === 'email' ? '#D4A853' : '#B0B0B0',
                fontSize: '14px',
                marginBottom: '8px',
              }}
            >
              <Mail size={16} /> Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              style={focusedField === 'email' ? inputFocusedStyle : inputStyle}
              required
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <Label
              htmlFor="password"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: focusedField === 'password' ? '#D4A853' : '#B0B0B0',
                fontSize: '14px',
                marginBottom: '8px',
              }}
            >
              <Lock size={16} /> Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              style={focusedField === 'password' ? inputFocusedStyle : inputStyle}
              required
            />
          </div>

          {successMessage && (
            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                color: '#22C55E',
                fontSize: '14px',
                marginBottom: '16px',
              }}
            >
              {successMessage}
            </div>
          )}
          {error && (
            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#EF4444',
                fontSize: '14px',
                marginBottom: '16px',
              }}
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              backgroundColor: '#D4A853',
              color: '#0A0A0A',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {loading ? (
              'Signing in...'
            ) : (
              <>
                <span>Sign In</span> <ArrowRight size={18} />
              </>
            )}
          </Button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <p style={{ color: '#B0B0B0', fontSize: '14px', marginBottom: '8px' }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" style={{ color: '#D4A853' }}>
              Create one
            </Link>
          </p>
          <p>
            <Link href="/" style={{ color: '#6B6B6B', fontSize: '14px' }}>
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export function LoginFormFallback() {
  return (
    <div style={pageStyle}>
      <div
        data-testid="loading-spinner"
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

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginForm />
    </Suspense>
  );
}
