import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PRODUCTS, getProduct } from '@/lib/products'

// Generate static params at build time so each product has its own static route.
export async function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const p = getProduct(params.slug)
  if (!p) return { title: 'Product not found' }
  return {
    title: `${p.nameBn} — ${p.nameEn} | Hostamar`,
    description: p.taglineBn,
  }
}

export default function ProductDetailPage({ params }: { params: { slug: string } }) {
  const product = getProduct(params.slug)
  if (!product) notFound()

  const otherProducts = PRODUCTS.filter((p) => p.slug !== product.slug).slice(0, 3)

  const statusInfo = {
    live:   { label: '✅ এখনই ব্যবহার করুন',   cls: 'bg-[#0E7C3A]/10 text-[#0E7C3A] border-[#0E7C3A]/20',   hint: 'কোনো waitlist নেই — সরাসরি ফ্রি ট্রায়াল শুরু করুন।' },
    beta:   { label: '🧪 বেটা চলছে',              cls: 'bg-amber-100 text-amber-700 border-amber-300',   hint: 'সীমিত ব্যবহারকারীকে অ্যাক্সেস দেওয়া হচ্ছে — ফ্রি ব্যবহার করুন এবং ফিডব্যাক দিন।' },
    planned:{ label: '🔜 শীঘ্রই আসছে',            cls: 'bg-zinc-100 text-zinc-600 border-zinc-300',   hint: 'এই পণ্যটি এখনো ডেভেলপমেন্টে — নিচের লিংকে ইমেইল যোগ করলে লঞ্চের দিন সবার আগে জানবেন।' },
  }[product.status]

  return (
    <main className="min-h-screen bg-[#FCFCF9] text-zinc-900 antialiased">
      {/* ============ NAV ============ */}

      {/* ============ HERO ============ */}
      <section className={`bg-gradient-to-br ${product.gradient} text-white py-20`}>
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-start gap-4 mb-6">
            <span className="text-6xl">{product.emoji}</span>
            <div className="flex-1">
              <span className={`inline-block text-xs px-3 py-1 rounded-full border bg-white/20 backdrop-blur-sm border-white/40 mb-3`}>
                {product.badge}
              </span>
              <h1 className="bangla text-4xl md:text-6xl font-bold mb-2">{product.nameBn}</h1>
              <p className="text-xl opacity-90">{product.nameEn}</p>
            </div>
          </div>

          <p className="bangla text-2xl md:text-3xl font-semibold italic mb-4 max-w-3xl leading-relaxed">
            {product.taglineBn}
          </p>

          <p className="bangla text-lg opacity-95 mb-8 max-w-2xl">
            {product.description}
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 mb-4">
            <Link
              href={product.ctaHref}
              className={`bangla inline-block px-8 py-4 font-bold rounded-full text-lg transition-all transform hover:scale-105 shadow-xl ${
                product.status === 'live'
                  ? 'bg-white text-[#0E7C3A] hover:bg-zinc-100'
                  : product.status === 'beta'
                  ? 'bg-amber-300 text-zinc-900 hover:bg-amber-200'
                  : 'bg-zinc-900 text-white hover:bg-zinc-800'
              }`}
            >
              {product.ctaLabel} →
            </Link>
            {product.ctaSecondary && (
              <Link
                href={product.ctaSecondary.href}
                className="bangla inline-block px-8 py-4 border-2 border-white text-white font-bold rounded-full text-lg hover:bg-white/10"
              >
                {product.ctaSecondary.label}
              </Link>
            )}
          </div>

          {/* Status explainer */}
          <div className={`bangla inline-block text-sm px-3 py-2 rounded-lg border ${statusInfo.cls}`}>
            {statusInfo.hint}
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section className="bg-[#FCFCF9] py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="bangla text-3xl font-bold text-zinc-900 mb-8">যা পাবেন</h2>
          <ul className="space-y-4">
            {product.features.map((feature, i) => (
              <li
                key={i}
                className="bangla flex items-start gap-4 bg-white border border-zinc-200 rounded-[20px] p-4 shadow-sm"
              >
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0E7C3A] text-white text-sm font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-zinc-800 text-lg leading-relaxed">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ============ COMBO PITCH ============ */}
      <section className="bg-[#FCFCF9] py-12 border-t border-zinc-200">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-[#0E7C3A]/[0.06] border-l-4 border-[#0E7C3A] rounded-r-2xl p-6 mb-8">
            <div className="bangla text-xs font-semibold text-[#0E7C3A] uppercase tracking-wider mb-1">আমাদের প্রতিযোগিতামূলক সুবিধা</div>
            <p className="bangla text-lg text-zinc-900 leading-relaxed">{product.competitorGap}</p>
          </div>
        </div>
      </section>

      {/* ============ COMING SOON (ROADMAP) ============ */}
      <section className="bg-[#FCFCF9] py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">🗓️</span>
            <div>
              <h2 className="bangla text-3xl font-bold text-zinc-900">রোডম্যাপ — কী আসছে</h2>
              <p className="bangla text-sm text-zinc-500 mt-1">
                বাস্তব ডেভেলপমেন্ট সময়সীমা, প্রতিশ্রুতি নয়
              </p>
            </div>
          </div>
          <ul className="space-y-3">
            {product.comingSoon.map((feature, i) => {
              const parts = feature.split(' — ');
              const name = parts[0];
              const quarter = parts[1] ?? '';
              return (
                <li
                  key={i}
                  className="bangla flex items-start gap-3 bg-white border border-zinc-200 rounded-[20px] p-4 hover:border-[#0E7C3A]/40 transition-colors shadow-sm"
                >
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#0E7C3A]/10 text-[#0E7C3A] flex items-center justify-center text-sm font-bold mt-0.5">
                    ✓
                  </span>
                  <div className="flex-1">
                    <div className="text-zinc-900 font-medium">{name}</div>
                    {quarter && (
                      <div className="text-xs text-[#0E7C3A] font-semibold mt-1">{quarter}</div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="bangla text-xs text-zinc-500 mt-4">
            পূর্ণ রোডম্যাপ দেখুন:{' '}
            <Link href="/roadmap" className="text-[#0E7C3A] hover:underline">/roadmap</Link>
          </p>
        </div>
      </section>

      {/* ============ COMBO PITCH ============ */}
      <section className="bg-[#0E7C3A] text-white py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="bangla text-2xl md:text-3xl font-bold mb-3">
            এই পণ্যটি ছয়টির একটি — আলাদায় কেনা বন্ধ
          </h2>
          <p className="bangla opacity-95 mb-6">
            সব ছয়টি পণ্য একটি সাবস্ক্রিপশনে — মাসে ৳১,০০০ থেকে শুরু
          </p>
          <Link
            href="/products"
            className="bangla inline-block px-6 py-3 bg-white text-[#0E7C3A] font-bold rounded-full hover:bg-zinc-100"
          >
            সব পণ্য দেখুন →
          </Link>
        </div>
      </section>

      {/* ============ OTHER PRODUCTS ============ */}
      <section className="bg-[#FCFCF9] py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="bangla text-2xl font-bold text-zinc-900 mb-6">আরও পণ্য</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {otherProducts.map((p) => (
              <Link
                key={p.slug}
                href={`/products/${p.slug}`}
                className="block bg-white rounded-[20px] border border-zinc-200 hover:shadow-lg hover:border-[#0E7C3A]/40 overflow-hidden transition"
              >
                <div className={`bg-gradient-to-br ${p.gradient} p-4 text-white`}>
                  <span className="text-2xl">{p.emoji}</span>
                </div>
                <div className="p-4">
                  <h3 className="bangla font-bold text-zinc-900">{p.nameBn}</h3>
                  <p className="text-xs text-zinc-500 mb-2">{p.nameEn}</p>
                  <p className="bangla text-sm text-zinc-700 line-clamp-2">{p.taglineBn}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
