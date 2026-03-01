import type { Database } from '@/types/supabase.generated';
import { createClient } from '@/utils/supabase/server';

type ProfileRole = Database['public']['Tables']['profiles']['Row']['role'];

interface AdminUser {
  id: string;
  email: string | null;
  role: ProfileRole;
}

type AdminForbiddenReason = 'profile_lookup_failed' | 'profile_missing' | 'role_mismatch';

export type AdminAuthResult =
  | { status: 'ok'; user: AdminUser }
  | { status: 'unavailable' }
  | { status: 'unauthenticated' }
  | { status: 'forbidden'; reason: AdminForbiddenReason };

export const getAdminAuthResult = async (): Promise<AdminAuthResult> => {
  const supabase = await createClient();
  if (!supabase) {
    return { status: 'unavailable' };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: 'unauthenticated' };
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    return { status: 'forbidden', reason: 'profile_lookup_failed' };
  }

  if (!profile) {
    return { status: 'forbidden', reason: 'profile_missing' };
  }

  if (profile.role !== 'admin') {
    return { status: 'forbidden', reason: 'role_mismatch' };
  }

  return {
    status: 'ok',
    user: {
      id: user.id,
      email: user.email ?? null,
      role: profile.role,
    },
  };
};
