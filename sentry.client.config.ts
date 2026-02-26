import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: 0.1,

  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Release tracking
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  // Environment
  environment: process.env.NODE_ENV,

  // Filter out common non-errors
  beforeSend(event) {
    // Drop events with /api/ in URL
    if (event.request?.url?.includes('/api/')) {
      return null;
    }
    return event;
  },
});
