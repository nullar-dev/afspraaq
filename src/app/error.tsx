'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled route error', { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-6">
        <div className="max-w-lg text-center space-y-4">
          <h1 className="text-3xl font-bold">Something went wrong</h1>
          <p className="text-[#B0B0B0]">An unexpected error occurred. Please try again.</p>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center rounded-xl bg-gold px-5 py-3 font-semibold text-[#0A0A0A] hover:bg-gold-light"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
