/**
 * Admin Auth Helper Tests
 * Updated to work with JWT security validation
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAdminAuthResult } from '@/lib/admin-auth';

const mockValidateJWTSecurity = vi.fn();
const mockVerifyUserRoleFromDatabase = vi.fn();

vi.mock('@/lib/jwt-security', () => ({
  validateJWTSecurity: () => mockValidateJWTSecurity(),
  verifyUserRoleFromDatabase: (userId: string) => mockVerifyUserRoleFromDatabase(userId),
}));

describe('admin auth helper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unavailable when JWT validation fails with supabase_error', async () => {
    mockValidateJWTSecurity.mockResolvedValue({
      valid: false,
      error: 'supabase_error',
      message: 'Connection failed',
    });

    await expect(getAdminAuthResult()).resolves.toEqual({ status: 'unavailable' });
  });

  it('returns unauthenticated when JWT validation fails without specific error', async () => {
    mockValidateJWTSecurity.mockResolvedValue({
      valid: false,
      error: 'missing_claims',
    });

    await expect(getAdminAuthResult()).resolves.toEqual({ status: 'unauthenticated' });
  });

  it('returns forbidden with jwt_expired reason when token is expired', async () => {
    mockValidateJWTSecurity.mockResolvedValue({
      valid: false,
      error: 'expired',
      message: 'Token expired',
    });

    await expect(getAdminAuthResult()).resolves.toEqual({
      status: 'forbidden',
      reason: 'jwt_expired',
    });
  });

  it('returns forbidden with jwt_invalid_audience reason when audience is wrong', async () => {
    mockValidateJWTSecurity.mockResolvedValue({
      valid: false,
      error: 'invalid_audience',
      message: 'Invalid audience',
    });

    await expect(getAdminAuthResult()).resolves.toEqual({
      status: 'forbidden',
      reason: 'jwt_invalid_audience',
    });
  });

  it('returns forbidden with profile_lookup_failed reason when profile lookup fails', async () => {
    mockValidateJWTSecurity.mockResolvedValue({
      valid: true,
      userId: 'u1',
      email: 'u@x.com',
    });
    mockVerifyUserRoleFromDatabase.mockResolvedValue({
      role: null,
      error: 'Database error',
    });

    await expect(getAdminAuthResult()).resolves.toEqual({
      status: 'forbidden',
      reason: 'profile_lookup_failed',
    });
  });

  it('returns forbidden with role_mismatch reason when role is not admin', async () => {
    mockValidateJWTSecurity.mockResolvedValue({
      valid: true,
      userId: 'u1',
      email: 'u@x.com',
    });
    mockVerifyUserRoleFromDatabase.mockResolvedValue({
      role: 'user',
      error: null,
    });

    await expect(getAdminAuthResult()).resolves.toEqual({
      status: 'forbidden',
      reason: 'role_mismatch',
    });
  });

  it('returns forbidden with profile_missing reason when profile is absent', async () => {
    mockValidateJWTSecurity.mockResolvedValue({
      valid: true,
      userId: 'u1',
      email: 'u@x.com',
    });
    mockVerifyUserRoleFromDatabase.mockResolvedValue({
      role: null,
      error: null,
    });

    await expect(getAdminAuthResult()).resolves.toEqual({
      status: 'forbidden',
      reason: 'profile_missing',
    });
  });

  it('returns ok with admin user payload', async () => {
    mockValidateJWTSecurity.mockResolvedValue({
      valid: true,
      userId: 'admin-1',
      email: 'admin@example.com',
    });
    mockVerifyUserRoleFromDatabase.mockResolvedValue({
      role: 'admin',
      error: null,
    });

    await expect(getAdminAuthResult()).resolves.toEqual({
      status: 'ok',
      user: {
        id: 'admin-1',
        email: 'admin@example.com',
        role: 'admin',
      },
    });
  });

  it('does NOT trust role from JWT - always queries database', async () => {
    // Simulate JWT with admin role claim (attack attempt)
    mockValidateJWTSecurity.mockResolvedValue({
      valid: true,
      userId: 'attacker-123',
      email: 'attacker@evil.com',
    });

    // Database returns actual role
    mockVerifyUserRoleFromDatabase.mockResolvedValue({
      role: 'user',
      error: null,
    });

    const result = await getAdminAuthResult();

    // Should be forbidden because database says 'user', not admin
    expect(result.status).toBe('forbidden');
    expect(result).toHaveProperty('reason', 'role_mismatch');
  });
});
