'use client'
import Link from 'next/link'
import { getProduct } from '@/lib/products'

export default function GamingProductPage() {
  const p = getProduct('game')
  if (!p) return null
  return (
    <div className="min-h-screen bg-[#FCFCF9] text-zinc-900 antialiased">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <Link href="/products" className="bangla text-sm text-zinc-500 hover:text-[#0E7C3A]">&larr; প্রোডাক্ট</Link>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h1 className="bangla text-3xl font-bold mb-2 text-zinc-900">{p.nameBn}</h1>
            <p className="bangla text-zinc-600 mb-4">{p.taglineBn}</p>
            <Link href={p.ctaHref} className="bangla inline-block px-5 py-2.5 bg-[#0E7C3A] text-white rounded-full font-semibold hover:bg-[#0c6a32] transition">{p.ctaLabel}</Link>
          </div>
          <div className="bg-white border border-zinc-200 rounded-[20px] p-5 shadow-sm">
            <h3 className="bangla font-semibold mb-2 text-zinc-900">ফিচার</h3>
            <ul className="bangla list-disc ml-5 space-y-1 text-zinc-700">
              {p.features.slice(0, 5).map((f, i) => (<li key={i}>{f}</li>))
            }
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
