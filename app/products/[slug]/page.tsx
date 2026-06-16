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
    live:   { label: '✅ এখনই ব্যবহার করুন',   cls: 'bg-green-100 text-green-700 border-green-300',   hint: 'কোনো waitlist নেই — সরাসরি ফ্রি ট্রায়াল শুরু করুন।' },
    beta:   { label: '🧪 বেটা চলছে',              cls: 'bg-amber-100 text-amber-700 border-amber-300',   hint: 'সীমিত ব্যবহারকারীকে অ্যাক্সেস দেওয়া হচ্ছে — ফ্রি ব্যবহার করুন এবং ফিডব্যাক দিন।' },
    planned:{ label: '🔜 শীঘ্রই আসছে',            cls: 'bg-slate-100 text-slate-700 border-slate-300',   hint: 'এই পণ্যটি এখনো ডেভেলপমেন্টে — নিচের লিংকে ইমেইল যোগ করলে লঞ্চের দিন সবার আগে জানবেন।' },
  }[product.status]

  return (
    <main className={`min-h-screen bg-gradient-to-b ${product.gradient}`}>
      {/* ============ NAV ============ */}
      <header className="backdrop-blur-sm bg-white/10 border-b border-white/20">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center text-white">
          <Link href="/products" className="font-semibold hover:underline">
            ← সব পণ্য
          </Link>
          <Link href="/signup?ref=product-detail" className="px-4 py-2 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100">
            ফ্রি ট্রায়াল
          </Link>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section className="text-white py-20">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-start gap-4 mb-6">
            <span className="text-6xl">{product.emoji}</span>
            <div className="flex-1">
              <span className={`inline-block text-xs px-3 py-1 rounded-full border bg-white/20 backdrop-blur-sm border-white/40 mb-3`}>
                {product.badge}
              </span>
              <h1 className="text-4xl md:text-6xl font-bold mb-2">{product.nameBn}</h1>
              <p className="text-xl opacity-90">{product.nameEn}</p>
            </div>
          </div>

          <p className="text-2xl md:text-3xl font-semibold italic mb-4 max-w-3xl leading-relaxed">
            {product.taglineBn}
          </p>

          <p className="text-lg opacity-95 mb-8 max-w-2xl">
            {product.description}
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 mb-4">
            <Link
              href={product.ctaHref}
              className={`inline-block px-8 py-4 font-bold rounded-xl text-lg transition-all transform hover:scale-105 shadow-xl ${
                product.status === 'live'
                  ? 'bg-white text-gray-900 hover:bg-gray-100'
                  : product.status === 'beta'
                  ? 'bg-yellow-300 text-gray-900 hover:bg-yellow-200'
                  : 'bg-gray-900 text-white hover:bg-gray-800'
              }`}
            >
              {product.ctaLabel} →
            </Link>
            {product.ctaSecondary && (
              <Link
                href={product.ctaSecondary.href}
                className="inline-block px-8 py-4 border-2 border-white text-white font-bold rounded-xl text-lg hover:bg-white/10"
              >
                {product.ctaSecondary.label}
              </Link>
            )}
          </div>

          {/* Status explainer */}
          <div className={`inline-block text-sm px-3 py-2 rounded-lg border ${statusInfo.cls}`}>
            {statusInfo.hint}
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">যা পাবেন</h2>
          <ul className="space-y-4">
            {product.features.map((feature, i) => (
              <li
                key={i}
                className="flex items-start gap-4 bg-gray-50 border border-gray-100 rounded-xl p-4"
              >
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white text-sm font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-gray-800 text-lg leading-relaxed">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ============ COMBO PITCH ============ */}
      <section className="bg-white py-12 border-t">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-orange-500 rounded-r-2xl p-6 mb-8">
            <div className="text-xs font-semibold text-orange-700 uppercase tracking-wider mb-1">আমাদের প্রতিযোগিতামূলক সুবিধা</div>
            <p className="text-lg text-gray-900 leading-relaxed">{product.competitorGap}</p>
          </div>
        </div>
      </section>

      {/* ============ COMING SOON (ROADMAP) ============ */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">🗓️</span>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">রোডম্যাপ — কী আসছে</h2>
              <p className="text-sm text-gray-600 mt-1">
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
                  className="flex items-start gap-3 bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors"
                >
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold mt-0.5">
                    ✓
                  </span>
                  <div className="flex-1">
                    <div className="text-gray-900 font-medium">{name}</div>
                    {quarter && (
                      <div className="text-xs text-blue-600 font-semibold mt-1">{quarter}</div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-gray-500 mt-4">
            পূর্ণ রোডম্যাপ দেখুন:{' '}
            <Link href="/roadmap" className="text-blue-600 hover:underline">/roadmap</Link>
          </p>
        </div>
      </section>

      {/* ============ COMBO PITCH ============ */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            এই পণ্যটি ছয়টির একটি — আলাদায় কেনা বন্ধ
          </h2>
          <p className="opacity-95 mb-6">
            সব ছয়টি পণ্য একটি সাবস্ক্রিপশনে — মাসে ৳১,০০০ থেকে শুরু
          </p>
          <Link
            href="/products"
            className="inline-block px-6 py-3 bg-white text-blue-600 font-bold rounded-xl hover:bg-gray-100"
          >
            সব পণ্য দেখুন →
          </Link>
        </div>
      </section>

      {/* ============ OTHER PRODUCTS ============ */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">আরও পণ্য</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {otherProducts.map((p) => (
              <Link
                key={p.slug}
                href={`/products/${p.slug}`}
                className="block bg-white rounded-xl border border-gray-200 hover:shadow-lg overflow-hidden"
              >
                <div className={`bg-gradient-to-br ${p.gradient} p-4 text-white`}>
                  <span className="text-2xl">{p.emoji}</span>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900">{p.nameBn}</h3>
                  <p className="text-xs text-gray-500 mb-2">{p.nameEn}</p>
                  <p className="text-sm text-gray-700 line-clamp-2">{p.taglineBn}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
