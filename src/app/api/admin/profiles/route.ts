import { NextRequest } from 'next/server';
import { authorizeAdmin, json } from '@/app/api/admin/_lib/auth';
import { logAdminReadAudit } from '@/app/api/admin/_lib/audit';
import { createClient } from '@/utils/supabase/server';

const ALLOWED_SORT_FIELDS = new Set(['id', 'email', 'role', 'created_at', 'updated_at']);
const MAX_IDS_FILTER = 100;

export async function GET(request: NextRequest) {
  const adminAuth = await authorizeAdmin();
  if ('response' in adminAuth) {
    return adminAuth.response;
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
    if (ids.length > MAX_IDS_FILTER) {
      return json(
        {
          error: {
            code: 'too_many_ids',
            message: `Maximum ${MAX_IDS_FILTER} ids are allowed per request`,
          },
        },
        400
      );
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role, created_at, updated_at')
      .in('id', ids);

    if (error) {
      return json({ error: { code: 'query_failed', message: 'Unable to fetch profiles' } }, 500);
    }

    await logAdminReadAudit({
      supabase,
      actorUserId: adminAuth.auth.user.id,
      resource: 'profiles',
      action: 'get_many',
      metadata: {
        idsCount: ids.length,
      },
    });

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

  await logAdminReadAudit({
    supabase,
    actorUserId: adminAuth.auth.user.id,
    resource: 'profiles',
    action: 'list',
    metadata: {
      page,
      perPage,
      sortField,
      sortOrder,
      returnedCount: Array.isArray(data) ? data.length : 0,
      total: count ?? 0,
    },
  });

  return json({
    data: data ?? [],
    total: count ?? 0,
  });
}
