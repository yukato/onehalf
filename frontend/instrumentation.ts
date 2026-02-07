import * as Sentry from '@sentry/nextjs';

export async function register() {
  const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

  if (SENTRY_DSN) {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
      // Server-side initialization
      Sentry.init({
        dsn: SENTRY_DSN,
        environment: process.env.NODE_ENV,
        release: '2.0.0',
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        enabled: process.env.NODE_ENV === 'production',
      });
    }

    if (process.env.NEXT_RUNTIME === 'edge') {
      // Edge runtime initialization
      Sentry.init({
        dsn: SENTRY_DSN,
        environment: process.env.NODE_ENV,
        release: '2.0.0',
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        enabled: process.env.NODE_ENV === 'production',
      });
    }
  }
}
