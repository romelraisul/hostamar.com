'use client'

import { useLocale } from '@/lib/locale-context'
import Link from 'next/link'

const TEMPLATES_BN = [
  { name: 'ঈদ উদযাপন', tag: 'ঈদ অফার', emoji: '🌙', bg: 'from-emerald-500/15 to-emerald-500/5' },
  { name: 'পহেলা বৈশাখ', tag: 'নববর্ষ', emoji: '🌿', bg: 'from-red-500/15 to-red-500/5' },
  { name: '১১.১১ সেল', tag: 'মেগা অফার', emoji: '🛍️', bg: 'from-amber-500/15 to-amber-500/5' },
  { name: 'ব্যবসা প্রোমো', tag: 'প্রোডাক্ট', emoji: '📈', bg: 'from-blue-500/15 to-blue-500/5' },
  { name: 'ইসলামিক নতুন বছর', tag: 'ধর্মীয়', emoji: '🕌', bg: 'from-green-600/15 to-green-600/5' },
  { name: 'ফুড প্রমো', tag: 'রেস্টুরেন্ট', emoji: '🍜', bg: 'from-orange-500/15 to-orange-500/5' },
]
const TEMPLATES_EN = [
  { name: 'Eid Celebration', tag: 'Eid Offer', emoji: '🌙', bg: 'from-emerald-500/15 to-emerald-500/5' },
  { name: 'Pohela Boishakh', tag: 'New Year', emoji: '🌿', bg: 'from-red-500/15 to-red-500/5' },
  { name: '11.11 Sale', tag: 'Mega Offer', emoji: '🛍️', bg: 'from-amber-500/15 to-amber-500/5' },
  { name: 'Business Promo', tag: 'Product', emoji: '📈', bg: 'from-blue-500/15 to-blue-500/5' },
  { name: 'Islamic New Year', tag: 'Religious', emoji: '🕌', bg: 'from-green-600/15 to-green-600/5' },
  { name: 'Food Promo', tag: 'Restaurant', emoji: '🍜', bg: 'from-orange-500/15 to-orange-500/5' },
]

export default function TemplatesSection() {
  const { locale } = useLocale()
  const isBengali = locale === 'bn'
  const templates = isBengali ? TEMPLATES_BN : TEMPLATES_EN

  return (
    <section id="templates" className="bg-[#FCFCF9] px-5 py-16">
      <div className="mx-auto max-w-[1120px]">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-hind text-3xl font-bold tracking-tight text-[#18181B]">
            {isBengali ? 'টেমপ্লেট দিয়ে শুরু করুন' : 'Start from a template'}
          </h2>
          <Link href="/prompts" className="text-sm font-semibold text-[#0E7C3A] hover:underline">
            {isBengali ? 'সব দেখুন →' : 'See all →'}
          </Link>
        </div>
      </div>
      <div className="no-scrollbar flex snap-x gap-4 overflow-x-auto px-5 pb-2 lg:px-[max(1.25rem,calc((100vw-1120px)/2))]">
        {templates.map((t) => (
          <Link
            key={t.name}
            href="/generate"
            className={`group flex min-w-[200px] snap-start flex-col justify-between rounded-2xl border border-zinc-200 bg-gradient-to-br ${t.bg} p-5 transition hover:-translate-y-1 hover:shadow-lg`}
          >
            <div className="mb-8 text-4xl">{t.emoji}</div>
            <div>
              <span className="mb-2 inline-block rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">
                {t.tag}
              </span>
              <div className="font-hind text-lg font-bold text-[#18181B]">{t.name}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
