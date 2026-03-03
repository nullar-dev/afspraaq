import type { Database } from '@/types/supabase.generated';
import { validateJWTSecurity, verifyUserRoleFromDatabase } from './jwt-security';

type ProfileRole = Database['public']['Tables']['profiles']['Row']['role'];

interface AdminUser {
  id: string;
  email: string | null;
  role: ProfileRole;
}

type AdminForbiddenReason =
  | 'profile_lookup_failed'
  | 'profile_missing'
  | 'role_mismatch'
  | 'jwt_expired'
  | 'jwt_invalid'
  | 'jwt_invalid_audience';

export type AdminAuthResult =
  | { status: 'ok'; user: AdminUser }
  | { status: 'unavailable' }
  | { status: 'unauthenticated' }
  | { status: 'forbidden'; reason: AdminForbiddenReason };

export const getAdminAuthResult = async (): Promise<AdminAuthResult> => {
  // Step 1: Validate JWT security (signature, expiry, audience)
  const jwtValidation = await validateJWTSecurity();

  if (!jwtValidation.valid) {
    // Map JWT errors to admin auth reasons
    if (jwtValidation.error === 'expired') {
      return { status: 'forbidden', reason: 'jwt_expired' };
    }
    if (jwtValidation.error === 'invalid_audience') {
      return { status: 'forbidden', reason: 'jwt_invalid_audience' };
    }
    if (jwtValidation.error === 'supabase_error') {
      return { status: 'unavailable' };
    }
    return { status: 'unauthenticated' };
  }

  // Step 2: Verify role from database (NEVER trust JWT role claim)
  // Type guard: jwtValidation.valid is true, so userId must exist
  if (!jwtValidation.userId) {
    return { status: 'forbidden', reason: 'profile_missing' };
  }

  const roleCheck = await verifyUserRoleFromDatabase(jwtValidation.userId);

  if (roleCheck.error) {
    return { status: 'forbidden', reason: 'profile_lookup_failed' };
  }

  if (!roleCheck.role) {
    return { status: 'forbidden', reason: 'profile_missing' };
  }

  if (roleCheck.role !== 'admin') {
    return { status: 'forbidden', reason: 'role_mismatch' };
  }

  return {
    status: 'ok',
    user: {
      id: jwtValidation.userId,
      email: jwtValidation.email ?? null,
      role: roleCheck.role as ProfileRole,
    },
  };
};
