import { authorizeAdmin, json } from '@/app/api/admin/_lib/auth';

export async function GET() {
  const adminAuth = await authorizeAdmin();
  if ('response' in adminAuth) {
    return adminAuth.response;
  }

  return json({
    ok: true,
    user: {
      id: adminAuth.auth.user.id,
      email: adminAuth.auth.user.email,
      role: adminAuth.auth.user.role,
    },
  });
}
