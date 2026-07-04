'use client'
import Link from 'next/link'
import { getProduct } from '@/lib/products'

export default function CloudHostingProductPage() {
  const p = getProduct('cloud-hosting')
  if (!p) return null
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <Link href="/products" className="text-sm text-gray-600 hover:text-black">&larr; Products</Link>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{p.nameBn}</h1>
            <p className="text-gray-700 mb-4">{p.taglineBn}</p>
            <Link href={p.ctaHref} className="inline-block px-5 py-2 bg-black text-white rounded-xl">{p.ctaLabel}</Link>
          </div>
          <div className="bg-gray-50 border rounded-xl p-4">
            <h3 className="font-semibold mb-2">Features</h3>
            <ul className="list-disc ml-5 space-y-1 text-gray-700">
              {p.features.slice(0, 5).map((f, i) => (<li key={i}>{f}</li>))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
