'use client'

/**
 * Google Preferred Source badge — official 2025-08-20 publisher.js spec.
 * Standard variant renders the official <google-add-preferred-source-btn>;
 * custom variant binds preferredSource.addPreferredSource() to a Hostamar-styled
 * button (fires gtag + /api/seo/track, then deeplink fallback in a new tab).
 * No layout shift: fixed-height container until script loads.
 */
import { useEffect, useRef } from 'react'

type Props = {
  /** 'standard' = official Google button | 'custom' = Hostamar-branded */
  variant?: 'standard' | 'custom'
  theme?: 'light' | 'dark'
  lang?: string
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    preferredSource?: { addPreferredSource?: (domain: string) => void }
  }
}

export default function PreferredSourceBadge({ variant = 'standard', theme = 'light', lang = 'auto' }: Props) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const firedRef = useRef(false)

  useEffect(() => {
    if (document.querySelector('script[data-ps-publisher]')) return
    const s = document.createElement('script')
    s.src = 'https://news.google.com/swg/js/v1/publisher.js'
    s.async = true
    s.dataset.psPublisher = '1'
    document.head.appendChild(s)
  }, [])

  const track = () => {
    if (firedRef.current) return
    firedRef.current = true
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gtag = (window as any).gtag
      if (typeof gtag === 'function') gtag('event', 'preferred_source_click', { source: 'hostamar_badge' })
    } catch {}
    fetch('/api/seo/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'preferred_source_click', url: window.location.pathname }),
      keepalive: true,
    }).catch(() => {})
  }

  const onCustomClick = () => {
    track()
    const domain = 'hostamar.com'
    try {
      if (window.preferredSource?.addPreferredSource) {
        window.preferredSource.addPreferredSource(domain)
        return
      }
    } catch {}
    window.open(`https://www.google.com/preferences/source?q=${domain}`, '_blank', 'noopener')
  }

  if (variant === 'standard') {
    return (
      <div style={{ minHeight: 44 }} className="not-prose">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <div
          google-add-preferred-source-btn="true"
          data-theme={theme}
          data-lang={lang}
          onClick={track}
        />
      </div>
    )
  }

  return (
    <div className="not-prose mt-8 rounded-2xl border border-[#2563EB]/30 bg-[#2563EB]/5 p-5 text-center" style={{ minHeight: 44 }}>
      <p className="text-[15px] font-semibold text-[#2563EB]">
        Love Hostamar? Make us a Preferred Source on Google — get us in Top Stories & AI Overviews
      </p>
      <button
        ref={btnRef}
        onClick={onCustomClick}
        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-5 py-2.5 text-[14px] font-bold text-white transition hover:bg-[#1d4fd7]"
      >
        ⭐ Add Hostamar as Preferred Source
      </button>
    </div>
  )
}
