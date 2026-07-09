'use client'

import Link from 'next/link'
import { PRODUCTS } from '@/lib/products'

// Secondary "Labs" strip — the homepage hero is AI Video.
// The other tools stay discoverable here without diluting the hero story.
export default function ProductsSection() {
  // Everything except the hero product (ai-video) lives in Labs.
  const labs = PRODUCTS.filter((p) => p.slug !== 'ai-video').sort((a, b) => a.order - b.order)

  return (
    <section id="products" className="py-14 bg-transparent border-t border-slate-200/60 dark:border-slate-800/60">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-8">
          <span className="inline-block mb-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold tracking-wide">
            🧪 Hostamar Labs
          </span>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            শুধু ভিডিও না — আরও টুল একই অ্যাকাউন্টে
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            হোস্টিং, চ্যাট, ব্রাউজার, গেম, IDE — সব বাংলায়, এক্সপেরিমেন্টাল
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {labs.map((p) => (
            <Link
              key={p.slug}
              href={`/products/${p.slug}`}
              className="group inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 transition-all hover:border-emerald-400 hover:shadow-sm"
            >
              <span className="text-base">{p.emoji}</span>
              <span>{p.nameBn}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800">
                {p.status === 'live' ? 'Live' : p.status === 'beta' ? 'Beta' : 'Soon'}
              </span>
            </Link>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link
            href="/products"
            className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            সব টুল দেখুন
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
