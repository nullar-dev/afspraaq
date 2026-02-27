import { Suspense } from 'react';
import Login from '@/components/pages/Login';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0A0A]" />}>
      <Login />
    </Suspense>
  );
}
