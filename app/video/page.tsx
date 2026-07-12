'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { getProduct } from '@/lib/products'

// Voice agent is client-only (WebRTC) — never SSR.
const VoiceAgentClient = dynamic(() => import('@/components/voice/VoiceAgentClient'), { ssr: false })

const GREEN = '#0E7C3A'

// AI Video product landing (short marketing route /video). Chrome comes from
// the root layout (AppHeader/AppFooter) — this page renders content only.
export default function VideoPage() {
  const p = getProduct('ai-video')!
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <div className="bg-[#FCFCF9] text-zinc-900 antialiased">
      <section className="mx-auto grid max-w-[1180px] items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-[12px] font-medium">
            <span className="h-2 w-2 rounded-full" style={{ background: GREEN }} />
            {p.badge}
          </div>
          <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
            {p.nameBn} — <span style={{ color: GREEN }}>{p.taglineBn}</span>
          </h1>
          <p className="mt-4 leading-relaxed text-zinc-600">{p.description}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={p.ctaHref}
              className="inline-flex h-11 items-center rounded-full px-6 font-semibold text-white"
              style={{ background: GREEN }}
            >
              {p.ctaLabel}
            </Link>
            {p.ctaSecondary && (
              <Link
                href={p.ctaSecondary.href}
                className="inline-flex h-11 items-center rounded-full border border-zinc-200 px-6 font-medium"
              >
                {p.ctaSecondary.label}
              </Link>
            )}
            <button
              onClick={() => setVoiceOpen((v) => !v)}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-[#E4312B] px-6 font-semibold text-white hover:bg-[#c92a25] transition"
            >
              🎙️ Preview with Voice
            </button>
          </div>
          <div className="mt-6 flex items-center gap-4 text-[13px] text-zinc-500">
            <span>✓ ক্রেডিট কার্ড লাগবে না</span>
            <span className="h-3 w-px bg-zinc-200" />
            <span>✓ bKash এ পেমেন্ট</span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-zinc-900 p-6 text-white shadow-2xl">
          <div className="text-xs opacity-60">hostamar.com/generate</div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-white/10 p-3">
              <div className="text-2xl font-bold">৯০s</div>
              <div className="text-xs opacity-60">Render</div>
            </div>
            <div className="rounded-xl bg-white/10 p-3">
              <div className="text-2xl font-bold">4K</div>
              <div className="text-xs opacity-60">Export</div>
            </div>
            <div className="rounded-xl bg-white/10 p-3">
              <div className="text-2xl font-bold">১০০+</div>
              <div className="text-xs opacity-60">টেমপ্লেট</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-4 pb-16 sm:px-6">
        <h2 className="text-2xl font-bold">কী কী পাবেন</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {p.features.map((f) => (
            <div key={f} className="rounded-2xl border border-zinc-200 bg-white p-5 text-[14px] text-zinc-700">
              <span className="mr-2" style={{ color: GREEN }}>✓</span>
              {f}
            </div>
          ))}
        </div>
      </section>

      {/* Voice Agent (7th product) — বাংলা voiceover preview for Video */}
      {mounted && voiceOpen && (
        <div className="mx-auto my-6 w-full max-w-[520px]">
          <VoiceAgentClient mode="video" />
        </div>
      )}
    </div>
  )
}
