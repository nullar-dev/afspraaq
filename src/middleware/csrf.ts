/**
 * CSRF Middleware for Next.js
 * Implements double-submit cookie pattern for state-changing requests
 * 2026 best practice: SameSite=Strict cookies + double-submit validation
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  generateCsrfToken,
  validateAndRotateToken,
  shouldRotateToken,
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
    return JSON.parse(cookieValue);
  } catch {
    return null;
  }
}

/**
 * Serialize CSRF token for cookie storage
 */
function serializeCsrfCookie(token: { token: string; expiresAt: number; requestCount: number }) {
  return JSON.stringify(token);
}

/**
 * CSRF Middleware
 * Attaches CSRF token to responses and validates on state-changing requests
 */
export function csrfMiddleware(request: NextRequest) {
  const response = NextResponse.next();

  // Get existing CSRF token from cookie
  const existingCookie = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const existingToken = parseCsrfCookie(existingCookie);

  // Get CSRF token from request header (for validation)
  const headerToken = request.headers.get(CSRF_HEADER_NAME) || '';

  // Check if this is a state-changing request that needs validation
  if (requiresCsrfValidation(request.method)) {
    // Validate the CSRF token
    const validation = validateAndRotateToken(headerToken, existingToken);

    if (!validation.valid) {
      // CSRF validation failed - reject request
      return NextResponse.json({ error: 'Invalid or missing CSRF token' }, { status: 403 });
    }

    // If token was rotated, set new cookie
    // __Host- prefix requires: Secure, Path=/, no Domain attribute
    if (validation.shouldRotate && validation.newToken) {
      response.cookies.set({
        name: CSRF_COOKIE_NAME,
        value: serializeCsrfCookie(validation.newToken),
        httpOnly: false, // Must be accessible to JavaScript for double-submit
        secure: true, // Required for __Host- prefix
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours
        domain: undefined, // Explicitly no domain - required for __Host- prefix
      });
    }

    // Add CSRF token to response headers for client to read
    if (existingToken) {
      response.headers.set('X-CSRF-Token', existingToken.token);
    }
  } else {
    // Non-state-changing request (GET, HEAD, etc.)
    // Ensure CSRF cookie exists for future state-changing requests
    // __Host- prefix requires: Secure, Path=/, no Domain attribute

    if (!existingToken) {
      // Generate new CSRF token
      const newToken = generateCsrfToken();

      response.cookies.set({
        name: CSRF_COOKIE_NAME,
        value: serializeCsrfCookie(newToken),
        httpOnly: false,
        secure: true, // Required for __Host- prefix
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24,
        domain: undefined, // Explicitly no domain - required for __Host- prefix
      });

      // Add token to response header
      response.headers.set('X-CSRF-Token', newToken.token);
    } else {
      // Check if token needs rotation
      if (shouldRotateToken(existingToken)) {
        const newToken = generateCsrfToken();

        response.cookies.set({
          name: CSRF_COOKIE_NAME,
          value: serializeCsrfCookie(newToken),
          httpOnly: false,
          secure: true, // Required for __Host- prefix
          sameSite: 'strict',
          path: '/',
          maxAge: 60 * 60 * 24,
          domain: undefined, // Explicitly no domain - required for __Host- prefix
        });

        response.headers.set('X-CSRF-Token', newToken.token);
      } else {
        // Token is valid, just return it
        response.headers.set('X-CSRF-Token', existingToken.token);
      }
    }
  }

  return response;
}
