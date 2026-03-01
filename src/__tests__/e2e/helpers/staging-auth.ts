import { createClient } from '@supabase/supabase-js';

type Role = 'user' | 'admin';

export interface EphemeralUser {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
}

const supabaseUrl = process.env.E2E_SUPABASE_URL || '';
const serviceRoleKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY || '';

export const hasStagingAdminEnv = () => Boolean(supabaseUrl && serviceRoleKey);

export const requireStagingAdminEnv = () => {
  if (hasStagingAdminEnv()) {
    return;
  }

  throw new Error(
    'Missing required staging env for E2E: E2E_SUPABASE_URL and E2E_SUPABASE_SERVICE_ROLE_KEY'
  );
};

const getAdminClient = () => {
  if (!hasStagingAdminEnv()) {
    throw new Error('Missing E2E_SUPABASE_URL or E2E_SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const randomSuffix = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const uniqueEmail = (prefix: string) => `${prefix}.${randomSuffix()}@example.test`;

const ensureProfileRole = async (userId: string, role: Role) => {
  const admin = getAdminClient();

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { data: profile } = await admin
      .from('profiles')
      .select('id, role')
      .eq('id', userId)
      .maybeSingle();

    if (profile) {
      const { error } = await admin.from('profiles').update({ role }).eq('id', userId);
      if (!error) return;
    }

    await sleep(400);
  }

  throw new Error(`Unable to set role=${role} for profile ${userId}`);
};

export const createEphemeralUser = async (role: Role = 'user'): Promise<EphemeralUser> => {
  const admin = getAdminClient();
  const email = uniqueEmail(`e2e.${role}`);
  const password = `E2E-${randomSuffix()}-Aa1!`;
  const firstName = role === 'admin' ? 'E2EAdmin' : 'E2EUser';
  const lastName = 'Test';

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
    },
  });

  if (error || !data.user) {
    throw new Error(`Unable to create ephemeral ${role} user: ${error?.message || 'unknown'}`);
  }

  await ensureProfileRole(data.user.id, role);

  return {
    id: data.user.id,
    email,
    password,
    firstName,
    lastName,
    role,
  };
};

export const deleteEphemeralUser = async (userId: string) => {
  const admin = getAdminClient();
  await admin.auth.admin.deleteUser(userId);
};
