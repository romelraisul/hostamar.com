'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TV_TEXT_ADS, TV_TEXT_ADS_INTERVAL_MS } from '@/lib/tv-ads'

type Variant = 'marquee' | 'sidebar'

export default function AdTicker({
  variant = 'marquee',
  ads = TV_TEXT_ADS,
  channelId,
}: {
  variant?: Variant
  ads?: typeof TV_TEXT_ADS
  channelId?: string
}) {
  const [idx, setIdx] = useState(0)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const t = setInterval(() => {
      setFading(true)
      setTimeout(() => {
        setIdx((i) => (i + 1) % ads.length)
        setFading(false)
      }, 250)
    }, TV_TEXT_ADS_INTERVAL_MS)
    return () => clearInterval(t)
  }, [ads.length])

  const track = (ad: (typeof ads)[number]) => {
    try {
      fetch('/api/tv/ad-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adKey: ad.adKey, adText: ad.text, channelId }),
        keepalive: true,
      }).catch(() => {})
    } catch {}
  }

  if (variant === 'sidebar') {
    const visible = [0, 1, 2].map((k) => ads[(idx + k) % ads.length])
    return (
      <div className="rounded-xl border border-[#0E7C3A]/30 bg-white p-3 w-[300px] h-[250px] flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold tracking-widest text-[#0E7C3A]">SPONSORED</span>
          <span className="text-[10px] text-[#64748B]">Ad {idx + 1}/{ads.length}</span>
        </div>
        <div className="flex-1 flex flex-col gap-2 justify-around">
          {visible.map((ad, i) => (
            <Link
              key={`${idx}-${i}`}
              href={ad.href}
              onClick={() => track(ad)}
              className="text-[11px] leading-snug text-[#0F172A] border-l-2 border-[#0E7C3A] pl-2 py-1 hover:bg-zinc-50 block"
            >
              {ad.text}
            </Link>
          ))}
        </div>
        <div className="mt-1 text-center text-[9px] text-[#64748B]">hostamar.com</div>
      </div>
    )
  }

  const current = ads[idx]
  return (
    <div className="bg-black/85 border-t border-[#0E7C3A]/40 h-7 flex items-center overflow-hidden z-40">
      <span className="text-[9px] font-bold bg-[#0E7C3A] text-white px-2 h-full flex items-center shrink-0">
        AD {idx + 1}/{ads.length}
      </span>
      <div className="flex-1 overflow-hidden relative h-full">
        <div
          className={`absolute inset-0 flex items-center px-3 transition-opacity duration-200 ${
            fading ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <Link
            href={current.href}
            onClick={() => track(current)}
            className="text-[11px] text-white whitespace-nowrap truncate font-medium hover:text-emerald-300"
          >
            {current.text}
          </Link>
        </div>
      </div>
      <Link href="/tv" className="text-[9px] font-black bg-white text-black px-2 h-full flex items-center shrink-0 z-50">
        HOSTAMAR.COM/TV
      </Link>
    </div>
  )
}
