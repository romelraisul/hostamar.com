'use client'

/**
 * StoreCatalog — client-side grid fed by the PUBLIC catalog API
 * (/api/services/catalog, Cache-Control max-age=60). The API is the live
 * source of truth (106 services today); no embedded copy goes stale.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'

const GREEN = '#0E7C3A'

interface CatalogService {
  id: string
  name: string
  nameBn: string
  category: string
  creditCost: number
  dollarRange?: string | null
  benefit: string
  perfectFor: string
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
  const shown = cat === 'all' ? services : services.filter((s) => s.category === cat)

  if (loading) return <div className="text-sm text-zinc-500 py-10 text-center">ক্যাটালগ লোড হচ্ছে…</div>
  if (error) return <div className="text-sm text-red-600 py-10 text-center">{error}</div>

  return (
    <>
      <div className="text-sm text-zinc-600 mb-4">
        লাইভ ক্যাটালগ: <b>{total}</b> সার্ভিস — সরাসরি প্রোডাকশন ডাটাবেস থেকে (প্রতি মিনিটে রিফ্রেশ)
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${cat === c ? 'bg-[#0E7C3A] text-white border-[#0E7C3A]' : 'bg-white text-zinc-700 hover:bg-zinc-50'}`}
          >
            {c === 'all' ? 'সব' : c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {shown.map((s) => (
          <div key={s.id} className="rounded-2xl border bg-white p-5 flex flex-col hover:border-[#0E7C3A] transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="font-bold text-sm leading-snug">{s.name}</div>
              <span className="text-lg shrink-0">{decodeIcon(s.icon)}</span>
            </div>
            <div className="text-xs text-zinc-500 mt-1">{s.category}</div>
            <p className="text-sm text-zinc-600 mt-2 grow">{s.benefit}</p>
            <div className="text-xs text-zinc-500 mt-2">উপযুক্ত: {s.perfectFor}</div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t">
              <span className="font-bold text-sm" style={{ color: GREEN }}>{s.creditCost} cr</span>
              {s.dollarRange && <span className="text-[11px] text-zinc-400 line-through">{s.dollarRange} Fiverr-এ</span>}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
