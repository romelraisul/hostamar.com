import { Metadata } from 'next'
import Link from 'next/link'
import { PRODUCTS } from '@/lib/products'

export const metadata: Metadata = {
  title: 'Products - Hostamar',
  description:
    'ছয়টি পণ্য, একটি প্ল্যাটফর্ম — AI ভিডিও, ক্লাউড হোস্টিং, AI চ্যাট, AI ব্রাউজার, গেম, Dev IDE।',
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  live:   { label: '✅ Live — ব্যবহার করুন',  cls: 'bg-[#0E7C3A]/10 text-[#0E7C3A] border-[#0E7C3A]/20' },
  beta:   { label: '🧪 Beta — চলছে',        cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  planned:{ label: '🔜 শীঘ্রই আসছে',        cls: 'bg-zinc-100 text-zinc-600 border-zinc-200' },
}

export default function ProductsPage() {
  const live = PRODUCTS.filter(p => p.status === 'live')
  const beta = PRODUCTS.filter(p => p.status === 'beta')
  const planned = PRODUCTS.filter(p => p.status === 'planned')

  return (
    <main className="min-h-screen bg-[#FCFCF9] text-zinc-900 antialiased">
      {/* ============ HERO ============ */}

      {/* ============ PRODUCT GRID ============ */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="bangla text-2xl font-bold text-zinc-900 mb-6">সব পণ্য</h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {PRODUCTS.map((p) => {
            const badge = STATUS_BADGE[p.status]
            return (
              <Link
                key={p.slug}
                href={`/products/${p.slug}`}
                className="group block bg-white rounded-[24px] border border-zinc-200 hover:border-[#0E7C3A]/40 hover:shadow-[0_12px_32px_-16px_rgba(14,124,58,0.25)] transition-all overflow-hidden shadow-sm"
              >
                {/* Gradient hero */}
                <div className={`bg-gradient-to-br ${p.gradient} p-6 text-white relative`}>
                  <span className="absolute top-3 right-3 text-2xl">{p.emoji}</span>
                  <span className={`inline-block text-xs px-2 py-0.5 rounded-full border bg-white/20 backdrop-blur-sm border-white/30`}>
                    {p.badge}
                  </span>
                  <h3 className="bangla mt-3 text-2xl font-bold">{p.nameBn}</h3>
                  <p className="text-sm opacity-90">{p.nameEn}</p>
                </div>

                {/* Body */}
                <div className="p-6">
                  <p className="bangla text-zinc-700 font-medium mb-3">{p.taglineBn}</p>
                  <p className="bangla text-sm text-zinc-500 mb-4 line-clamp-3">{p.description}</p>

                  <div className="flex items-center justify-between">
                    <span className={`bangla text-xs px-2 py-1 rounded-full border ${badge.cls}`}>
                      {badge.label}
                    </span>
                    <span className="bangla text-sm font-semibold text-[#0E7C3A] group-hover:translate-x-1 transition-transform">
                      বিস্তারিত →
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* ============ WHY US (per-product competitive edge) ============ */}
      <section className="bg-[#FCFCF9] py-16 border-t border-zinc-200">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10">
            <div className="inline-block mb-3 px-3 py-1 bg-[#0E7C3A]/10 text-[#0E7C3A] rounded-full text-sm font-semibold">
              🏆 প্রতিযোগিতামূলক সুবিধা
            </div>
            <h2 className="bangla text-3xl font-bold text-zinc-900">কেন হোস্টামার — গ্লোবাল টুলগুলোর চেয়ে আলাদা</h2>
            <p className="bangla text-zinc-600 mt-2">আমাদের প্রতিটি পণ্য বাংলাদেশের জন্য নির্মিত</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PRODUCTS.map((p) => (
              <div
                key={p.slug}
                className="bg-white border border-zinc-200 rounded-[20px] p-4 hover:border-[#0E7C3A]/40 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{p.emoji}</span>
                  <span className="bangla font-bold text-zinc-900">{p.nameBn}</span>
                </div>
                <p className="bangla text-sm text-zinc-600 leading-relaxed">{p.competitorGap}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ COMBINED VALUE PROP ============ */}
      <section className="bg-[#0E7C3A] text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="bangla text-3xl md:text-4xl font-bold mb-4">
            একটি সাবস্ক্রিপশনে সব ছয়টি
          </h2>
          <p className="bangla text-lg opacity-95 mb-6">
            আলাদা টুল কেনা বন্ধ। হোস্টামার প্ল্যানে সবকিছু পাবেন — AI ভিডিও, ক্লাউড, চ্যাট, ব্রাউজার, গেম, IDE।
          </p>
          <div className="flex flex-wrap justify-center gap-3 mb-2 text-sm">
            <span className="bangla bg-white/15 px-3 py-1 rounded-full">মাসে ১০টা ভিডিও</span>
            <span className="bangla bg-white/15 px-3 py-1 rounded-full">১০০ চ্যাট মেসেজ/দিন</span>
            <span className="bangla bg-white/15 px-3 py-1 rounded-full">৫GB হোস্টিং ফ্রি</span>
            <span className="bangla bg-white/15 px-3 py-1 rounded-full">IDE আনলিমিটেড</span>
          </div>
          <p className="bangla text-2xl font-bold mt-6">
            শুরু মাত্র ৳২,০০০/মাস
          </p>
          <Link
            href="/signup?ref=products-bottom"
            className="bangla inline-block mt-6 px-8 py-4 bg-white text-[#0E7C3A] font-bold rounded-full text-lg hover:bg-zinc-100"
          >
            সব পণ্য একসাথে শুরু করুন →
          </Link>
        </div>
      </section>

      {/* ============ FOOTER NOTE ============ */}

    </main>
  )
}
