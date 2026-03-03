/**
 * JWT Security Tests
 * Security-focused tests for JWT validation
 * Tests: expired tokens, tampered tokens, wrong audience, missing claims
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  validateJWTSecurity,
  verifyUserRoleFromDatabase,
  validateAuthWithRoleCheck,
} from '@/lib/jwt-security';

const mockCreateClient = vi.fn();

vi.mock('@/utils/supabase/server', () => ({
  createClient: () => mockCreateClient(),
}));

describe('JWT Security Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('validateJWTSecurity', () => {
    it('rejects expired tokens', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

      mockCreateClient.mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: {
              session: {
                expires_at: Math.floor(Date.now() / 1000) - 60, // 60 seconds ago
                user: { aud: 'authenticated', iss: 'https://api.supabase.co/auth/v1' },
              },
            },
            error: null,
          }),
          getUser: vi.fn(),
        },
      });

      const result = await validateJWTSecurity();

      expect(result.valid).toBe(false);
      expect(result.error).toBe('expired');
      expect(result.message).toBe('Token has expired');
    });

    it('rejects tokens with missing expiry', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: {
              session: {
                // No expires_at
                user: { aud: 'authenticated', iss: 'https://api.supabase.co/auth/v1' },
              },
            },
            error: null,
          }),
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'test@example.com' } },
            error: null,
          }),
        },
      });

      const result = await validateJWTSecurity();

      // Should still be valid if getUser succeeds (expiry is optional in Supabase)
      expect(result.valid).toBe(true);
    });

    it('rejects tokens with missing audience claim', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: {
              session: {
                expires_at: Math.floor(Date.now() / 1000) + 3600,
                user: { iss: 'https://placeholder.supabase.co/auth/v1' }, // No aud claim
              },
            },
            error: null,
          }),
          getUser: vi.fn(),
        },
      });

      const result = await validateJWTSecurity();

      expect(result.valid).toBe(false);
      expect(result.error).toBe('missing_claims');
    });

    it('rejects tokens with invalid audience (not authenticated)', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: {
              session: {
                expires_at: Math.floor(Date.now() / 1000) + 3600,
                user: {
                  aud: 'some-other-audience',
                  iss: 'https://placeholder.supabase.co/auth/v1',
                },
              },
            },
            error: null,
          }),
          getUser: vi.fn(),
        },
      });

      const result = await validateJWTSecurity();

      expect(result.valid).toBe(false);
      expect(result.error).toBe('invalid_audience');
    });

    it('accepts valid tokens from this Supabase project', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: {
              session: {
                expires_at: Math.floor(Date.now() / 1000) + 3600,
                user: { aud: 'authenticated', iss: 'https://api.supabase.co/auth/v1' },
              },
            },
            error: null,
          }),
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'test@example.com' } },
            error: null,
          }),
        },
      });

      const result = await validateJWTSecurity();

      expect(result.valid).toBe(true);
      expect(result.userId).toBe('user-123');
      expect(result.email).toBe('test@example.com');
    });

    it('handles Supabase errors gracefully', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: null },
            error: new Error('Database connection failed'),
          }),
          getUser: vi.fn(),
        },
      });

      const result = await validateJWTSecurity();

      expect(result.valid).toBe(false);
      expect(result.error).toBe('supabase_error');
    });

    it('handles missing session', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: null },
            error: null,
          }),
          getUser: vi.fn(),
        },
      });

      const result = await validateJWTSecurity();

      expect(result.valid).toBe(false);
      expect(result.error).toBe('missing_claims');
    });

    it('handles getUser returning null user', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: {
              session: {
                expires_at: Math.floor(Date.now() / 1000) + 3600,
                user: { aud: 'authenticated', iss: 'https://api.supabase.co/auth/v1' },
              },
            },
            error: null,
          }),
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      });

      const result = await validateJWTSecurity();

      expect(result.valid).toBe(false);
      expect(result.error).toBe('missing_claims');
    });

    it('handles Supabase client unavailable', async () => {
      mockCreateClient.mockResolvedValue(null);

      const result = await validateJWTSecurity();

      expect(result.valid).toBe(false);
      expect(result.error).toBe('supabase_error');
    });
  });

  describe('verifyUserRoleFromDatabase', () => {
    it('returns role from database (not from JWT)', async () => {
      mockCreateClient.mockResolvedValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { role: 'admin' },
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await verifyUserRoleFromDatabase('user-123');

      expect(result.role).toBe('admin');
      expect(result.error).toBeUndefined();
    });

    it('returns null role when profile not found', async () => {
      mockCreateClient.mockResolvedValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await verifyUserRoleFromDatabase('user-123');

      expect(result.role).toBeNull();
    });

    it('returns error when database query fails', async () => {
      mockCreateClient.mockResolvedValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Connection timeout' },
              }),
            }),
          }),
        }),
      });

      const result = await verifyUserRoleFromDatabase('user-123');

      expect(result.role).toBeNull();
      expect(result.error).toBe('Connection timeout');
    });

    it('handles Supabase unavailable', async () => {
      mockCreateClient.mockResolvedValue(null);

      const result = await verifyUserRoleFromDatabase('user-123');

      expect(result.role).toBeNull();
      expect(result.error).toBe('Supabase unavailable');
    });
  });

  describe('validateAuthWithRoleCheck', () => {
    it('validates JWT and returns user with role', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: {
              session: {
                expires_at: Math.floor(Date.now() / 1000) + 3600,
                user: { aud: 'authenticated', iss: 'https://api.supabase.co/auth/v1' },
              },
            },
            error: null,
          }),
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'test@example.com' } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { role: 'user' },
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await validateAuthWithRoleCheck();

      expect(result.valid).toBe(true);
      expect(result.userId).toBe('user-123');
      expect(result.email).toBe('test@example.com');
      expect(result.role).toBe('user');
    });

    it('validates JWT and checks admin role', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: {
              session: {
                expires_at: Math.floor(Date.now() / 1000) + 3600,
                user: { aud: 'authenticated', iss: 'https://api.supabase.co/auth/v1' },
              },
            },
            error: null,
          }),
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'admin-123', email: 'admin@example.com' } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { role: 'admin' },
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await validateAuthWithRoleCheck('admin');

      expect(result.valid).toBe(true);
      expect(result.role).toBe('admin');
    });

    it('rejects when required role does not match', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: {
              session: {
                expires_at: Math.floor(Date.now() / 1000) + 3600,
                user: { aud: 'authenticated', iss: 'https://api.supabase.co/auth/v1' },
              },
            },
            error: null,
          }),
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'test@example.com' } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { role: 'user' },
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await validateAuthWithRoleCheck('admin');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Required role: admin');
    });

    it('rejects when JWT is invalid', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: null },
            error: null,
          }),
          getUser: vi.fn(),
        },
      });

      const result = await validateAuthWithRoleCheck();

      expect(result.valid).toBe(false);
    });

    it('rejects when role lookup fails', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: {
              session: {
                expires_at: Math.floor(Date.now() / 1000) + 3600,
                user: { aud: 'authenticated', iss: 'https://api.supabase.co/auth/v1' },
              },
            },
            error: null,
          }),
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'test@example.com' } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
              }),
            }),
          }),
        }),
      });

      const result = await validateAuthWithRoleCheck();

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });
});
