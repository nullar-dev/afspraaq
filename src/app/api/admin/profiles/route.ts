import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuthResult } from '@/lib/admin-auth';
import { createClient } from '@/utils/supabase/server';

const ALLOWED_SORT_FIELDS = new Set(['id', 'email', 'role', 'created_at', 'updated_at']);

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

export async function GET(request: NextRequest) {
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

  const idsParam = request.nextUrl.searchParams.get('ids');
  if (idsParam) {
    const ids = idsParam
      .split(',')
      .map(value => value.trim())
      .filter(Boolean);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role, created_at, updated_at')
      .in('id', ids);

    if (error) {
      return json({ error: { code: 'query_failed', message: 'Unable to fetch profiles' } }, 500);
    }

    return json({ data: data ?? [] });
  }

  const page = Math.max(1, Number.parseInt(request.nextUrl.searchParams.get('page') ?? '1', 10));
  const perPage = Math.min(
    100,
    Math.max(1, Number.parseInt(request.nextUrl.searchParams.get('perPage') ?? '25', 10))
  );
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const sortFieldRaw = request.nextUrl.searchParams.get('sortField') ?? 'created_at';
  const sortField = ALLOWED_SORT_FIELDS.has(sortFieldRaw) ? sortFieldRaw : 'created_at';
  const sortOrder = request.nextUrl.searchParams.get('sortOrder') === 'ASC' ? 'ASC' : 'DESC';

  const { data, error, count } = await supabase
    .from('profiles')
    .select('id, email, role, created_at, updated_at', { count: 'exact' })
    .order(sortField, { ascending: sortOrder === 'ASC' })
    .range(from, to);

  if (error) {
    return json({ error: { code: 'query_failed', message: 'Unable to fetch profiles' } }, 500);
  }

  return json({
    data: data ?? [],
    total: count ?? 0,
  });
}
