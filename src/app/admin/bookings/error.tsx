'use client';

import { Card, Button } from '@/components/admin/ui';

export default function BookingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Log for debugging without exposing details to users
  console.error('Bookings page error:', error);
  const message = 'An unexpected error occurred while loading the bookings.';

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Bookings</h1>
        <p className="text-dark-900 mt-1">Manage all customer appointments and reservations.</p>
      </div>

      <Card className="p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold mb-2">Failed to Load Bookings</h2>
        <p className="text-dark-900 mb-6">{message}</p>
        <Button onClick={reset}>Try Again</Button>
      </Card>
    </div>
  );
}
