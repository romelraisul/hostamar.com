// PostHog Analytics Client
// Provides identify, track, and pageView helpers for PostHog

import posthog from 'posthog-js';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

let initialized = false;

/**
 * Initialize PostHog on the client side.
 * Called automatically by the PostHogProvider component.
 */
export function initPostHog() {
  if (initialized || typeof window === 'undefined') return;
  if (!POSTHOG_KEY) return;

  try {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: false, // We manually track pageviews for more control
      loaded: () => {
        initialized = true;
      },
      persistence: 'localStorage+cookie',
    });
  } catch (error) {
    console.warn('[PostHog] Failed to initialize:', error);
  }
}

/**
 * Identify a user with their unique ID and optional traits.
 * @param userId - Unique identifier for the user
 * @param traits - Optional user properties (email, name, plan, etc.)
 */
export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  if (typeof window === 'undefined' || !POSTHOG_KEY) return;

  try {
    if (!initialized) initPostHog();
    if (posthog.__loaded) {
      posthog.identify(userId, traits || {});
    }
  } catch (error) {
    console.warn('[PostHog] identifyUser failed:', error);
  }
}

/**
 * Track a custom event with optional properties.
 * @param name - Event name (e.g., 'purchase', 'sign_up')
 * @param properties - Optional event properties
 */
export function trackEvent(name: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined' || !POSTHOG_KEY) return;

  try {
    if (!initialized) initPostHog();
    if (posthog.__loaded) {
      posthog.capture(name, properties || {});
    }
  } catch (error) {
    console.warn('[PostHog] trackEvent failed:', error);
  }
}

/**
 * Track a page view with optional properties.
 * @param url - The URL or path of the page being viewed
 */
export function pageView(url: string) {
  if (typeof window === 'undefined' || !POSTHOG_KEY) return;

  try {
    if (!initialized) initPostHog();
    if (posthog.__loaded) {
      posthog.capture('$pageview', {
        $current_url: url,
        path: url,
      });
    }
  } catch (error) {
    console.warn('[PostHog] pageView failed:', error);
  }
}

/**
 * Reset the user identity (useful for logout).
 */
export function resetUser() {
  if (typeof window === 'undefined' || !POSTHOG_KEY) return;

  try {
    if (posthog.__loaded) {
      posthog.reset();
    }
  } catch (error) {
    console.warn('[PostHog] resetUser failed:', error);
  }
}
