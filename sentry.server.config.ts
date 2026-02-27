import * as Sentry from '@sentry/nextjs';

const SENSITIVE_QUERY_KEYS: readonly string[] = [
  'token',
  'access_token',
  'refresh_token',
  'code',
  'otp',
  'api_key',
  'password',
  'secret',
  'private_key',
];

const scrubSensitiveData = (event: Sentry.Event) => {
  if (event.request?.headers) {
    delete event.request.headers.authorization;
    delete event.request.headers.Authorization;
    delete event.request.headers.cookie;
    delete event.request.headers.Cookie;
  }

  if (event.request?.url) {
    try {
      const url = new URL(event.request.url);
      for (const key of SENSITIVE_QUERY_KEYS) {
        if (url.searchParams.has(key)) {
          url.searchParams.set(key, '[REDACTED]');
        }
      }
      event.request.url = url.toString();
    } catch {
      let redactedUrl = event.request.url;
      for (const key of SENSITIVE_QUERY_KEYS) {
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(`([?&]${escapedKey}=)([^&]*)`, 'gi');
        redactedUrl = redactedUrl.replace(pattern, '$1[REDACTED]');
      }
      event.request.url = redactedUrl;
    }
  }

  return event;
};

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: 0.1,

  // Release tracking
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  // Environment
  environment: process.env.NODE_ENV,

  beforeSend(event) {
    return scrubSensitiveData(event);
  },
});
