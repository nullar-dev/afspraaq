import { NextResponse } from 'next/server';
import { getAdminAuthResult } from '@/lib/admin-auth';
import { createClient } from '@/utils/supabase/server';

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
    },
  });

const authorizeAdmin = async () => {
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
  return null;
};

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorizedResponse = await authorizeAdmin();
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const supabase = await createClient();
  if (!supabase) {
    return json(
      { error: { code: 'auth_unavailable', message: 'Authentication unavailable' } },
      503
    );
  }

  const { id } = await context.params;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, role, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return json({ error: { code: 'query_failed', message: 'Unable to fetch profile' } }, 500);
  }

  if (!data) {
    return json({ error: { code: 'not_found', message: 'Profile not found' } }, 404);
  }

  return json({ data });
}
