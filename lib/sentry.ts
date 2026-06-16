// Sentry Error Tracking - Simplified for Next.js 14
// Configure in sentry.client.config.ts, sentry.server.config.ts, sentry.edge.config.ts

export function captureException(error: Error, context?: Record<string, any>) {
  console.error('Error captured:', error, context)
  // Sentry.captureException(error, { extra: context }) // Enable when Sentry configured
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  console.log(`[${level.toUpperCase()}] ${message}`)
  // Sentry.captureMessage(message, level) // Enable when Sentry configured
}

export function setUserContext(user: { id: string; email?: string; name?: string }) {
  // Sentry.setUser(user) // Enable when Sentry configured
}

export function initSentry() {
  // Initialize in sentry.client.config.ts, sentry.server.config.ts, sentry.edge.config.ts
  // import * as Sentry from '@sentry/nextjs'
  // Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 })
}