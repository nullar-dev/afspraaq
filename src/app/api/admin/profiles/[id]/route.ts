import { authorizeAdmin, json } from '@/app/api/admin/_lib/auth';
import { logAdminReadAudit } from '@/app/api/admin/_lib/audit';
import { createClient } from '@/utils/supabase/server';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
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

  await logAdminReadAudit({
    supabase: supabase as never,
    actorUserId: adminAuth.auth.user.id,
    resource: 'profiles',
    action: 'get_one',
    targetId: id,
  });

  return json({ data });
}
