import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
    },
  });

export async function POST() {
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
