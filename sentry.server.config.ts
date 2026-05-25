// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    // Adjust sampling rate in production
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Only enable in production to reduce noise
    enabled: process.env.NODE_ENV === 'production',
    environment: process.env.NODE_ENV || 'development',
  });
}
