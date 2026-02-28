import { NextResponse } from 'next/server';
import { getAdminAuthResult } from '@/lib/admin-auth';

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
    },
  });

export async function GET() {
  const auth = await getAdminAuthResult();

  if (auth.status === 'unavailable') {
    return json(
      { error: { code: 'auth_unavailable', message: 'Authentication unavailable' } },
      503
    );
  }

  if (auth.status === 'unauthenticated') {
    return json({ error: { code: 'unauthenticated', message: 'Unauthorized' } }, 401);
  }

  if (auth.status === 'forbidden') {
    return json({ error: { code: 'forbidden', message: 'Forbidden' } }, 403);
  }

  return json({
    ok: true,
    user: {
      id: auth.user.id,
      email: auth.user.email,
      role: auth.user.role,
    },
  });
}
