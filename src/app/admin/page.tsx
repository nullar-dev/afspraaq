import { redirect } from 'next/navigation';
import AdminApp from '@/components/admin/AdminApp';
import { getAdminAuthResult } from '@/lib/admin-auth';
import type { AdminAuthResult } from '@/lib/admin-auth';

export default async function AdminPage() {
  let auth: AdminAuthResult;
  try {
    auth = await getAdminAuthResult();
  } catch (error) {
    console.error('Admin auth check failed', error);
    redirect('/login?redirect=/admin');
    return null;
  }

  if (!auth || auth.status === 'unauthenticated' || auth.status === 'unavailable') {
    redirect('/login?redirect=/admin');
    return null;
  }

  if (auth.status === 'forbidden') {
    redirect('/');
    return null;
  }

  return <AdminApp />;
}
