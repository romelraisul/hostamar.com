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
