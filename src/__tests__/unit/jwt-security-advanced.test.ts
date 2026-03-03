/**
 * JWT Security Tests - Tampered Token & Wrong Project Scenarios
 * Additional security tests for JWT tampering and cross-project attacks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateJWTSecurity, verifyUserRoleFromDatabase } from '@/lib/jwt-security';

const mockCreateClient = vi.fn();

vi.mock('@/utils/supabase/server', () => ({
  createClient: () => mockCreateClient(),
}));

// Set up test environment with consistent Supabase URL
const TEST_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_URL = TEST_SUPABASE_URL;

describe('JWT Security - Advanced Attack Scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Tampered Token Detection', () => {
    it('detects token with modified signature via getUser failure', async () => {
      // Simulating a tampered token: Supabase getUser will fail
      mockCreateClient.mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: {
              session: {
                expires_at: Math.floor(Date.now() / 1000) + 3600,
                user: { aud: 'authenticated', iss: 'https://test.supabase.co/auth/v1' },
              },
            },
            error: null,
          }),
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Invalid token signature' },
          }),
        },
      });

      const result = await validateJWTSecurity();

      expect(result.valid).toBe(false);
      expect(result.error).toBe('supabase_error');
    });

    it('detects token with modified payload claims', async () => {
      // Token passes session check but getUser returns different user
      // This simulates a tampered sub/user_id claim
      mockCreateClient.mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: {
              session: {
                expires_at: Math.floor(Date.now() / 1000) + 3600,
                user: {
                  aud: 'authenticated',
                  iss: 'https://test.supabase.co/auth/v1',
                  id: 'attacker-id',
                },
              },
            },
            error: null,
          }),
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'legitimate-user', email: 'user@example.com' } },
            error: null,
          }),
        },
      });

      const result = await validateJWTSecurity();

      // Should still be valid because Supabase validates the signature
      // The user ID from getUser is what we trust, not from session
      expect(result.valid).toBe(true);
      expect(result.userId).toBe('legitimate-user');
    });
  });

  describe('Cross-Project Token Attack', () => {
    it('rejects token from different Supabase project (wrong audience)', async () => {
      // Token from a different Supabase project would have wrong aud
      mockCreateClient.mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: {
              session: {
                expires_at: Math.floor(Date.now() / 1000) + 3600,
                user: {
                  aud: 'other-project-audience',
                  iss: 'https://test.supabase.co/auth/v1',
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

    it('rejects token with suspicious audience pattern', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: {
              session: {
                expires_at: Math.floor(Date.now() / 1000) + 3600,
                user: { aud: 'malicious-audience', iss: 'https://test.supabase.co/auth/v1' },
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
  });

  describe('Missing Critical Claims', () => {
    it('rejects token without user ID', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: {
              session: {
                expires_at: Math.floor(Date.now() / 1000) + 3600,
                user: { aud: 'authenticated', iss: 'https://test.supabase.co/auth/v1' },
              },
            },
            error: null,
          }),
          getUser: vi.fn().mockResolvedValue({
            data: { user: { email: 'test@example.com' } }, // No id
            error: null,
          }),
        },
      });

      const result = await validateJWTSecurity();

      // SECURITY: Token without user ID should be rejected - cannot identify user
      expect(result.valid).toBe(false);
      expect(result.error).toBe('missing_claims');
      expect(result.message).toContain('User ID missing');
    });

    it('rejects token without any user object', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: {
              session: {
                expires_at: Math.floor(Date.now() / 1000) + 3600,
                user: { aud: 'authenticated', iss: 'https://test.supabase.co/auth/v1' },
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
  });

  describe('Role Claim in JWT (Should be IGNORED)', () => {
    it('never uses role from JWT claims', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: {
              session: {
                expires_at: Math.floor(Date.now() / 1000) + 3600,
                user: {
                  aud: 'authenticated',
                  iss: 'https://test.supabase.co/auth/v1',
                  user_metadata: { role: 'admin' }, // Malicious role claim in JWT
                },
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
                data: { role: 'user' }, // Actual role from database
                error: null,
              }),
            }),
          }),
        }),
      });

      // Validate JWT
      const jwtResult = await validateJWTSecurity();
      expect(jwtResult.valid).toBe(true);
      expect(jwtResult.userId).toBe('user-123');

      // Check role from database (NOT from JWT)
      const roleResult = await verifyUserRoleFromDatabase('user-123');
      expect(roleResult.role).toBe('user'); // Should be 'user', not 'admin' from JWT
    });

    it('prevents privilege escalation via JWT role claim manipulation', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: {
              session: {
                expires_at: Math.floor(Date.now() / 1000) + 3600,
                user: {
                  aud: 'authenticated',
                  iss: 'https://test.supabase.co/auth/v1',
                  // Attacker tries to inject admin role
                  user_metadata: {
                    role: 'admin',
                    app_metadata: { role: 'admin' },
                  },
                },
              },
            },
            error: null,
          }),
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'attacker-123', email: 'attacker@evil.com' } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { role: 'user' }, // Real role from DB
                error: null,
              }),
            }),
          }),
        }),
      });

      // JWT validation succeeds
      const jwtResult = await validateJWTSecurity();
      expect(jwtResult.valid).toBe(true);

      // But role check returns 'user', not the injected 'admin'
      const roleResult = await verifyUserRoleFromDatabase('attacker-123');
      expect(roleResult.role).toBe('user');
      expect(roleResult.role).not.toBe('admin');
    });
  });

  describe('Token Replay Attack Prevention', () => {
    it('validates expiry prevents replay of old tokens', async () => {
      // Token expired yesterday
      const yesterday = Math.floor(Date.now() / 1000) - 86400;

      mockCreateClient.mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: {
              session: {
                expires_at: yesterday,
                user: { aud: 'authenticated', iss: 'https://test.supabase.co/auth/v1' },
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
    });

    it('rejects tokens with excessive lifetime (far future)', async () => {
      // Token valid for 10 years (security risk)
      const farFuture = Math.floor(Date.now() / 1000) + 315360000; // 10 years

      mockCreateClient.mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: {
              session: {
                expires_at: farFuture,
                user: { aud: 'authenticated', iss: 'https://test.supabase.co/auth/v1' },
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

      // SECURITY: Rejects tokens with excessive lifetime (> 24 hours)
      const result = await validateJWTSecurity();
      expect(result.valid).toBe(false);
      expect(result.error).toBe('excessive_lifetime');
      expect(result.message).toContain('24 hours');
    });
  });

  describe('Edge Cases & Error Handling', () => {
    it('handles Supabase throwing exceptions', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getSession: vi.fn().mockRejectedValue(new Error('Network error')),
          getUser: vi.fn(),
        },
      });

      const result = await validateJWTSecurity();

      expect(result.valid).toBe(false);
      expect(result.error).toBe('supabase_error');
      expect(result.message).toBe('Network error');
    });

    it('handles non-Error exceptions', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getSession: vi.fn().mockRejectedValue('String error'),
          getUser: vi.fn(),
        },
      });

      const result = await validateJWTSecurity();

      expect(result.valid).toBe(false);
      expect(result.error).toBe('supabase_error');
      expect(result.message).toBe('Unknown error');
    });

    it('handles null/undefined audience', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: {
              session: {
                expires_at: Math.floor(Date.now() / 1000) + 3600,
                user: { aud: null, iss: 'https://test.supabase.co/auth/v1' },
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

    it('handles undefined audience', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: {
              session: {
                expires_at: Math.floor(Date.now() / 1000) + 3600,
                user: { iss: 'https://test.supabase.co/auth/v1' }, // No aud property
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
  });
});
