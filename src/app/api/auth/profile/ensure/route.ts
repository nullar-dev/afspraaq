import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
    },
  });

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const RATE_LIMIT_MAX_ENTRIES = 10_000;
const RATE_LIMIT_CLEANUP_EVERY_REQUESTS = 25;
const ensureRateLimitStore = new Map<string, { count: number; resetAt: number }>();
let ensureRequestsSinceCleanup = 0;

export const __resetEnsureProfileRateLimitForTests = () => {
  ensureRateLimitStore.clear();
  ensureRequestsSinceCleanup = 0;
};

const parseAllowedOrigins = (request: NextRequest) => {
  const configured = process.env.ALLOWED_ORIGINS?.split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

  if (configured && configured.length > 0) {
    return new Set(configured);
  }

  if (process.env.NODE_ENV === 'production') {
    console.error('ALLOWED_ORIGINS is required in production for profile ensure endpoint.');
    return new Set<string>();
  }

  return new Set([request.nextUrl.origin]);
};

const checkRateLimit = (key: string) => {
  const now = Date.now();

  ensureRequestsSinceCleanup += 1;
  if (ensureRequestsSinceCleanup >= RATE_LIMIT_CLEANUP_EVERY_REQUESTS) {
    ensureRequestsSinceCleanup = 0;

    for (const [entryKey, entry] of ensureRateLimitStore) {
      if (entry.resetAt <= now) {
        ensureRateLimitStore.delete(entryKey);
      }
    }

    if (ensureRateLimitStore.size > RATE_LIMIT_MAX_ENTRIES) {
      const overflow = ensureRateLimitStore.size - RATE_LIMIT_MAX_ENTRIES;
      let removed = 0;
      for (const [entryKey] of ensureRateLimitStore) {
        ensureRateLimitStore.delete(entryKey);
        removed += 1;
        if (removed >= overflow) {
          break;
        }
      }
    }
  }

  const current = ensureRateLimitStore.get(key);
  if (!current || current.resetAt <= now) {
    ensureRateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  current.count += 1;
  ensureRateLimitStore.set(key, current);
  return false;
};

const hasBrowserRequestHeader = (request: NextRequest) =>
  request.headers.get('x-requested-with') === 'XMLHttpRequest';

export async function POST(request: NextRequest) {
  if (!hasBrowserRequestHeader(request)) {
    return json({ error: { code: 'forbidden_request', message: 'Forbidden' } }, 403);
  }

  const allowedOrigins = parseAllowedOrigins(request);
  const requestOrigin = request.headers.get('origin');
  if (!requestOrigin || !allowedOrigins.has(requestOrigin)) {
    return json({ error: { code: 'forbidden_origin', message: 'Forbidden' } }, 403);
  }

  const supabase = await createClient();
  if (!supabase) {
    return json(
      { error: { code: 'auth_unavailable', message: 'Authentication unavailable' } },
      503
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return json({ error: { code: 'unauthenticated', message: 'Unauthorized' } }, 401);
  }

  if (checkRateLimit(user.id)) {
    return json({ error: { code: 'rate_limited', message: 'Too many requests.' } }, 429);
  }

  const normalizedEmail = (user.email ?? '').trim().toLowerCase();
  const { error } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      email: normalizedEmail || null,
      role: 'user',
    },
    { onConflict: 'id' }
  );

  if (error) {
    console.warn('Failed to ensure profile row', { userId: user.id });
    return json(
      { error: { code: 'profile_repair_failed', message: 'Unable to ensure profile.' } },
      500
    );
  }

  return json({ ok: true });
}

export async function GET() {
  return json({ error: { code: 'method_not_allowed', message: 'Method Not Allowed' } }, 405);
}
