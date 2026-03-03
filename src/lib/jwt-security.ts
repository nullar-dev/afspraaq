/**
 * JWT Security Validation
 * Validates Supabase JWT tokens according to security best practices
 * Verifies: signature, expiry, audience, issuer
 * NEVER trusts role from JWT claims - always query database
 */

import { createClient } from '@/utils/supabase/server';
import { timingSafeEqual } from 'crypto';

export interface JWTValidationResult {
  valid: boolean;
  userId?: string | undefined;
  email?: string | undefined;
  error?:
    | 'expired'
    | 'excessive_lifetime'
    | 'invalid_signature'
    | 'invalid_audience'
    | 'invalid_issuer'
    | 'missing_claims'
    | 'supabase_error'
    | undefined;
  message?: string | undefined;
}

/**
 * Validate JWT token security
 * Checks: expiry, audience, issuer
 * Note: Signature is verified by Supabase client, we verify claims
 */
export async function validateJWTSecurity(): Promise<JWTValidationResult> {
  const supabase = await createClient();

  if (!supabase) {
    return {
      valid: false,
      error: 'supabase_error',
      message: 'Supabase client unavailable',
    };
  }

  try {
    // Get session to access JWT claims
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      return {
        valid: false,
        error: 'supabase_error',
        message: sessionError.message,
      };
    }

    if (!session) {
      return {
        valid: false,
        error: 'missing_claims',
        message: 'No active session',
      };
    }

    // Verify expiry (exp claim)
    // SECURITY: Add clock skew tolerance (30 seconds) to prevent false rejections
    const CLOCK_SKEW_TOLERANCE_SECONDS = 30;
    const now = Math.floor(Date.now() / 1000) + CLOCK_SKEW_TOLERANCE_SECONDS;
    if (session.expires_at && session.expires_at < now) {
      return {
        valid: false,
        error: 'expired',
        message: 'Token has expired',
      };
    }

    // SECURITY: Validate maximum token lifetime (24 hours)
    // Prevents tokens with excessive expiry (e.g., 10 years) from being accepted
    const MAX_TOKEN_LIFETIME_SECONDS = 24 * 60 * 60; // 24 hours
    // Use actual current time (without clock skew) for lifetime calculation
    const actualNow = Math.floor(Date.now() / 1000);
    if (session.expires_at) {
      const tokenLifetime = session.expires_at - actualNow;
      if (tokenLifetime > MAX_TOKEN_LIFETIME_SECONDS) {
        return {
          valid: false,
          error: 'excessive_lifetime',
          message: 'Token lifetime exceeds maximum allowed (24 hours)',
        };
      }
    }

    // Verify audience (aud claim) - must match our Supabase project
    const tokenAud = session.user?.aud;

    if (!tokenAud) {
      return {
        valid: false,
        error: 'missing_claims',
        message: 'Token missing audience claim',
      };
    }

    // SECURITY: Validate against project-specific audience
    // Must match either 'authenticated' (Supabase auth) or project URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    let projectRef: string | null = null;
    try {
      if (supabaseUrl) {
        const hostname = new URL(supabaseUrl).hostname;
        const parts = hostname.split('.');
        projectRef = parts.length > 0 && parts[0] ? parts[0] : null;
      }
    } catch {
      // Invalid URL in env var - treat as no project ref
      projectRef = null;
    }
    const validAudiences = ['authenticated'];

    if (projectRef) {
      validAudiences.push(`${projectRef}.supabase.co`);
    }

    // SECURITY: Reject tokens from other Supabase projects
    // This prevents token substitution attacks between projects
    // Using timing-safe comparison to prevent timing attacks
    const audienceToken = tokenAud as string; // Type guard: checked above
    const audienceValid = validAudiences.some(aud => {
      if (aud.length !== audienceToken.length) return false;
      try {
        return timingSafeEqual(Buffer.from(aud), Buffer.from(audienceToken));
      } catch {
        return false;
      }
    });
    if (!audienceValid) {
      return {
        valid: false,
        error: 'invalid_audience',
        message: 'Token audience mismatch',
      };
    }

    // Verify issuer (iss claim) - must be from our Supabase auth server
    // SECURITY: Defense in depth - even though Supabase may verify internally,
    // explicit validation prevents issuer confusion attacks
    const tokenIss = (session.user as { iss?: string })?.iss;
    if (!tokenIss) {
      return {
        valid: false,
        error: 'missing_claims',
        message: 'Token missing issuer claim',
      };
    }

    // Validate issuer is our Supabase auth server
    // SECURITY: Use try-catch for URL parsing and timing-safe comparison
    let expectedIssuer: string;
    try {
      expectedIssuer = supabaseUrl
        ? `${new URL(supabaseUrl).origin}/auth/v1`
        : 'https://api.supabase.co/auth/v1';
    } catch {
      expectedIssuer = 'https://api.supabase.co/auth/v1';
    }

    // SECURITY: Use timing-safe comparison to prevent timing attacks
    const issuerToken = tokenIss; // Type guard: checked above
    if (
      issuerToken.length !== expectedIssuer.length ||
      !timingSafeEqual(Buffer.from(issuerToken), Buffer.from(expectedIssuer))
    ) {
      return {
        valid: false,
        error: 'invalid_issuer',
        message: 'Token issuer mismatch',
      };
    }

    // Get user to verify the token is still valid
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      return {
        valid: false,
        error: 'supabase_error',
        message: userError.message,
      };
    }

    if (!user) {
      return {
        valid: false,
        error: 'missing_claims',
        message: 'User not found',
      };
    }

    // SECURITY: Reject tokens without user ID - cannot identify user
    if (!user.id) {
      return {
        valid: false,
        error: 'missing_claims',
        message: 'User ID missing from token',
      };
    }

    // IMPORTANT: Do NOT trust role from JWT claims
    // Role is verified separately by querying the database
    return {
      valid: true,
      userId: user.id,
      email: user.email,
    };
  } catch (error) {
    return {
      valid: false,
      error: 'supabase_error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Verify user role from database (NOT from JWT)
 * This is the secure way to check authorization
 */
export async function verifyUserRoleFromDatabase(userId: string): Promise<{
  role: string | null;
  error?: string;
}> {
  const supabase = await createClient();

  if (!supabase) {
    return { role: null, error: 'Supabase unavailable' };
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    return { role: null, error: error.message };
  }

  return { role: profile?.role ?? null };
}

/**
 * High-level auth check that combines JWT validation + role verification
 * Use this for protected routes
 */
export async function validateAuthWithRoleCheck(requiredRole?: 'admin' | 'user'): Promise<{
  valid: boolean;
  userId?: string | undefined;
  email?: string | undefined;
  role?: string | undefined;
  error?: string | undefined;
}> {
  // Step 1: Validate JWT security
  const jwtValidation = await validateJWTSecurity();

  if (!jwtValidation.valid) {
    return {
      valid: false,
      error: jwtValidation.message,
    };
  }

  // Step 2: Verify role from database (NOT from JWT)
  // Type guard: jwtValidation.valid is true, so userId must exist
  if (!jwtValidation.userId) {
    return {
      valid: false,
      error: 'User ID missing from token',
    };
  }

  const roleCheck = await verifyUserRoleFromDatabase(jwtValidation.userId);

  if (roleCheck.error) {
    return {
      valid: false,
      error: roleCheck.error,
    };
  }

  // Step 3: Check required role if specified
  if (requiredRole && roleCheck.role !== requiredRole) {
    return {
      valid: false,
      error: `Required role: ${requiredRole}, found: ${roleCheck.role || 'none'}`,
    };
  }

  return {
    valid: true,
    userId: jwtValidation.userId,
    email: jwtValidation.email,
    role: roleCheck.role || undefined,
  };
}
