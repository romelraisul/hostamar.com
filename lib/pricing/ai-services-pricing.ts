/**
 * AI-services market pricing (V12) — 105 deduped products priced against the
 * Fiverr market research at a 60% discount (market-leader positioning),
 * in credits where 1cr = 1TK = 1 future HOST coin.
 *
 * Formula for non-listed products: priceCr = fiverrUSD_avg * 120 * 0.4,
 * clamped 100..5000. Tier multipliers: basic x1, standard x2.4, premium x5.
 */
import { USD_TO_TK } from './market-pricing'

export type ServiceTiers = { basic: number; standard: number; premium: number }
export type MarketPricing = {
  tiers: ServiceTiers
  fiverrUSD: string
  fiverrAvgUSD: number
  hostamarDiscountPct: number
}

/** Curated Fiverr-research-anchored tiers for key services. */
const CURATED: Record<string, ServiceTiers> = {
  // voiceover family — Fiverr $20-$60 basic = 2400-7200TK
  'voiceover':              { basic: 500,  standard: 1200, premium: 2500 },
  'voiceover-english':      { basic: 500,  standard: 1200, premium: 2500 },
  'voiceover-hindi':        { basic: 500,  standard: 1200, premium: 2500 },
  'tts-bn':                 { basic: 400,  standard: 900,  premium: 1800 },
  'meditation-audiobook':   { basic: 600,  standard: 1400, premium: 2800 },
  'audiobook-narration':    { basic: 1000, standard: 2400, premium: 4800 },
  // logo/brand — Fiverr logo $20-$100, brand premium $150-$350
  'logo-design':            { basic: 400,  standard: 900,  premium: 1800 },
  'brand-identity-starter': { basic: 800,  standard: 1800, premium: 3500 },
  'business-card':          { basic: 300,  standard: 700,  premium: 1400 },
  // writing — Fiverr AI content $25-$60 basic = 3000-7200TK
  'video-script':           { basic: 300,  standard: 700,  premium: 1400 },
  'youtube-script':         { basic: 300,  standard: 700,  premium: 1400 },
  'seo-article':            { basic: 400,  standard: 900,  premium: 1800 },
  'blog-post-expander':     { basic: 400,  standard: 900,  premium: 1800 },
  'social-media-post':      { basic: 200,  standard: 500,  premium: 1000 },
  // video — Fiverr $10-$50 = 1200-6000TK
  'video-editing':          { basic: 600,  standard: 1500, premium: 3000 },
  'short-video-ad':         { basic: 600,  standard: 1500, premium: 3000 },
  // graphics — Fiverr thumbnail $5-$20
  'thumbnail-design':       { basic: 150,  standard: 350,  premium: 700 },
  'youtube-thumbnail-studio': { basic: 150, standard: 350,  premium: 700 },
  // voice clone — Fiverr $25-$60
  'ai-voice-cloning':       { basic: 800,  standard: 1800, premium: 3500 },
}

const CATEGORY_BASE_USD: Record<string, number> = {
  'Graphics & Design': 20,
  'Writing': 25,
  'Video': 30,
  'Digital Marketing': 25,
  'Music & Audio': 20,
  'Programming': 40,
  'Business': 30,
  'AI Services': 25,
  // existing-50 categories
  'Social Media': 15,
  'E-commerce': 20,
  'Event': 15,
  'Organization': 20,
  'Professional': 20,
  'Content Creator': 20,
}

export function priceService(id: string, category: string, existingCreditCost?: number): MarketPricing {
  let fiverrAvgUSD = CATEGORY_BASE_USD[category] ?? 25
  let tiers = CURATED[id]

  if (!tiers) {
    if (existingCreditCost && existingCreditCost > 0) {
      // existing-50 services: re-anchor to their own catalog cost (already
      // market-set 15-100cr) scaled to real tiers.
      tiers = { basic: Math.max(100, existingCreditCost), standard: Math.round(existingCreditCost * 2.4), premium: existingCreditCost * 5 }
      fiverrAvgUSD = (existingCreditCost / (USD_TO_TK * 0.4))
    } else {
      const base = Math.round(fiverrAvgUSD * USD_TO_TK * 0.4) // 60% discount
      tiers = { basic: clamp(base), standard: clamp(Math.round(base * 2.4)), premium: clamp(base * 5) }
    }
  }
  const basicUsd = tiers.basic / (USD_TO_TK * 0.4) // what the basic tier would cost at Fiverr parity
  const discount = Math.max(40, Math.round((1 - tiers.basic / (fiverrAvgUSD * USD_TO_TK)) * 100))
  return { tiers, fiverrUSD: `$${fiverrAvgUSD}`, fiverrAvgUSD, hostamarDiscountPct: discount, ...(basicUsd ? {} : {}) }
}

function clamp(n: number): number {
  return Math.min(5000, Math.max(100, Math.round(n / 10) * 10))
}
