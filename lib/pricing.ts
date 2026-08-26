// Single source of truth for pricing plans (BDT).
// Consumed by /pricing page and /api/pricing.
export type Plan = {
  id: 'free' | 'starter' | 'pro'
  name: string
  priceMonthly: number // BDT
  priceEarlyMonthly?: number // Early 1000/mo promo
  badge?: string
  tagline: string
  cta: string
  features: string[]
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    priceMonthly: 0,
    tagline: 'ট্রাই করুন — ক্রেডিট কার্ড লাগবে না',
    cta: 'ফ্রি শুরু করুন',
    features: [
      '৩টি AI ভিডিও / মাস (ওয়াটারমার্ক সহ)',
      '১GB BDIX হোস্টিং',
      '৫০+ বাংলা টেমপ্লেট (প্রিভিউ)',
      'Chat বেসিক',
      '৭২০p এক্সপোর্ট',
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    priceMonthly: 2000,
    priceEarlyMonthly: 1000,
    badge: 'Most Popular',
    tagline: 'SME দের পছন্দ — ১০০ ভিডিও',
    cta: 'Starter নিন',
    features: [
      '১০০ AI ভিডিও / মাস (ওয়াটারমার্ক ছাড়া)',
      '১০GB NVMe হোস্টিং + ফ্রি .com ডোমেইন',
      '৫০+ বাংলা টেমপ্লেট (ঈদ, বৈশাখ, 11.11) সব',
      'bKash / Nagad / Rocket',
      '১০৮০p, No watermark',
      'Priority সাপোর্ট',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 3500,
    priceEarlyMonthly: 1000,
    tagline: 'এজেন্সি ও টিম — Unlimited',
    cta: 'Pro নিন',
    features: [
      'Unlimited AI ভিডিও',
      '২০GB NVMe + ফ্রি SSL',
      'API এক্সেস + টিম ৫ জন',
      'সব প্রোডাক্ট আনলিমিটেড',
      '4K এক্সপোর্ট',
      'Priority সাপোর্ট',
    ],
  },
]

export const CURRENCY = 'BDT'


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
