'use client'

/**
 * StoreCatalog — client-side grid fed by the PUBLIC catalog API
 * (/api/services/catalog, Cache-Control max-age=60). The API is the live
 * source of truth (106 services today); no embedded copy goes stale.
 * V36.24: full Bangla layer (banglaCatalog.ts fills 56 English-only services),
 * Bangla search, category chips, expandable "more explain" per card.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { bnService, CATEGORY_BN } from './banglaCatalog'

const GREEN = '#0E7C3A'

interface CatalogService {
  id: string
  name: string
  nameBn: string
  category: string
  creditCost: number
  dollarRange?: string | null
  benefit: string
  benefitBn?: string
  perfectFor?: string
  perfectForBn?: string
  icon: string
}

function decodeIcon(raw: string | undefined | null): string {
  if (!raw) return '✨'
  try {
    return raw.replace(/\\u([0-9a-fA-F]{4})/g, (_m, h) => String.fromCharCode(parseInt(h, 16)))
  } catch {
    return '✨'
  }
}

export default function StoreCatalog() {
  const [services, setServices] = useState<CatalogService[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cat, setCat] = useState('all')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/services/catalog')
      .then((r) => r.json())
      .then((d) => {
        setServices(d.services || [])
        setTotal(d.total || (d.services || []).length)
      })
      .catch(() => setError('ক্যাটালগ লোড হয়নি — একটু পরে আবার চেষ্টা করুন'))
      .finally(() => setLoading(false))
  }, [])

  const categories = ['all', ...Array.from(new Set(services.map((s) => s.category)))]

  // Bangla-aware search: matches Bangla override text OR English name/benefit.
  const shown = services.filter((s) => {
    if (cat !== 'all' && s.category !== cat) return false
    if (!q.trim()) return true
    const needle = q.trim().toLowerCase()
    const bn = bnService(s)
    return (
      s.name.toLowerCase().includes(needle) ||
      bn.name.toLowerCase().includes(needle) ||
      (s.benefit || '').toLowerCase().includes(needle) ||
      bn.benefit.toLowerCase().includes(needle) ||
      (bn.explain || '').toLowerCase().includes(needle) ||
      s.category.toLowerCase().includes(needle)
    )
  })

  if (loading) return <div className="text-sm text-zinc-500 py-10 text-center">ক্যাটালগ লোড হচ্ছে…</div>
  if (error) return <div className="text-sm text-red-600 py-10 text-center">{error}</div>

  return (
    <>
      <div className="text-sm text-zinc-600 mb-4">
        লাইভ ক্যাটালগ: <b>{total}</b> সার্ভিস — সরাসরি প্রোডাকশন ডাটাবেস থেকে (প্রতি মিনিটে রিফ্রেশ)।
        প্রতিটি কার্ড সম্পূর্ণ বাংলায়, "আরো জানো" চাপলে বিস্তারিত।
      </div>

      {/* Bangla search */}
      <div className="mb-3">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔍 খুঁজুন — যেমন: লোগো, ভিডিও, অনুবাদ, SEO…"
          className="w-full rounded-full border bg-white px-4 py-2.5 text-sm outline-none focus:border-[#0E7C3A]"
          aria-label="সার্ভিস খুঁজুন"
        />
      </div>

      {/* Category chips — Bangla labels */}
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${cat === c ? 'bg-[#0E7C3A] text-white border-[#0E7C3A]' : 'bg-white text-zinc-700 hover:bg-zinc-50'}`}
          >
            {CATEGORY_BN[c] || c}
          </button>
        ))}
      </div>

      {shown.length === 0 && (
        <div className="text-sm text-zinc-500 py-10 text-center">
          "{q}" — কিছু পাওয়া যায়নি। বানান বদলে দেখুন বা অন্য ক্যাটাগরি বাছুন।
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {shown.map((s) => {
          const bn = bnService(s)
          const isOpen = open === s.id
          return (
            <div key={s.id} className="rounded-2xl border bg-white p-5 flex flex-col hover:border-[#0E7C3A] transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="font-bold text-sm leading-snug">{bn.name}</div>
                <span className="text-lg shrink-0" aria-hidden>{decodeIcon(s.icon)}</span>
              </div>
              <div className="text-xs text-zinc-500 mt-1">{CATEGORY_BN[s.category] || s.category}</div>
              <p className="text-sm text-zinc-600 mt-2 grow">{bn.benefit}</p>
              <div className="text-xs text-zinc-500 mt-2">উপযুক্ত: {bn.perfectFor}</div>

              {/* "more explain" — expandable */}
              {bn.explain && (
                <>
                  <button
                    onClick={() => setOpen(isOpen ? null : s.id)}
                    className="self-start mt-2 text-xs font-semibold"
                    style={{ color: GREEN }}
                    aria-expanded={isOpen}
                  >
                    {isOpen ? '▾ কম দেখাও' : '▸ আরো জানো — এটা কী, কেন লাগবে?'}
                  </button>
                  {isOpen && (
                    <p className="mt-2 rounded-xl bg-[#F8FAFC] border p-3 text-[13px] leading-relaxed text-zinc-700">
                      {bn.explain}
                    </p>
                  )}
                </>
              )}

              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <span className="font-bold text-sm" style={{ color: GREEN }}>{s.creditCost} cr</span>
                {s.dollarRange && <span className="text-[11px] text-zinc-400 line-through">{s.dollarRange} Fiverr-এ</span>}
              </div>
              <div className="mt-2">
                <Link
                  href="/signup"
                  className="inline-flex w-full items-center justify-center rounded-full bg-[#0E7C3A] hover:bg-[#0c6a32] px-4 py-2 text-xs font-bold text-white"
                >
                  সাইনআপ করে অর্ডার করো ({s.creditCost} cr)
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
