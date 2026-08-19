'use client'

// app/status/page.tsx — PUBLIC status page (no auth, cached 30s server-side).
// Reads /api/status for per-product green/yellow/red state.
import { useEffect, useState } from 'react'

type State = 'green' | 'yellow' | 'red'
interface StatusResp {
  products: Record<string, State>
  generatedAt: string
}

const DOT: Record<State, string> = {
  green: '🟢',
  yellow: '🟡',
  red: '🔴',
}
const LABEL: Record<State, string> = {
  green: 'সচল',
  yellow: 'মন্দ',
  red: 'বিভ্রাট',
}

export default function StatusPage() {
  const [data, setData] = useState<StatusResp | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const res = await fetch('/api/status', { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as StatusResp
        if (alive) setData(json)
      } catch (e) {
        if (alive) setErr(String((e as Error).message || e))
      }
    }
    load()
    const t = setInterval(load, 30_000)
    return () => { alive = false; clearInterval(t) }
  }, [])

  return (
    <div className="min-h-screen bg-[#FCFCF9] text-zinc-900 antialiased p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#0E7C3A] bg-[#0E7C3A]/10 px-3 py-1 rounded-full">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0E7C3A] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#0E7C3A]" />
          </span>
          System Status
        </div>
        <h1 className="bangla text-[28px] md:text-[32px] font-bold tracking-[-0.02em] mb-2">হোস্টামার স্ট্যাটাস</h1>
        <p className="bangla text-[14px] text-zinc-500 mb-6">
          {data ? `সর্বশেষ আপডেট ${new Date(data.generatedAt).toLocaleString()}` : err ? `সমস্যা: ${err}` : 'লোড হচ্ছে…'}
        </p>
        <div className="grid grid-cols-1 gap-3">
          {data &&
            Object.entries(data.products).map(([name, state]) => (
              <div key={name} className="flex items-center justify-between rounded-[16px] border border-zinc-200 bg-white px-5 py-4 shadow-sm">
                <span className="bangla font-medium capitalize text-[15px]">{name === 'SSO' ? 'SSO' : name}</span>
                <span className="flex items-center gap-2">
                  <span>{DOT[state]}</span>
                  <span className="bangla text-[13px] text-zinc-600">{LABEL[state]}</span>
                </span>
              </div>
            ))}
        </div>
        <p className="bangla mt-8 text-[12px] text-zinc-400">
          অটোমেটেড চেক প্রতি ৫ মিনিটে চলে। ঘটনা অপারেশন চ্যানেলে পোস্ট করা হয়।
        </p>
      </div>
    </div>
  )
}
