// Single source of truth for pricing plans (BDT).
// Consumed by /pricing page and /api/pricing.
export type Plan = {
  id: 'starter' | 'pro' | 'business'
  name: string
  nameBn: string
  priceMonthly: number // BDT
  credits: number
  badge?: string
  tagline: string
  cta: string
  features: string[]
}

export const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    nameBn: 'স্টার্টার',
    priceMonthly: 599,
    credits: 6000,
    badge: 'Most Popular',
    tagline: 'শুরু করার জন্য সেরা — ৬০০০ ক্রেডিট',
    cta: 'স্টার্টার নিন',
    features: [
      '৬০০০ ক্রেডিট / মাস (১০০+ AI ভিডিও)',
      '১০GB NVMe হোস্টিং + ফ্রি .com ডোমেইন',
      '৫০+ বাংলা টেমপ্লেট (ঈদ, বৈশাখ, ১১.১১)',
      'ওয়াটারমার্ক ছাড়া ১০৮০p এক্সপোর্ট',
      'bKash / Nagad / Rocket সাপোর্ট',
      'ইমেইল সাপোর্ট',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    nameBn: 'প্রো',
    priceMonthly: 1299,
    credits: 13000,
    badge: '2× ভ্যালু',
    tagline: '২× ভ্যালু — ১৩০০০ ক্রেডিট',
    cta: 'প্রো নিন',
    features: [
      '১৩০০০ ক্রেডিট / মাস (২× ভ্যালু)',
      '৫০GB NVMe হোস্টিং + ফ্রি SSL',
      'API এক্সেস + টিম ৫ জন',
      '৪K এক্সপোর্ট + No watermark',
      'Priority সাপোর্ট',
      'সব প্রোডাক্ট আনলিমিটেড',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    nameBn: 'বিজনেস',
    priceMonthly: 2999,
    credits: 30000,
    tagline: 'আনলিমিটেড হোস্টিং — ৩০০০০ ক্রেডিট',
    cta: 'বিজনেস নিন',
    features: [
      '৩০০০০ ক্রেডিট / মাস',
      'আনলিমিটেড হোস্টিং + ফ্রি SSL',
      'আনলিমিটেড AI ভিডিও',
      'API এক্সেস + টিম আনলিমিটেড',
      'ডেডিকেটেড সাপোর্ট',
      'কাস্টম ডোমেইন আনলিমিটেড',
    ],
  },
]

export const CURRENCY = 'BDT'

// ============================================================================
// V17 — PAYMENT PLANS: single source of truth for EVERY money surface.
// 1cr = 1TK = 1 future HOST coin. Starter ৳599→6000cr · Pro ৳1299→13000cr ·
// Business ৳2999→30000cr. All payment routes/pages MUST import from here —
// no route may hardcode its own price/credit table.
// ============================================================================

export type PaymentPlanId = 'starter' | 'pro' | 'business'

export const PAYMENT_PLANS: Record<PaymentPlanId, {
  id: PaymentPlanId
  price: number       // BDT to pay
  credits: number    // credits granted on payment
  name: string
  nameBn: string
  usd: number
  popular: boolean
}> = {
  starter:  { id: 'starter',  price: 599,  credits: 6000,  name: 'Starter',  nameBn: 'স্টার্টার', usd: 5,    popular: false },
  pro:      { id: 'pro',      price: 1299, credits: 13000, name: 'Pro',      nameBn: 'প্রো',     usd: 10.8, popular: true },
  business: { id: 'business', price: 2999, credits: 30000, name: 'Business', nameBn: 'বিজনেস',  usd: 25,   popular: false },
}

/** Display table used by pricing UIs: [{id, tk, cr, usd}] */
export const PRICING_DISPLAY: Array<{ id: PaymentPlanId; tk: number; cr: number; usd: number }> =
  (Object.keys(PAYMENT_PLANS) as PaymentPlanId[]).map(id => ({
    id, tk: PAYMENT_PLANS[id].price, cr: PAYMENT_PLANS[id].credits, usd: PAYMENT_PLANS[id].usd,
  }))

/** The personal bKash Send-Money number customers pay to (manual mode). */
export const BKASH_PERSONAL = '01822417463'

/** credits granted for a plan payment (single source — replaces all creditsMap tables). */
export function planCredits(plan: string): number {
  return PAYMENT_PLANS[plan as PaymentPlanId]?.credits ?? 0
}

/** price in BDT for a plan (single source). */
export function planPrice(plan: string): number {
  return PAYMENT_PLANS[plan as PaymentPlanId]?.price ?? 0
}


// ============================================================================
// Credit pricing (single source of truth for API + dashboard hints)
// ============================================================================

/** Hosting creation cost in credits. */
export function HOSTING_PRICE(cpu = 1, ram = 1, storage = 10): number {
  return Math.ceil(cpu) * 10 + Math.ceil(ram) * 5 + Math.ceil(storage / 2)
}

/** Welcome credits granted at signup (2026-08-26). */
export const WELCOME_CREDITS = 6000

// ============================================================================
// Production hosting plans — 1 credit = 1 Taka, market-based (2026-08)
// Sources: Hetzner CX22 €3.79-5.83/mo, DO $12/mo, Vultr $10/mo
// ============================================================================

export type HostingPlanKey = 'starter' | 'basic' | 'pro' | 'premium'

export const HOSTING_PLANS: Record<HostingPlanKey, {
  cpu: number; ram: number; storage: number; price: number; hourly: number; label: string
}> = {
  starter: { cpu: 1, ram: 1, storage: 25, price: 599, hourly: 1, label: 'Starter' },
  basic:   { cpu: 2, ram: 2, storage: 50, price: 1199, hourly: 2, label: 'Basic' },
  pro:     { cpu: 2, ram: 4, storage: 80, price: 2499, hourly: 4, label: 'Pro' },
  premium: { cpu: 4, ram: 8, storage: 160, price: 4999, hourly: 8, label: 'Premium' },
}

/** Per-token chat rates (Taka per 1k tokens) by model class. */
export const CHAT_RATES: { match: RegExp; takaPer1k: number }[] = [
  { match: /(opus|o1)/i, takaPer1k: 10 },
  { match: /(gpt-4o($|[-.])|sonnet|gemini-2\.0-pro)/i, takaPer1k: 3 },
  { match: /(mini|haiku|flash|glm|kimi|deepseek|qwen|llama)/i, takaPer1k: 0.5 },
  { match: /llama-?3\.[12]-(8b|7b)|gemma/i, takaPer1k: 0.1 },
]

export function chatRateFor(modelId: string): number {
  for (const r of CHAT_RATES) if (r.match.test(modelId)) return r.takaPer1k
  return 0.5 // safe default
}

/** Video generation — market: Kling $0.05/s, Luma Ray 2 $0.10/5s. */
export const VIDEO_PRICE_PER_5S = 150 // credits (Taka)

/** Browser proxy usage. */
export const BROWSER_PRICE_PER_10_PAGES = 1

/** Resolve a hosting request to its plan + monthly price in Taka. */
export function resolveHostingPlan(cpu: number, ram: number, storage: number): HostingPlanKey | null {
  for (const [key, p] of Object.entries(HOSTING_PLANS)) {
    if (cpu <= p.cpu && ram <= p.ram && storage <= p.storage) return key as HostingPlanKey
  }
  return null // bigger than premium → custom quote
}

// ——— Monetization compat — Stripe/PayPal expect PRICING + normalizeTier ———
export type Tier = Plan['id']
export const PRICING: Record<Tier, { taka: number; usd: number; usdCents: number; credits: number; label: string; videosPerMonth: number; storageGB: number }> = {
  starter: { taka: 599, usd: 4.75, usdCents: 475, credits: 6000, label: 'Starter', videosPerMonth: 10, storageGB: 5 },
  pro: { taka: 1299, usd: 10.30, usdCents: 1030, credits: 13000, label: 'Pro', videosPerMonth: 30, storageGB: 20 },
  business: { taka: 2999, usd: 23.75, usdCents: 2375, credits: 30000, label: 'Business', videosPerMonth: 80, storageGB: 100 },
}
export function normalizeTier(v: unknown): Tier | null {
  const s = String(v || '').toLowerCase().trim()
  if (s === 'starter' || s === 'pro' || s === 'business') return s as Tier
  return null
}
export function formatTierPrice(tier: Tier, currency: 'BDT'|'USD' = 'BDT') {
  const p = PRICING[tier]
  return currency === 'USD' ? `$${p.usd.toFixed(2)}` : `৳${p.taka.toLocaleString()}`
}
