'use client'

import Link from 'next/link'
import { PRODUCTS } from '@/lib/products'

// Pull roadmap directly from lib/products.ts (single source of truth).
const QUARTERS = ['Q3 2026', 'Q4 2026', 'Q1 2027'] as const

function itemsForQuarter(q: string) {
  const out: { product: string; text: string }[] = []
  for (const p of PRODUCTS) {
    for (const c of p.comingSoon) {
      if (c.includes(q)) out.push({ product: p.nameBn, text: c.replace(/\([^)]*\)/, '').trim() })
    }
  }
  return out
}

export default function RoadmapPage() {
  return (
    <div className="min-h-screen bg-[#FCFCF9] text-[#18181B]">
      
      <main className="mx-auto max-w-[1120px] px-5 py-16">
        <div className="mb-12 text-center">
          <span className="inline-block rounded-full bg-[#0E7C3A]/10 px-3 py-1 text-sm font-semibold text-[#0E7C3A]">
            রোডম্যাপ
          </span>
          <h1 className="mt-4 bangla text-4xl font-bold tracking-tight">
            আমরা কোন দিকে যাচ্ছি
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-zinc-600">
            Hostamar একটি প্ল্যাটফর্ম — AI ভিডিও, হোস্টিং, চ্যাট, ব্রাউজার, গেম আর IDE। নিচে আমাদের
            পরিকল্পনা, কোন কোয়ার্টারে কী আসবে।
          </p>
        </div>

        {/* This quarter highlight */}
        <section className="mb-14 rounded-2xl border border-[#0E7C3A]/30 bg-[#0E7C3A]/5 p-7">
          <h2 className="mb-4 bangla text-2xl font-bold text-[#0E7C3A]">
            এই কোয়ার্টারে (Q3 2026)
          </h2>
          <ul className="grid gap-2 md:grid-cols-2">
            {itemsForQuarter('Q3 2026').map((it, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-700">
                <span className="mt-0.5 text-[#0E7C3A]">→</span>
                <span>
                  <strong>{it.product}:</strong> {it.text}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Per-quarter timeline */}
        {QUARTERS.map((q) => {
          const items = itemsForQuarter(q)
          if (!items.length) return null
          return (
            <section key={q} className="mb-10">
              <h2 className="mb-4 bangla text-xl font-bold">{q}</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {items.map((it, i) => (
                  <div key={i} className="rounded-xl border border-zinc-200 bg-white p-4">
                    <p className="text-sm font-semibold text-[#18181B]">{it.product}</p>
                    <p className="mt-1 text-sm text-zinc-600">{it.text}</p>
                  </div>
                ))}
              </div>
            </section>
          )
        })}

        {/* Per-product deep dive */}
        <section className="mt-16">
          <h2 className="mb-6 bangla text-2xl font-bold">প্রোডাক্ট অনুযায়ী</h2>
          <div className="space-y-6">
            {PRODUCTS.map((p) => (
              <div key={p.slug} className="rounded-2xl border border-zinc-200 bg-white p-6">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{p.emoji}</span>
                  <h3 className="bangla text-lg font-bold">{p.nameBn}</h3>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                    {p.badge}
                  </span>
                </div>
                <ul className="mt-3 space-y-2">
                  {p.comingSoon.map((c) => (
                    <li key={c} className="flex items-start gap-2 text-sm text-zinc-700">
                      <span className="mt-0.5 text-[#0E7C3A]">✓</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-12 text-center">
          <Link
            href="/signup"
            className="inline-flex h-11 items-center justify-center rounded-full bg-[#0E7C3A] px-6 font-semibold text-white transition hover:bg-[#0A5A2B]"
          >
            আগেই শুরু করুন
          </Link>
        </div>
      </main>
      
    </div>
  )
}
