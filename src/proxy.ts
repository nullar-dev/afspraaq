/**
 * Next.js Proxy Middleware
 * Handles authentication, CSRF protection, CSP nonces, and security headers
 * 2026 best practice implementation
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import {
  generateCsrfToken,
  validateAndRotateToken,
  shouldRotateToken,
  requiresCsrfValidation,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
} from '@/lib/csrf';

const ALLOWED_REDIRECTS = new Set([
  '/',
  '/admin',
  '/booking/vehicle',
  '/booking/services',
  '/booking/schedule',
  '/booking/customer',
  '/booking/payment',
]);

const isSafeRedirect = (value: string | null): value is string =>
  !!value &&
  value.length <= 200 &&
  value.startsWith('/') &&
  !value.startsWith('//') &&
  !value.includes('\\') &&
  !value.includes('\n') &&
  !value.includes('\r') &&
  ALLOWED_REDIRECTS.has(value);

/**
 * Generate cryptographically secure nonce for CSP
 * 128 bits of entropy (sufficient for CSP nonces)
 */
function generateNonce(): string {
  return randomBytes(16).toString('base64');
}

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
 * Apply security headers with CSP nonce
 * 2026 best practice: Nonce-based CSP instead of unsafe-inline
 */
const applySecurityHeaders = (response: NextResponse, nonce: string) => {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
  );
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // 2026 best practice: Strict nonce-based CSP (no unsafe-inline)
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      `script-src 'nonce-${nonce}' 'strict-dynamic'`,
      `style-src 'self' 'nonce-${nonce}'`,
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      'upgrade-insecure-requests',
    ].join('; ')
  );

  // Store nonce in header for server components to access
  response.headers.set('X-CSP-Nonce', nonce);

  return response;
};

/**
 * Main proxy middleware
 * Handles auth, CSRF protection, CSP nonces, and security headers
 */
export async function proxy(request: NextRequest) {
  // Generate CSP nonce for this request
  const nonce = generateNonce();

  // Initialize response with security headers
  let response = applySecurityHeaders(NextResponse.next({ request }), nonce);

  // Handle CSRF protection
  const existingCookie = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const existingToken = parseCsrfCookie(existingCookie);
  const headerToken = request.headers.get(CSRF_HEADER_NAME) || '';

  // Check if this is a state-changing request that needs CSRF validation
  if (requiresCsrfValidation(request.method)) {
    const validation = validateAndRotateToken(headerToken, existingToken);

    if (!validation.valid) {
      // CSRF validation failed - reject with 403
      return applySecurityHeaders(
        NextResponse.json({ error: 'Invalid or missing CSRF token' }, { status: 403 }),
        nonce
      );
    }

    // If token was rotated, set new cookie
    // __Host- prefix requires: Secure, Path=/, no Domain attribute
    if (validation.shouldRotate && validation.newToken) {
      response.cookies.set({
        name: CSRF_COOKIE_NAME,
        value: serializeCsrfCookie(validation.newToken),
        httpOnly: false, // Must be accessible for double-submit
        secure: true, // Required for __Host- prefix
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours
        domain: undefined, // Explicitly no domain - required for __Host- prefix
      });
    }
  } else {
    // Non-state-changing request: ensure CSRF cookie exists
    // __Host- prefix requires: Secure, Path=/, no Domain attribute
    if (!existingToken) {
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
    } else {
      // Check if existing token needs rotation
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
      }
    }
  }

  // Get current CSRF token for client
  const currentCsrfToken = parseCsrfCookie(response.cookies.get(CSRF_COOKIE_NAME)?.value);
  if (currentCsrfToken) {
    response.headers.set('X-CSRF-Token', currentCsrfToken.token);
  }

  // Supabase auth handling
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    !supabaseUrl ||
    !supabaseKey ||
    supabaseUrl.includes('placeholder') ||
    supabaseKey === 'placeholder-key'
  ) {
    const { pathname } = request.nextUrl;
    const publicRoutes = ['/login', '/register', '/'];
    if (!publicRoutes.includes(pathname)) {
      const url = new URL('/login', request.url);
      return applySecurityHeaders(NextResponse.redirect(url), nonce);
    }
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = applySecurityHeaders(NextResponse.next({ request }), nonce);
        cookiesToSet.forEach(({ name, value }) => response.cookies.set(name, value));
      },
    },
  });

  let user = null;
  try {
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser();
    user = supabaseUser;
  } catch (error) {
    console.warn('proxy auth lookup failed', {
      message: error instanceof Error ? error.message : 'unknown',
    });
    user = null;
  }

  const { pathname } = request.nextUrl;
  const redirectParam = request.nextUrl.searchParams.get('redirect');
  const fallbackRoute = ALLOWED_REDIRECTS.has(pathname) ? pathname : '/';
  const safeRedirect: string = isSafeRedirect(redirectParam) ? redirectParam : fallbackRoute;

  const publicRoutes = ['/login', '/register', '/'];
  const isPublicRoute = publicRoutes.includes(pathname);

  if (!user && !isPublicRoute) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', safeRedirect);
    return applySecurityHeaders(NextResponse.redirect(url), nonce);
  }

  if (user && ['/login', '/register'].includes(pathname)) {
    return applySecurityHeaders(NextResponse.redirect(new URL('/', request.url)), nonce);
  }

  if (user && !isPublicRoute) {
    response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)',
  ],
};
