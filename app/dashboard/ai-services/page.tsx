'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, Sparkles, Filter, Coins, Clock, ChevronRight, Loader2 } from 'lucide-react'
import { fetchCatalog, decodeIcon, type CatalogService } from '@/lib/services'

/**
 * /dashboard/ai-services — full 50+ AI services catalog.
 * (The separate /dashboard/services page = VPS/RDP hosting manager — untouched.)
 * Data: /api/services/catalog (public). Search + category filter client-side.
 */
export default function AiServicesPage() {
  const [services, setServices] = useState<CatalogService[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')

  useEffect(() => {
    fetchCatalog()
      .then(d => setServices(d.services || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const categories = useMemo(() => {
    const seen = new Map<string, number>()
    services.forEach(s => seen.set(s.category, (seen.get(s.category) || 0) + 1))
    return [...seen.entries()].sort((a, b) => b[1] - a[1])
  }, [services])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return services.filter(s => {
      if (cat !== 'all' && s.category !== cat) return false
      if (!needle) return true
      return (
        s.name.toLowerCase().includes(needle) ||
        s.nameBn.includes(q.trim()) ||
        s.benefit.toLowerCase().includes(needle) ||
        s.benefitBn.includes(q.trim()) ||
        s.category.toLowerCase().includes(needle)
      )
    })
  }, [services, q, cat])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-[#0F172A] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#0E7C3A]" />
            {services.length || 50}+ AI সার্ভিস
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            ইন্সটাগ্রাম ক্যারোসেল • ভাইরাল রিল হুক • লোগো • বিজ্ঞাপন — ২ ঘণ্টায় ডেলিভারি • 15–100 credit
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] px-4 py-2 text-xs font-semibold text-[#0E7C3A]">
          <Coins className="w-3.5 h-3.5" /> Starter ৳599 • Pro ৳1299 • Business ৳2999
        </div>
      </div>

      {/* Search + categories */}
      <div className="rounded-2xl border bg-white p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="সার্চ করুন — carousel, reel, logo, ব্যানার..."
              className="w-full rounded-xl border bg-[#F8FAFC] pl-9 pr-3 py-2.5 text-sm outline-none focus:border-[#0E7C3A]"
              style={{ fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif" }}
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-[#64748B]">
            <Filter className="w-4 h-4" /> {filtered.length} / {services.length}
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setCat('all')}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${cat === 'all' ? 'bg-[#0E7C3A] text-white' : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#ECFDF5]'}`}
            style={{ fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif" }}
          >
            সব ({services.length})
          </button>
          {categories.map(([c, n]) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${cat === c ? 'bg-[#0E7C3A] text-white' : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#ECFDF5]'}`}
            >
              {c} ({n})
            </button>
          ))}
        </div>
      </div>

      {/* States */}
      {loading && (
        <div className="flex items-center justify-center gap-2 text-sm text-[#64748B] py-20">
          <Loader2 className="w-5 h-5 animate-spin" /> সার্ভিস লোড হচ্ছে...
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ক্যাটালগ লোড ব্যর্থ ({error}) — রিফ্রেশ করুন
        </div>
      )}

      {/* Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(s => (
            <div key={s.id} className="group rounded-2xl border bg-white p-4 hover:border-[#0E7C3A]/40 hover:shadow-md transition-all flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <span className="w-10 h-10 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0]/50 grid place-items-center text-xl">{decodeIcon(s.icon)}</span>
                <span className="rounded-full bg-[#F1F5F9] px-2 py-1 text-[10px] font-semibold text-[#475569]">{s.id.toUpperCase()}</span>
              </div>
              <h3 className="mt-3 font-semibold text-[#0F172A] text-sm leading-snug" style={{ fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif" }}>
                {s.nameBn}
              </h3>
              <p className="text-[11px] text-[#94A3B8] mt-0.5">{s.name}</p>
              <p className="text-xs text-[#64748B] mt-2 line-clamp-2 flex-1" style={{ fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif" }}>
                {s.benefitBn}
              </p>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] text-[#0E7C3A] px-2.5 py-1 text-xs font-bold">
                  <Coins className="w-3 h-3" /> {s.creditCost} cr
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F5F9] text-[#475569] px-2.5 py-1 text-[11px]">
                  <Clock className="w-3 h-3" /> ২ ঘণ্টা
                </span>
                {s.dollarRange && (
                  <span className="rounded-full bg-[#FFFBEB] text-[#B45309] px-2.5 py-1 text-[11px] font-medium">vs {s.dollarRange}</span>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-[10px] text-[#94A3B8]" style={{ fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif" }}>{s.categoryBn}</span>
                <Link
                  href={`/generate?serviceId=${s.id}`}
                  className="inline-flex items-center gap-1 rounded-full bg-[#0E7C3A] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#0c6a32] transition"
                  style={{ fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif" }}
                >
                  বানান <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-2xl border bg-white p-12 text-center">
          <Search className="w-10 h-10 text-[#CBD5E1] mx-auto" />
          <p className="text-sm text-[#64748B] mt-2" style={{ fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif" }}>
            কিছু পাওয়া যায়নি — &quot;{q}&quot; — অন্য কিছু লিখুন
          </p>
        </div>
      )}
    </div>
  )
}
