// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    // Adjust sampling rate in production
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Session replay for error debugging
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    // Only enable in production to reduce noise
    enabled: process.env.NODE_ENV === 'production',
    environment: process.env.NODE_ENV || 'development',
    // Integrations
    integrations: [
      // Only add browser integrations on client side
      ...(typeof window !== 'undefined'
        ? [
            // BrowserTracing integration
            ...(Sentry.browserTracingIntegration
              ? [Sentry.browserTracingIntegration()]
              : []),
            // Replay integration for session replays
            ...(Sentry.replayIntegration
              ? [Sentry.replayIntegration()]
              : []),
          ]
        : []),
    ],
    // Performance monitoring
    enableWebVitals: true,
  });
}
