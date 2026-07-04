'use client'

import Link from 'next/link'
import { PRODUCTS } from '@/lib/products'

export default function ProductsSection() {
  return (
    <section id="products" className="py-20 bg-transparent">
      <div className="max-w-6xl mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-block mb-4 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
            🛠️ ৬টি পণ্য, একটি প্ল্যাটফর্ম
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            আপনার হাতে <span className="text-blue-600">৬টা ব্যবসার টুল</span>, একটি অ্যাকাউন্টে
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            AI ভিডিও বানান, ওয়েবসাইট হোস্ট করুন, চ্যাটে সহায়তা নিন, ব্রাউজারে গবেষণা করুন, গেম খেলুন, কোড লিখুন — সব <b>বাংলা</b>।
          </p>
        </div>

        {/* Product Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {PRODUCTS.map((p) => (
            <Link
              key={p.slug}
              href={`/products/${p.slug}`}
              className="group block card card-hover overflow-hidden"
            >
              {/* Gradient hero */}
              <div className={`product-card-gradient bg-gradient-to-br ${p.gradient} p-6 text-white relative`}>
                <span className="absolute top-3 right-3 text-2xl">{p.emoji}</span>
                <span className="inline-block text-xs px-2 py-0.5 rounded-full border bg-white/20 backdrop-blur-sm border-white/30">
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
                  <span className="text-xs px-2 py-1 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                    🧪 {p.status === 'beta' ? 'Beta' : p.status === 'live' ? 'Live' : 'Coming Soon'}
                  </span>
                  <span className="text-sm font-semibold text-blue-600 group-hover:translate-x-1 transition-transform">
                    বিস্তারিত →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* All Products CTA */}
        <div className="text-center mt-12">
          <Link
            href="/products"
            className="inline-block px-6 py-3 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 text-blue-700 font-semibold rounded-xl transition-all border border-blue-200"
          >
            সব ৬টি পণ্য দেখুন →
          </Link>
        </div>
      </div>
    </section>
  )
}