/**
 * CSRF API Helpers
 * Utilities for validating CSRF tokens in API routes
 * Use in API route handlers for state-changing operations
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  validateCsrfToken,
  requiresCsrfValidation,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
} from '@/lib/csrf';

/**
 * Parse CSRF token from cookie
 */
function parseCsrfCookie(cookieValue: string | undefined) {
  if (!cookieValue) return null;

  try {
    const parsed = JSON.parse(cookieValue);
    return parsed.token || null;
  } catch {
    return null;
  }
}

/**
 * Validate CSRF token for API route
 * Returns { valid: true } or { valid: false, response: NextResponse }
 *
 * Usage in API routes:
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const csrfValidation = validateApiCsrfToken(request);
 *   if (!csrfValidation.valid) {
 *     return csrfValidation.response;
 *   }
 *   // Proceed with handler logic
 * }
 * ```
 */
export function validateApiCsrfToken(
  request: NextRequest
): { valid: true } | { valid: false; response: NextResponse } {
  // Only validate state-changing methods
  if (!requiresCsrfValidation(request.method)) {
    return { valid: true };
  }

  // Get tokens from request
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  const cookieValue = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const cookieToken = parseCsrfCookie(cookieValue);

  // Validate presence of both tokens
  if (!headerToken || !cookieToken) {
    return {
      valid: false,
      response: NextResponse.json(
        {
          error: 'CSRF token required',
          message: 'Missing CSRF token. Please refresh the page and try again.',
        },
        { status: 403 }
      ),
    };
  }

  // Validate token match
  if (!validateCsrfToken(headerToken, cookieToken)) {
    return {
      valid: false,
      response: NextResponse.json(
        {
          error: 'Invalid CSRF token',
          message: 'CSRF token validation failed. Please refresh the page and try again.',
        },
        { status: 403 }
      ),
    };
  }

  return { valid: true };
}

/**
 * Higher-order function for API routes with CSRF protection
 * Wraps route handler with CSRF validation
 *
 * Usage:
 * ```typescript
 * export const POST = withCsrfProtection(async (request: NextRequest) => {
 *   // Your handler logic here
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export function withCsrfProtection(
  handler: (request: NextRequest) => Promise<NextResponse> | NextResponse
) {
  return async function (request: NextRequest): Promise<NextResponse> {
    const csrfValidation = validateApiCsrfToken(request);

    if (!csrfValidation.valid) {
      return csrfValidation.response;
    }

    return handler(request);
  };
}

/**
 * Check if request has valid CSRF token without failing
 * Useful for middleware-style validation where you want to continue on failure
 */
export function hasValidCsrfToken(request: NextRequest): boolean {
  if (!requiresCsrfValidation(request.method)) {
    return true;
  }

  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  const cookieValue = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const cookieToken = parseCsrfCookie(cookieValue);

  if (!headerToken || !cookieToken) {
    return false;
  }

  return validateCsrfToken(headerToken, cookieToken);
}
