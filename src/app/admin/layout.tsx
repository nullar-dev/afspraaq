import { redirect } from 'next/navigation';
import { getAdminAuthResult } from '@/lib/admin-auth';
import { AdminLayoutClient } from '@/components/admin/layout/AdminLayoutClient';

const LOGIN_REDIRECT = '/login?redirect=/admin';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let auth: Awaited<ReturnType<typeof getAdminAuthResult>> | null = null;

  try {
    auth = await getAdminAuthResult();
  } catch (error) {
    console.error(
      'Admin layout auth error',
      error instanceof Error ? error.message : 'unknown_error'
    );
    redirect(LOGIN_REDIRECT);
    return null;
  }

  if (!auth) {
    redirect(LOGIN_REDIRECT);
    return null;
  }

  if (auth.status === 'unauthenticated' || auth.status === 'unavailable') {
    redirect(LOGIN_REDIRECT);
    return null;
  }

  if (auth.status === 'forbidden') {
    redirect('/');
    return null;
  }

  return <AdminLayoutClient user={auth.user}>{children}</AdminLayoutClient>;
}
