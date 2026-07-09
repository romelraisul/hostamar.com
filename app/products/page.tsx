import { Metadata } from 'next'
import Link from 'next/link'
import { PRODUCTS } from '@/lib/products'

export const metadata: Metadata = {
  title: 'Products - Hostamar',
  description:
    'ছয়টি পণ্য, একটি প্ল্যাটফর্ম — AI ভিডিও, ক্লাউড হোস্টিং, AI চ্যাট, AI ব্রাউজার, গেম, Dev IDE।',
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  live:   { label: '✅ Live — ব্যবহার করুন',  cls: 'bg-green-100 text-green-700 border-green-200' },
  beta:   { label: '🧪 Beta — চলছে',        cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  planned:{ label: '🔜 শীঘ্রই আসছে',        cls: 'bg-slate-100 text-slate-700 border-slate-200' },
}

export default function ProductsPage() {
  const live = PRODUCTS.filter(p => p.status === 'live')
  const beta = PRODUCTS.filter(p => p.status === 'beta')
  const planned = PRODUCTS.filter(p => p.status === 'planned')

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-blue-50 to-white">
      {/* ============ HERO ============ */}
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-4 py-6 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-blue-600">← হোস্টামার</Link>
          <Link href="/signup?ref=products" className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
            ফ্রি ট্রায়াল
          </Link>
        </div>

        <section className="max-w-5xl mx-auto px-4 py-16 text-center">
          <div className="inline-block mb-4 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
            🛠️ ছয়টি পণ্য, একটি প্ল্যাটফর্ম
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-5 leading-tight">
            আপনার হাতে <span className="text-blue-600">৬টা ব্যবসার টুল</span>,<br />
            একটি অ্যাকাউন্টে।
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            AI ভিডিও বানান, ওয়েবসাইট হোস্ট করুন, চ্যাটে সহায়তা নিন, ব্রাউজারে গবেষণা করুন, গেম খেলুন, কোড লিখুন — সব <b>বাংলা</b>।
          </p>

          {/* Quick status row */}
          <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm">
            <span className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full">✅ {live.length} Live</span>
            <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">🧪 {beta.length} Beta</span>
            <span className="px-3 py-1 bg-slate-50 text-slate-700 border border-slate-200 rounded-full">🔜 {planned.length} Coming Soon</span>
          </div>
        </section>
      </header>

      {/* ============ PRODUCT GRID ============ */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">সব পণ্য</h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {PRODUCTS.map((p) => {
            const badge = STATUS_BADGE[p.status]
            return (
              <Link
                key={p.slug}
                href={`/products/${p.slug}`}
                className="group block bg-white rounded-2xl border border-gray-200 hover:border-blue-400 hover:shadow-xl transition-all overflow-hidden"
              >
                {/* Gradient hero */}
                <div className={`bg-gradient-to-br ${p.gradient} p-6 text-white relative`}>
                  <span className="absolute top-3 right-3 text-2xl">{p.emoji}</span>
                  <span className={`inline-block text-xs px-2 py-0.5 rounded-full border bg-white/20 backdrop-blur-sm border-white/30`}>
                    {p.badge}
                  </span>
                  <h3 className="mt-3 text-2xl font-bold">{p.nameBn}</h3>
                  <p className="text-sm opacity-90">{p.nameEn}</p>
                </div>

                {/* Body */}
                <div className="p-6">
                  <p className="text-gray-700 font-medium mb-3">{p.taglineBn}</p>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-3">{p.description}</p>

                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-1 rounded-full border ${badge.cls}`}>
                      {badge.label}
                    </span>
                    <span className="text-sm font-semibold text-blue-600 group-hover:translate-x-1 transition-transform">
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
      <section className="bg-gradient-to-b from-yellow-50 to-white py-16 border-t border-b">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10">
            <div className="inline-block mb-3 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
              🏆 প্রতিযোগিতামূলক সুবিধা
            </div>
            <h2 className="text-3xl font-bold text-gray-900">কেন হোস্টামার — গ্লোবাল টুলগুলোর চেয়ে আলাদা</h2>
            <p className="text-gray-600 mt-2">আমাদের প্রতিটি পণ্য বাংলাদেশের জন্য নির্মিত</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PRODUCTS.map((p) => (
              <div
                key={p.slug}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{p.emoji}</span>
                  <span className="font-bold text-gray-900">{p.nameBn}</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{p.competitorGap}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ COMBINED VALUE PROP ============ */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            একটি সাবস্ক্রিপশনে সব ছয়টি
          </h2>
          <p className="text-lg opacity-95 mb-6">
            আলাদা টুল কেনা বন্ধ। হোস্টামার প্ল্যানে সবকিছু পাবেন — AI ভিডিও, ক্লাউড, চ্যাট, ব্রাউজার, গেম, IDE।
          </p>
          <div className="flex flex-wrap justify-center gap-3 mb-2 text-sm">
            <span className="bg-white/15 px-3 py-1 rounded-full">মাসে ১০টা ভিডিও</span>
            <span className="bg-white/15 px-3 py-1 rounded-full">১০০ চ্যাট মেসেজ/দিন</span>
            <span className="bg-white/15 px-3 py-1 rounded-full">৫GB হোস্টিং ফ্রি</span>
            <span className="bg-white/15 px-3 py-1 rounded-full">IDE আনলিমিটেড</span>
          </div>
          <p className="text-2xl font-bold mt-6">
            শুরু মাত্র ৳২,০০০/মাস
          </p>
          <Link
            href="/signup?ref=products-bottom"
            className="inline-block mt-6 px-8 py-4 bg-white text-blue-600 font-bold rounded-xl text-lg hover:bg-gray-100"
          >
            সব পণ্য একসাথে শুরু করুন →
          </Link>
        </div>
      </section>

      {/* ============ FOOTER NOTE ============ */}
      <footer className="container mx-auto px-4 py-8 text-sm text-gray-500 text-center border-t">
        © 2026 hostamar.com — বাংলাদেশে তৈরি 🇧🇩
      </footer>
    </main>
  )
}
