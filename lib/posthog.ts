// PostHog Analytics - Simplified for Next.js 14

export function initPostHog() {
  // Configure in app/providers.tsx
  // import posthog from 'posthog-js'
  // posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
  //   api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
  //   capture_pageview: true,
  //   capture_pageleave: true,
  // })
}

export function captureEvent(event: string, properties?: Record<string, any>) {
  console.log(`[PostHog] ${event}`, properties)
  // posthog.capture(event, properties) // Enable when PostHog configured
}

export function identifyUser(userId: string, traits?: Record<string, any>) {
  console.log(`[PostHog] identify ${userId}`, traits)
  // posthog.identify(userId, traits) // Enable when PostHog configured
}

export function setUserProperties(properties: Record<string, any>) {
  console.log('[PostHog] setUserProperties', properties)
  // posthog.people.set(properties) // Enable when PostHog configured
}

export function trackPageView(url: string) {
  console.log(`[PostHog] pageview: ${url}`)
  // posthog.capture('$pageview', { $current_url: url }) // Enable when PostHog configured
}

export function resetUser() {
  console.log('[PostHog] reset user')
  // posthog.reset() // Enable when PostHog configured
}

export function initPostHogClient() {
  // Initialize in browser
  // if (typeof window !== 'undefined') {
  //   initPostHog()
  // }
}