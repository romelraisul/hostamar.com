/**
 * Analytics event emitter — wraps plausible/GA4/mixpanel
 * Drop-in: just call track(event, props) anywhere.
 */

type EventPayload = {
  name: string
  props?: Record<string, string | number | boolean>
  userId?: string
}

const ANALYTICS_PROVIDER = process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER || 'console'

/** Track an event. Safe to call on server and client. */
export function track(event: string, props?: Record<string, string | number | boolean>, userId?: string) {
  if (typeof window === 'undefined') {
    // Server-side: log or forward to analytics API
    if (process.env.NODE_ENV === 'development') {
      console.log('[analytics]', event, props)
    }
    return
  }

  // Client-side
  const payload: EventPayload = { name: event, props, userId }

  switch (ANALYTICS_PROVIDER) {
    case 'plausible':
      // @ts-ignore
      window.plausible?.(event, { props })
      break
    case 'ga4':
      // @ts-ignore
      window.gtag?.('event', event, props)
      break
    case 'mixpanel':
      // @ts-ignore
      window.mixpanel?.track(event, props)
      break
    default:
      if (process.env.NODE_ENV === 'development') {
        console.log('[analytics]', event, props)
      }
  }
}

/** Predefined funnel events */
export const Events = {
  signup: 'signup',
  createGame: 'create_game',
  firstMove: 'first_move',
  completedGame: 'completed_game',
  subscribe: 'subscribe',
  videoGenerated: 'video_generated',
  billingCheckoutStarted: 'billing_checkout_started',
  billingCheckoutCompleted: 'billing_checkout_completed',
  billingSubscriptionCancelled: 'billing_subscription_cancelled',
} as const
