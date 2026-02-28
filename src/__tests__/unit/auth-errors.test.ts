import { describe, expect, it } from 'vitest';
import { mapAuthError } from '@/lib/auth-errors';

describe('mapAuthError', () => {
  it('maps email-not-confirmed login errors to verification guidance', () => {
    expect(mapAuthError('email_not_confirmed', 'login')).toBe(
      'Please verify your email before signing in.'
    );
    expect(mapAuthError('Email not confirmed', 'login')).toBe(
      'Please verify your email before signing in.'
    );
  });

  it('keeps login failure generic for invalid credentials', () => {
    expect(mapAuthError('Invalid login credentials', 'login')).toBe('Invalid email or password.');
  });

  it('maps register errors without account enumeration', () => {
    expect(mapAuthError('User already registered', 'register')).toBe(
      'Unable to create account. Please try again later.'
    );
    expect(mapAuthError('Password does not meet requirements', 'register')).toBe(
      'Password does not meet requirements.'
    );
  });
});
