'use client'

import { useEffect, useState } from 'react'
import { TV_TEXT_ADS, TV_TEXT_ADS_INTERVAL_MS } from '@/lib/tv-ads'

type Variant = 'marquee' | 'sidebar'

/**
 * Zero-cost text ad ticker.
 * - marquee: bottom strip that fades between ads every 8s.
 * - sidebar: stacked 300x250 box, 3 visible at a time.
 */
export default function AdTicker({ variant = 'marquee' }: { variant?: Variant }) {
  const [idx, setIdx] = useState(0)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const t = setInterval(() => {
      setFading(true)
      setTimeout(() => {
        setIdx((i) => (i + 1) % TV_TEXT_ADS.length)
        setFading(false)
      }, 250)
    }, TV_TEXT_ADS_INTERVAL_MS)
    return () => clearInterval(t)
  }, [])

  if (variant === 'sidebar') {
    const start = idx
    const visible = [0, 1, 2].map((k) => TV_TEXT_ADS[(start + k) % TV_TEXT_ADS.length])
    return (
      <div className="rounded-xl border border-[#0E7C3A]/30 bg-white p-3 w-[300px] h-[250px] flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold tracking-widest text-[#0E7C3A]">SPONSORED</span>
          <span className="text-[10px] text-[#64748B]">Ad {idx + 1}/{TV_TEXT_ADS.length}</span>
        </div>
        <div className="flex-1 flex flex-col gap-2 justify-around">
          {visible.map((ad, i) => (
            <div
              key={`${idx}-${i}`}
              className="text-[11px] leading-snug text-[#0F172A] border-l-2 border-[#0E7C3A] pl-2 py-1"
            >
              {ad}
            </div>
          ))}
        </div>
        <div className="mt-1 text-center text-[9px] text-[#64748B]">hostamar.com</div>
      </div>
    )
  }

  // marquee variant
  return (
    <div className="bg-black/85 border-t border-[#0E7C3A]/40 h-7 flex items-center overflow-hidden">
      <span className="text-[9px] font-bold bg-[#0E7C3A] text-white px-2 h-full flex items-center shrink-0">
        AD {idx + 1}/{TV_TEXT_ADS.length}
      </span>
      <div className="flex-1 overflow-hidden relative h-full">
        <div
          className={`absolute inset-0 flex items-center px-3 transition-opacity duration-200 ${
            fading ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <span className="text-[11px] text-white whitespace-nowrap truncate font-medium">
            {TV_TEXT_ADS[idx]}
          </span>
        </div>
      </div>
    </div>
  )
}
