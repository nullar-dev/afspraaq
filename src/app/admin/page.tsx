import { redirect } from 'next/navigation';
import AdminApp from '@/components/admin/AdminApp';
import { getAdminAuthResult } from '@/lib/admin-auth';

export default async function AdminPage() {
  const auth = await getAdminAuthResult();

  if (auth.status === 'unauthenticated' || auth.status === 'unavailable') {
    redirect('/login?redirect=/admin');
  }

  if (auth.status === 'forbidden') {
    redirect('/');
  }

  return <AdminApp />;
}
