'use client'

import Link from 'next/link'
import { PRODUCT_NAV } from '@/lib/products'
import { useSubscription } from '@/lib/use-subscription'
import { PLAN_LABEL } from '@/lib/subscription'

// Dashboard interop hub: one tile per product, all reading the SAME subscription.
// This is what makes the 6 products "work together" — single auth, single plan,
// single usage view. Cross-sell links live in-product; here we just route.
export default function ProductsGrid() {
  const sub = useSubscription()
  const q = sub.quota

  const usageFor = (slug: string): string => {
    switch (slug) {
      case 'ai-video':
        return q.videosPerMonth === -1 ? 'আনলিমিটেড ভিডিও' : `${q.videosPerMonth} ভিডিও/মাস`
      case 'cloud-hosting':
        return `${q.storageGB}GB স্টোরেজ`
      case 'ai-chat':
        return `চ্যাট: ${q.chat}`
      case 'ai-browser':
        return `এক্সপোর্ট: ${q.maxExport}`
      case 'dev-ide':
        return q.api ? 'API অ্যাক্সেস চালু' : 'বেসিক IDE'
      case 'game':
        return q.gameHosting ? 'গেম হোস্টিং চালু' : 'ট্রায়াল'
      default:
        return ''
    }
  }

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">আপনার ৬টি প্রোডাক্ট</h2>
        <span className="rounded-full bg-[#0E7C3A]/10 px-3 py-1 text-xs font-semibold text-[#0E7C3A]">
          {PLAN_LABEL[sub.plan]} প্ল্যান
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PRODUCT_NAV.map((p) => {
          const ok = sub.hasAccess(p.slug as any)
          return (
            <Link
              key={p.slug}
              href={p.route}
              className="group flex items-start gap-3 rounded-lg border p-4 transition-colors hover:border-[#0E7C3A] hover:bg-[#0E7C3A]/5"
            >
              <span className="text-2xl leading-none">{p.emoji}</span>
              <div className="min-w-0">
                <p className="font-medium text-gray-900">{p.nameBn}</p>
                <p className="mt-0.5 truncate text-xs text-gray-500">{usageFor(p.slug)}</p>
                <span
                  className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    ok ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {ok ? 'অ্যাক্টিভ' : 'আপগ্রেড দরকার'}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
