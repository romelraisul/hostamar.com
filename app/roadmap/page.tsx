import { Metadata } from 'next'
import Link from 'next/link'
import { PRODUCTS } from '@/lib/products'

export const metadata: Metadata = {
  title: 'রোডম্যাপ — hostamar',
  description: 'হোস্টামার প্ল্যাটফর্মের ভবিষ্যৎ পরিকল্পনা — কোন পণ্যে কোন ফিচার কবে আসছে।',
}

interface RoadmapItem {
  quarter: string
  shipped: string[]
  inProgress: string[]
  planned: string[]
}

const ROADMAP: RoadmapItem[] = [
  {
    quarter: 'Q3 2026 (জুলাই–সেপ্টেম্বর)',
    shipped: [
      '✅ বাংলা-প্রম্পট → AI ভিডিও (AnimateDiff + Replicate fallback)',
      '✅ EARLY50/ROMEL50/LAUNCH25 প্রমো কোড (৫০% ছাড়)',
      '✅ Stripe + bKash পেমেন্ট গেটওয়ে (planned)',
      '✅ ১০০+ রেডিমেড বাংলা প্রম্পট টেমপ্লেট (planned)',
      '✅ বাংলা ভয়েস ইনপুট/আউটপুট (planned)',
    ],
    inProgress: [
      '🟡 বাংলা প্রম্পট → ইংরেজি অটো-ট্রান্সলেশন (AI ভিডিও)',
      '🟡 বাংলা cPanel ফাইল ম্যানেজার',
      '🟡 Monaco Editor (আসল VS Code)',
      '🟡 Pyodide (Python in browser)',
    ],
    planned: [
      'AI কোড কমপ্লিশন (CodeLlama, DeepSeek Coder)',
      'ওয়ার্ডপ্রেস ওয়ান-ক্লিক ইনস্টল',
      'ডেইলি অটো-ব্যাকআপ (Cloudflare R2)',
      'bKash টুর্নামেন্ট এন্ট্রি ফি',
    ],
  },
  {
    quarter: 'Q4 2026 (অক্টোবর–ডিসেম্বর)',
    shipped: [],
    inProgress: [
      '🟡 ফুল-পেজ বাংলা ট্রান্সলেশন (NLLB-200)',
      '🟡 URL → বাংলা সারাংশ (AI ব্রাউজার)',
      '🟡 GitHub ইন্টিগ্রেশন (clone/push/PR)',
      '🟡 এক-ক্লিক hostamar.cloud ডিপ্লয়',
    ],
    planned: [
      'PDF + DOCX আপলোড → বাংলা Q&A',
      'YouTube ট্রান্সক্রিপ্ট → বাংলা সারাংশ',
      '১০টি HTML5 গেম (open-source Phaser/Three.js)',
      'টুর্নামেন্ট সিস্টেম (bracket, prizes, bKash payout)',
      'লিডারবোর্ড (দৈনিক/সাপ্তাহিক/সর্বকালের)',
      'ফেসবুক/ইনস্টা/টিকটক অটো-পোস্ট',
    ],
  },
  {
    quarter: 'Q1 2027 (জানুয়ারি–মার্চ)',
    shipped: [],
    inProgress: [],
    planned: [
      'Chrome Extension (ডান-ক্লিক → বাংলায় সারাংশ)',
      'বাংলা কমেন্ট → AI ইংরেজি কোড জেনারেট',
      'গেম ডেভেলপার পোর্টাল (Roblox মডেল)',
      'AI Agent marketplace (let devs build on our platform)',
      'রেফারেল প্রোগ্রাম (10% lifetime for both)',
      'মোবাইল অ্যাপ (React Native, shared codebase)',
    ],
  },
]

export default function RoadmapPage() {
  const totalShipped = ROADMAP.reduce((sum, q) => sum + q.shipped.length, 0)
  const totalInProgress = ROADMAP.reduce((sum, q) => sum + q.inProgress.length, 0)
  const totalPlanned = ROADMAP.reduce((sum, q) => sum + q.planned.length, 0)

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-blue-50 to-white">
      {/* ============ HERO ============ */}
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-4 py-6 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-blue-600">← হোস্টামার</Link>
          <Link href="/try-now" className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
            ফ্রি ট্রায়াল
          </Link>
        </div>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="inline-block mb-4 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
            🗓️ পাবলিক রোডম্যাপ
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            আমরা কোথায় যাচ্ছি
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            হোস্টামার প্ল্যাটফর্মের ভবিষ্যৎ পরিকল্পনা — প্রতিটি পণ্যে কোন ফিচার কবে আসছে। বাস্তব সময়সীমা, প্রতিশ্রুতি নয়।
          </p>

          {/* Stats row */}
          <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
            <div className="bg-green-50 border border-green-200 rounded-full px-4 py-2">
              <span className="font-bold text-green-700">{totalShipped}</span> <span className="text-green-700">shipped</span>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-full px-4 py-2">
              <span className="font-bold text-yellow-700">{totalInProgress}</span> <span className="text-yellow-700">in progress</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-full px-4 py-2">
              <span className="font-bold text-slate-700">{totalPlanned}</span> <span className="text-slate-700">planned</span>
            </div>
          </div>
        </div>
      </header>

      {/* ============ QUARTERLY ROADMAP ============ */}
      <section className="max-w-4xl mx-auto px-4 py-12 space-y-12">
        {ROADMAP.map((q) => (
          <div key={q.quarter} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4">
              <h2 className="text-2xl font-bold">{q.quarter}</h2>
            </div>

            <div className="p-6 space-y-6">
              {q.shipped.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-green-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span>✅</span> Shipped
                  </h3>
                  <ul className="space-y-2">
                    {q.shipped.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-gray-700">
                        <span className="text-green-500 mt-1">●</span>
                        <span className="line-through opacity-60">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {q.inProgress.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-yellow-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span>🟡</span> In Progress
                  </h3>
                  <ul className="space-y-2">
                    {q.inProgress.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-gray-900 font-medium">
                        <span className="text-yellow-500 mt-1">●</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {q.planned.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span>📋</span> Planned
                  </h3>
                  <ul className="space-y-2">
                    {q.planned.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-gray-600">
                        <span className="text-slate-400 mt-1">○</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* ============ PER-PRODUCT DRILL-DOWN ============ */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">প্রতি পণ্যের রোডম্যাপ</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {PRODUCTS.map((p) => (
            <Link
              key={p.slug}
              href={`/products/${p.slug}`}
              className="group block bg-white rounded-2xl border border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all overflow-hidden"
            >
              <div className={`bg-gradient-to-br ${p.gradient} p-5 text-white`}>
                <span className="text-3xl">{p.emoji}</span>
                <h3 className="text-lg font-bold mt-2">{p.nameBn}</h3>
                <p className="text-sm opacity-90">{p.nameEn}</p>
              </div>
              <div className="p-5">
                <p className="text-sm text-gray-700 mb-3">{p.competitorGap}</p>
                <div className="text-xs text-blue-600 font-semibold mb-3">
                  {p.comingSoon.length} features coming
                </div>
                <div className="text-sm font-semibold text-blue-600 group-hover:translate-x-1 transition-transform">
                  বিস্তারিত দেখুন →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">প্রতিটি আপডেটে নোটিফিকেশন পান</h2>
          <p className="text-lg opacity-95 mb-6">
            EARLY50 কোড দিয়ে সাইন আপ করলে নতুন ফিচার লঞ্চের দিন সবার আগে জানবেন + ৫০% ছাড়ে ৳১,০০০/মাস
          </p>
          <Link
            href="/signup?ref=roadmap"
            className="inline-block px-8 py-4 bg-white text-blue-600 font-bold rounded-xl text-lg hover:bg-gray-100"
          >
            ৭ দিন ফ্রি শুরু করুন →
          </Link>
        </div>
      </section>
    </main>
  )
}
