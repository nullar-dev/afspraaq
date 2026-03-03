import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateApiCsrfToken } from '@/lib/csrf-api';
import type { ApiErrorResponse } from '@/types/api';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const RATE_LIMIT_MAX_ENTRIES = 10_000;
const RATE_LIMIT_CLEANUP_EVERY_REQUESTS = 50;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
let requestsSinceCleanup = 0;
let hasLoggedMissingAllowedOrigins = false;

// Test helper to keep unit tests isolated from shared module state.
export const __resetRateLimitStoreForTests = () => {
  rateLimitStore.clear();
  requestsSinceCleanup = 0;
  hasLoggedMissingAllowedOrigins = false;
};

const applyRouteSecurityHeaders = (response: NextResponse) => {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  return response;
};

const createSupportCode = () => `SUP-${randomBytes(4).toString('hex').toUpperCase()}`;

const errorResponse = (
  error: ApiErrorResponse,
  status: number,
  headers?: HeadersInit,
  extra?: Record<string, unknown>
) => {
  const supportCode = createSupportCode();
  console.warn('Booking confirmation error', { supportCode, status, code: error.code, ...extra });
  return applyRouteSecurityHeaders(
    NextResponse.json(
      { error: { ...error, supportCode } },
      headers ? { status, headers } : { status }
    )
  );
};

const checkRateLimit = (key: string) => {
  const now = Date.now();

  requestsSinceCleanup += 1;
  if (requestsSinceCleanup >= RATE_LIMIT_CLEANUP_EVERY_REQUESTS) {
    requestsSinceCleanup = 0;

    // Opportunistic cleanup to prevent unbounded memory growth.
    for (const [entryKey, entry] of rateLimitStore) {
      if (entry.resetAt <= now) {
        rateLimitStore.delete(entryKey);
      }
    }
    if (rateLimitStore.size > RATE_LIMIT_MAX_ENTRIES) {
      const overflow = rateLimitStore.size - RATE_LIMIT_MAX_ENTRIES;
      let removed = 0;
      for (const [entryKey] of rateLimitStore) {
        rateLimitStore.delete(entryKey);
        removed += 1;
        if (removed >= overflow) {
          break;
        }
      }
    }
  }

  const current = rateLimitStore.get(key);
  if (!current || current.resetAt <= now) {
    const next = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateLimitStore.set(key, next);
    return { limited: false, retryAfterSeconds: 0 };
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return { limited: true, retryAfterSeconds };
  }

  current.count += 1;
  rateLimitStore.set(key, current);
  return { limited: false, retryAfterSeconds: 0 };
};

const parseAllowedOrigins = () => {
  const configured = process.env.ALLOWED_ORIGINS?.split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

  if (configured && configured.length > 0) {
    return new Set(configured);
  }

  if (!hasLoggedMissingAllowedOrigins) {
    console.error('ALLOWED_ORIGINS is required for confirmation endpoint.');
    hasLoggedMissingAllowedOrigins = true;
  }

  return new Set<string>();
};

const getHeaderOrigin = (request: NextRequest) => request.headers.get('origin');
const hasBrowserRequestHeader = (request: NextRequest) =>
  request.headers.get('x-requested-with') === 'XMLHttpRequest';

export async function POST(request: NextRequest) {
  // Validate CSRF token first
  const csrfValidation = validateApiCsrfToken(request);
  if (!csrfValidation.valid) {
    return csrfValidation.response;
  }

  if (!hasBrowserRequestHeader(request)) {
    return errorResponse({ code: 'forbidden_request', message: 'Forbidden' }, 403);
  }

  const allowedOrigins = parseAllowedOrigins();
  const requestOrigin = getHeaderOrigin(request);
  if (!requestOrigin || !allowedOrigins.has(requestOrigin)) {
    return errorResponse({ code: 'forbidden_origin', message: 'Forbidden' }, 403, undefined, {
      requestOrigin,
    });
  }

  const supabase = await createClient();
  if (!supabase) {
    return errorResponse({ code: 'auth_unavailable', message: 'Authentication unavailable' }, 503);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse({ code: 'unauthenticated', message: 'Unauthorized' }, 401);
  }

  // Key by authenticated user only to avoid trivial bucket bypass via user-agent rotation.
  const rateLimitKey = user.id;
  const rateLimitResult = checkRateLimit(rateLimitKey);
  if (rateLimitResult.limited) {
    return errorResponse(
      { code: 'rate_limited', message: 'Too many requests. Please try again shortly.' },
      429,
      {
        'Retry-After': String(rateLimitResult.retryAfterSeconds),
      },
      { userId: user.id }
    );
  }

  const code = `GC-${randomBytes(16).toString('hex').toUpperCase()}`;
  return applyRouteSecurityHeaders(NextResponse.json({ code }));
}

export async function GET() {
  return errorResponse({ code: 'method_not_allowed', message: 'Method Not Allowed' }, 405);
}
