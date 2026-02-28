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

  it('returns safe generic messages for empty or invalid error payloads', () => {
    expect(mapAuthError('', 'login')).toBe('Unable to sign in right now. Please try again later.');
    expect(mapAuthError('', 'register')).toBe('Unable to create account. Please try again later.');
    expect(mapAuthError(undefined as unknown as string, 'login')).toBe(
      'Unable to sign in right now. Please try again later.'
    );
    expect(mapAuthError(null as unknown as string, 'register')).toBe(
      'Unable to create account. Please try again later.'
    );
  });

  it('keeps unknown login errors generic to avoid leaking internal details', () => {
    expect(mapAuthError('User not found in table auth.users', 'login')).toBe(
      'Unable to sign in right now. Please try again later.'
    );
    expect(mapAuthError('database timeout while querying account', 'login')).toBe(
      'Unable to sign in right now. Please try again later.'
    );
  });

  it('maps rate-limit variants for both login and register', () => {
    expect(mapAuthError('Too many requests', 'login')).toBe(
      'Too many attempts. Please wait a moment and try again.'
    );
    expect(mapAuthError('Rate limit exceeded', 'register')).toBe(
      'Too many attempts. Please wait a moment and try again.'
    );
  });

  it('does not misclassify non-email confirmation errors as email confirmation failures', () => {
    expect(mapAuthError('phone number not confirmed', 'login')).toBe(
      'Unable to sign in right now. Please try again later.'
    );
  });
});
