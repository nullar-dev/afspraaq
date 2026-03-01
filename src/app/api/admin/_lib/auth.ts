import { NextResponse } from 'next/server';
import { getAdminAuthResult, type AdminAuthResult } from '@/lib/admin-auth';

export const json = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
    },
  });

export const authorizeAdmin = async (): Promise<
  { auth: Extract<AdminAuthResult, { status: 'ok' }> } | { response: NextResponse }
> => {
  const auth = await getAdminAuthResult();

  if (auth.status === 'unavailable') {
    return {
      response: json(
        { error: { code: 'auth_unavailable', message: 'Authentication unavailable' } },
        503
      ),
    };
  }

  if (auth.status === 'unauthenticated') {
    return {
      response: json({ error: { code: 'unauthenticated', message: 'Unauthorized' } }, 401),
    };
  }

  if (auth.status === 'forbidden') {
    console.warn('Admin access denied', { reason: auth.reason });
    return { response: json({ error: { code: 'forbidden', message: 'Forbidden' } }, 403) };
  }

  return { auth };
};
