'use client'

import { PRODUCTS } from '@/lib/products'

export default function CompetitiveEdgeSection() {
  return (
    <section className="py-20 bg-gradient-to-b from-yellow-50 to-white dark:from-yellow-900/20 dark:to-slate-900 border-y border-yellow-200 dark:border-yellow-800">
      <div className="max-w-6xl mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-14">
          <div className="inline-block mb-4 px-4 py-1.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-full text-sm font-semibold">
            🏆 প্রতিযোগিতামূলক সুবিধা — কেন হোস্টামার?
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            গ্লোবাল টুলগুলোর চেয়ে আলাদা — আমাদের প্রতিটি পণ্য বাংলাদেশের জন্য
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            একই দামে বেশি পাবেন: বাংলা ইন্টারফেস, bKash/Nagad/Rocket পেমেন্ট, ঢাকা CDN, এবং বাংলাদেশ-ফার্স্ট ফিচার
          </p>
        </div>

        {/* Competitive Edge Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PRODUCTS.map((p) => (
            <div
              key={p.slug}
              className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-6 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-xl transition-all duration-300 group"
            >
              {/* Product header with emoji and status */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br ${p.gradient}`}>
                  {p.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {p.nameBn}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{p.nameEn}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800 whitespace-nowrap">
                  {p.badge}
                </span>
              </div>

              {/* Competitor gap - the key differentiator */}
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                {p.competitorGap}
              </p>

              {/* Coming soon features */}
              <div className="border-t border-gray-100 dark:border-slate-700 pt-4">
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-2">
                  <span>🔜 আসছে:</span>
                </div>
                <ul className="space-y-1">
                  {p.comingSoon.slice(0, 3).map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span className="line-clamp-1">{feature}</span>
                    </li>
                  ))}
                  {p.comingSoon.length > 3 && (
                    <li className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      +{p.comingSoon.length - 3} আরও ফিচার...
                    </li>
                  )}
                </ul>
              </div>

              {/* CTA link to detail page */}
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
                <a
                  href={`/products/${p.slug}`}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 group"
                >
                  বিস্তারিত দেখুন
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA - Combined Value Prop */}
        <div className="mt-16 text-center">
          <div className="inline-block px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl text-white shadow-xl">
            <h3 className="text-2xl md:text-3xl font-bold mb-2">
              একটি সাবস্ক্রিপশনে সব ছয়টি
            </h3>
            <p className="text-lg opacity-95 mb-4">
              আলাদা টুল কেনা বন্ধ। হোস্টামার প্ল্যানে সবকিছু পাবেন — AI ভিডিও, ক্লাউড, চ্যাট, ব্রাউজার, গেম, IDE।
            </p>
            <div className="flex flex-wrap justify-center gap-2 mb-4 text-sm">
              <span className="bg-white/15 px-3 py-1 rounded-full">মাসে ১০টা ভিডিও</span>
              <span className="bg-white/15 px-3 py-1 rounded-full">১০০ চ্যাট মেসেজ/দিন</span>
              <span className="bg-white/15 px-3 py-1 rounded-full">৫GB হোস্টিং ফ্রি</span>
              <span className="bg-white/15 px-3 py-1 rounded-full">IDE আনলিমিটেড</span>
            </div>
            <p className="text-2xl font-bold mb-4">
              শুরু মাত্র ৳১,০০০/মাস <span className="text-yellow-300 text-base font-normal">(EARLY50 দিয়ে ৫০% ছাড়)</span>
            </p>
            <a
              href="/signup?ref=homepage-competitive-edge"
              className="inline-block px-8 py-3 bg-white text-blue-600 font-bold rounded-xl text-lg hover:bg-gray-100 transition-colors"
            >
              সব পণ্য একসাথে শুরু করুন →
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}