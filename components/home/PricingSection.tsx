'use client'

import { useLocale } from '@/lib/locale-context'
import CheckoutButton from '@/components/CheckoutButton'

const PLANS_BN = [
  {
    key: 'free',
    name: 'Free',
    price: '৳0',
    period: '/মাস',
    features: ['৫টি AI ভিডিও', '১GB হোস্টিং', 'AI চ্যাট বেসিক', 'bKash পেমেন্ট'],
    cta: 'ফ্রি শুরু করুন',
    popular: false,
  },
  {
    key: 'starter',
    name: 'Starter',
    price: '৳2,000',
    period: '/মাস',
    features: ['১০০ AI ভিডিও', '৫GB হোস্টিং', 'AI চ্যাট Pro + ব্রাউজার + IDE', '১০৮০p, কোনো ওয়াটারমার্ক নয়'],
    cta: 'Starter নির্বাচন করুন',
    popular: true,
  },
  {
    key: 'business',
    name: 'Business',
    price: '৳3,500',
    period: '/মাস',
    features: ['৩০০ AI ভিডিও', '২০GB হোস্টিং', 'সবকিছু আনলিমিটেড', 'গেম টুর্নামেন্ট হোস্ট করুন'],
    cta: 'Business নির্বাচন করুন',
    popular: false,
  },
]
const PLANS_EN = [
  {
    key: 'free',
    name: 'Free',
    price: '৳0',
    period: '/mo',
    features: ['5 AI videos', '1GB hosting', 'AI Chat basic', 'bKash payment'],
    cta: 'Start free',
    popular: false,
  },
  {
    key: 'starter',
    name: 'Starter',
    price: '৳2,000',
    period: '/mo',
    features: ['100 AI videos', '5GB hosting', 'AI Chat Pro + Browser + IDE', '1080p, no watermark'],
    cta: 'Choose Starter',
    popular: true,
  },
  {
    key: 'business',
    name: 'Business',
    price: '৳3,500',
    period: '/mo',
    features: ['300 AI videos', '20GB hosting', 'Everything unlimited', 'Host game tournaments'],
    cta: 'Choose Business',
    popular: false,
  },
]

export default function PricingSection() {
  const { locale } = useLocale()
  const isBengali = locale === 'bn'
  const plans = isBengali ? PLANS_BN : PLANS_EN

  return (
    <section id="pricing" className="bg-[#FCFCF9] px-5 py-16">
      <div className="mx-auto max-w-[1120px]">
        <h2 className="mb-10 text-center font-hind text-3xl font-bold tracking-tight text-[#18181B]">
          {isBengali ? 'সহজ প্রাইসিং' : 'Simple pricing'}
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.key}
              className={`relative flex flex-col rounded-2xl border bg-white p-7 ${
                p.popular ? 'border-[#0E7C3A] shadow-xl' : 'border-zinc-200'
              }`}
            >
              {p.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#0E7C3A] px-3 py-1 text-xs font-bold text-white">
                  {isBengali ? 'সবচেয়ে জনপ্রিয়' : 'Most Popular'}
                </span>
              )}
              <h3 className="font-hind text-xl font-bold text-[#18181B]">{p.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-hind text-4xl font-bold text-[#18181B]">{p.price}</span>
                <span className="text-sm text-zinc-500">{p.period}</span>
              </div>
              <ul className="mt-6 flex-1 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-zinc-700">
                    <span className="mt-0.5 text-[#0E7C3A]">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              {p.key === 'free' ? (
                <a
                  href="/signup"
                  className="mt-7 block w-full rounded-full border border-zinc-300 py-3 text-center font-semibold text-[#18181B] transition hover:bg-zinc-100"
                >
                  {p.cta}
                </a>
              ) : (
                <CheckoutButton
                  plan={p.key as 'starter' | 'business'}
                  label={p.cta}
                  className="mt-7 block w-full rounded-full bg-[#0E7C3A] py-3 text-center font-semibold text-white transition hover:bg-[#0A5A2B]"
                />
              )}
            </div>
          ))}
        </div>

        {/* Real payment wordmarks — no broken emoji */}
        <div className="mt-10 flex flex-col items-center gap-3">
          <p className="text-sm text-zinc-500">
            {isBengali ? 'লোকাল পেমেন্ট সাপোর্টেড' : 'Local payment supported'}
          </p>
          <div className="flex items-center gap-6 text-xl font-bold">
            <span className="text-[#0E7C3A]">bKash</span>
            <span className="text-[#E4312B]">Nagad</span>
            <span className="text-[#7B2FF7]">Rocket</span>
          </div>
        </div>
      </div>
    </section>
  )
}
