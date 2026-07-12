// ============================================================================
// Shared subscription gate — single source of truth for "what can this plan do".
// Every product page (video, hosting, chat, browser, ide, game) and the
// dashboard tiles call hasAccess() / getQuota() from here so the 6 products
// behave as ONE subscription instead of six disconnected apps.
//
// Plans map to the Subscription.plan string in prisma/schema.prisma:
//   'free' | 'starter' | 'business'
// (legacy aliases 'pro'/'enterprise' are normalised to 'business').
// ============================================================================

export type PlanId = 'free' | 'starter' | 'business'

export type ProductSlug =
  | 'ai-video'
  | 'cloud-hosting'
  | 'ai-chat'
  | 'ai-browser'
  | 'dev-ide'
  | 'game'

export interface PlanQuota {
  videosPerMonth: number // -1 = unlimited
  storageGB: number
  chat: 'basic' | 'pro' | 'unlimited'
  maxExport: '720p' | '1080p' | '4K'
  brandKits: number // -1 = unlimited
  teamSeats: number
  api: boolean
  gameHosting: boolean
  // Which of the 6 products this plan may open at all.
  products: Record<ProductSlug, boolean>
}

const ALL_PRODUCTS: Record<ProductSlug, boolean> = {
  'ai-video': true,
  'cloud-hosting': true,
  'ai-chat': true,
  'ai-browser': true,
  'dev-ide': true,
  'game': true,
}

export const PLAN_QUOTAS: Record<PlanId, PlanQuota> = {
  free: {
    videosPerMonth: 5,
    storageGB: 1,
    chat: 'basic',
    maxExport: '720p',
    brandKits: 1,
    teamSeats: 1,
    api: false,
    gameHosting: false,
    // Free can OPEN every product (freemium funnel), quotas throttle usage.
    products: { ...ALL_PRODUCTS },
  },
  starter: {
    videosPerMonth: 30,
    storageGB: 5,
    chat: 'pro',
    maxExport: '1080p',
    brandKits: 3,
    teamSeats: 1,
    api: false,
    gameHosting: false,
    products: { ...ALL_PRODUCTS },
  },
  business: {
    videosPerMonth: -1,
    storageGB: 20,
    chat: 'unlimited',
    maxExport: '4K',
    brandKits: -1,
    teamSeats: 5,
    api: true,
    gameHosting: true,
    products: { ...ALL_PRODUCTS },
  },
}

/** Normalise any stored plan string to a canonical PlanId. */
export function normalizePlan(plan?: string | null): PlanId {
  const p = (plan || 'free').toLowerCase().trim()
  if (p === 'business' || p === 'pro' || p === 'enterprise' || p === 'agency') return 'business'
  if (p === 'starter' || p === 'popular') return 'starter'
  return 'free'
}

/** Minimal shape a caller needs to pass in (server: from Subscription row; client: from /api/subscription). */
export interface SubscriptionLike {
  plan?: string | null
  status?: string | null
}

export function getQuota(sub?: SubscriptionLike | null): PlanQuota {
  const active = !sub?.status || sub.status === 'active'
  const plan = active ? normalizePlan(sub?.plan) : 'free'
  return PLAN_QUOTAS[plan]
}

/**
 * Can this subscription open a given product?
 * All 6 products are openable on every plan (freemium) — usage caps are
 * enforced via getQuota(). Pass a stricter product map in PLAN_QUOTAS to lock
 * a product behind a paid tier.
 */
export function hasAccess(sub: SubscriptionLike | null | undefined, product: ProductSlug): boolean {
  const quota = getQuota(sub)
  return quota.products[product] === true
}

/** Does the plan bundle unlimited access to everything? (Business.) */
export function isUnlimited(sub?: SubscriptionLike | null): boolean {
  return normalizePlan(sub?.plan) === 'business' && (!sub?.status || sub?.status === 'active')
}

export const PLAN_LABEL: Record<PlanId, string> = {
  free: 'Free',
  starter: 'Starter',
  business: 'Business',
}

export const PLAN_PRICE_BDT: Record<PlanId, number> = {
  free: 0,
  starter: 2000,
  business: 3500,
}
