'use client';

import { Card, Button } from '@/components/admin/ui';

export default function ScheduleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  void error;
  const message = 'An unexpected error occurred while loading the schedule.';

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Schedule</h1>
        <p className="text-dark-900 mt-1">Manage appointments and availability.</p>
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
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold mb-2">Failed to Load Schedule</h2>
        <p className="text-dark-900 mb-6">{message}</p>
        <Button onClick={reset}>Try Again</Button>
      </Card>
    </div>
  );
}
