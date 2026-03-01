import { mockDashboardData } from '@/lib/admin/mock/dashboard';
import { Dashboard } from '@/components/admin/dashboard/Dashboard';

export default function AdminDashboardPage() {
  return <Dashboard data={mockDashboardData} />;
}
