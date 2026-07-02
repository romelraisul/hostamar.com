// Monitoring Wrapper - Combines Sentry error tracking + PostHog analytics
// Provides a unified interface for error tracking, event tracking, and performance monitoring.

import * as Sentry from '@sentry/nextjs';
import { trackEvent as posthogTrack, identifyUser as posthogIdentify, pageView as posthogPageView } from './posthog';

// ---------------------------------------------------------------------------
// Error Tracking (Sentry + optional PostHog log)
// ---------------------------------------------------------------------------

/**
 * Track an error through Sentry with optional context.
 * Also logs to PostHog if the error has a name property.
 *
 * @param error - The error object or message string
 * @param context - Optional context data (tags, extra info, user)
 */
export function trackError(
  error: Error | string,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    user?: { id: string; email?: string; username?: string };
    level?: Sentry.SeverityLevel;
  }
) {
  const errorObj = typeof error === 'string' ? new Error(error) : error;

  // Set user context if provided
  if (context?.user) {
    Sentry.setUser(context.user);
  }

  // Set tags if provided
  if (context?.tags) {
    Sentry.setTags(context.tags);
  }

  // Set extra context if provided
  if (context?.extra) {
    Sentry.setExtras(context.extra);
  }

  // Capture the error with Sentry
  Sentry.captureException(errorObj, {
    level: context?.level || 'error',
  });

  // Also log to PostHog as an event
  try {
    posthogTrack('$error', {
      error_name: errorObj.name,
      error_message: errorObj.message,
      error_stack: errorObj.stack,
      ...context?.extra,
      ...context?.tags,
    });
  } catch {
    // PostHog tracking is best-effort
  }
}

// ---------------------------------------------------------------------------
// Event Tracking (PostHog)
// ---------------------------------------------------------------------------

/**
 * Track a custom event through PostHog.
 *
 * @param name - Event name (e.g., 'signup', 'purchase', 'feature_used')
 * @param data - Optional event properties / data
 */
export function trackEvent(name: string, data?: Record<string, unknown>) {
  posthogTrack(name, data);
}

// ---------------------------------------------------------------------------
// Performance Tracking
// ---------------------------------------------------------------------------

/**
 * Track a performance metric (e.g., API call duration, page load time).
 * Sends to both Sentry (as a span/transaction) and PostHog (as an event).
 *
 * @param name - Name of the operation being measured
 * @param durationMs - Duration in milliseconds
 * @param metadata - Optional additional context
 */
export function trackPerformance(
  name: string,
  durationMs: number,
  metadata?: Record<string, unknown>
) {
  // Sentry performance tracking
  Sentry.metrics?.distribution?.('performance', durationMs, {
    unit: 'milliseconds',
    // @ts-ignore — tags property may not exist on MetricOptions in all Sentry versions
    tags: { operation: name } as any,
  } as any);

  // PostHog performance event
  posthogTrack('$performance', {
    operation: name,
    duration_ms: durationMs,
    ...metadata,
  });
}

// ---------------------------------------------------------------------------
// User Identification (PostHog + Sentry)
// ---------------------------------------------------------------------------

/**
 * Identify a user across Sentry and PostHog.
 *
 * @param userId - Unique user identifier
 * @param traits - User properties (email, name, plan, etc.)
 */
export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  // Sentry user context
  Sentry.setUser({
    id: userId,
    // @ts-expect-error — spread of potentially-undefined traits values
    ...(traits?.email && { email: traits.email as string }),
    // @ts-expect-error — spread of potentially-undefined traits values
    ...(traits?.username && { username: traits.username as string }),
  });

  // PostHog user identification
  posthogIdentify(userId, traits);
}

// ---------------------------------------------------------------------------
// Page View Tracking
// ---------------------------------------------------------------------------

/**
 * Track a page view through PostHog.
 *
 * @param url - The URL/path being viewed
 */
export function trackPageView(url: string) {
  posthogPageView(url);
}

// ---------------------------------------------------------------------------
// Convenience: Start a Sentry transaction/span for server-side performance
// ---------------------------------------------------------------------------

/**
 * Create a Sentry transaction for server-side performance tracking.
 * Returns an object with start/end/error methods.
 *
 * Usage:
 *   const perf = startPerformance('api.my-endpoint');
 *   // ...do work...
 *   perf.end({ result: 'success' });
 */
export function startPerformance(name: string) {
  const startTime = performance.now();

  return {
    end: (metadata?: Record<string, unknown>) => {
      const duration = performance.now() - startTime;
      trackPerformance(name, duration, metadata);
    },
    error: (err: Error, metadata?: Record<string, unknown>) => {
      const duration = performance.now() - startTime;
      trackPerformance(name, duration, { ...metadata, error: true });
      trackError(err, { extra: { operation: name, duration_ms: duration, ...metadata } });
    },
  };
}
