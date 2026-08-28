'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import Hls from 'hls.js';
import AdTicker from '@/components/tv/AdTicker';

type Channel = {
  id: string
  title: string
  url: string
  logo?: string
  category?: string
  country?: string
}

export default function TvHero() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const skipRef = useRef<NodeJS.Timeout | null>(null)

  const [channels, setChannels] = useState<Channel[]>([])
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<'loading'|'ready'|'error'>('loading')
  const [logoError, setLogoError] = useState(false)
  const [showSoundBadge, setShowSoundBadge] = useState(true)

  const current = channels[idx]

  // Fetch channels with fallback chain: stable -> old /channels -> hardcoded
  useEffect(() => {
    let cancelled = false
    setPhase('loading')

    async function loadWithFallback() {
      // 1. Try stable-channels (preferred — ranked by stability+popularity)
      // 2. Fallback to /api/tv/channels (whitelisted, 3700 channels, no stability score)
      // 3. Final fallback: localStorage cached most-stable channel
      const urls = [
        '/api/tv/stable-channels?limit=20',
        '/api/tv/channels?country=bd&limit=20',
      ]
      let items: Channel[] = []
      for (const url of urls) {
        try {
          const r = await fetch(url, { cache: 'no-store' })
          if (!r.ok) continue
          const d = await r.json()
          const arr: Channel[] = Array.isArray(d.items) ? d.items : Array.isArray(d) ? d : []
          if (arr.length > 0) { items = arr; break }
        } catch {}
      }
      if (cancelled) return

      if (items.length === 0) {
        setPhase('error')
        return
      }

      setChannels(items)
      // Try saved most-stable channelId, fallback to BD-first
      let startIdx = 0
      try {
        const saved = localStorage.getItem('hostamar_stable_default')
        if (saved) {
          const found = items.findIndex((c) => c.id === saved)
          if (found >= 0) startIdx = found
        }
        if (startIdx === 0) {
          const bdIdx = items.findIndex((c) => c.country === 'bd')
          if (bdIdx >= 0) startIdx = bdIdx
        }
        // Save the top stable channel as default for next session
        if (items[0]?.id) localStorage.setItem('hostamar_stable_default', items[0].id)
      } catch {}
      setIdx(startIdx)
      setPhase('ready')
    }

    loadWithFallback()
    return () => { cancelled = true }
  }, [])

  // Auto-rotate every 10s
  useEffect(() => {
    if (channels.length <= 1) return
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % channels.length)
      setLogoError(false)
    }, 10000)
    return () => clearInterval(t)
  }, [channels.length])

  // HLS player
  useEffect(() => {
    const video = videoRef.current
    if (!video || !current || phase !== 'ready') return

    if (skipRef.current) clearTimeout(skipRef.current)
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null }

    const url = current.url
    if (!url) return

    skipRef.current = setTimeout(() => {
      if (video.readyState < 1) {
        setIdx((i) => (i + 1) % channels.length)
        setLogoError(false)
      }
    }, 5000)

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url
      video.play().catch(() => {})
      return
    }
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true, lowLatencyMode: false,
        backBufferLength: 30, maxBufferLength: 30, maxMaxBufferLength: 60,
        maxBufferSize: 20 * 1000 * 1000, maxBufferHole: 0.5,
        startLevel: -1, capLevelToPlayerSize: true,
        autoStartLoad: true, testBandwidth: true, progressive: false,
      })
      hls.loadSource(url)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (skipRef.current) { clearTimeout(skipRef.current); skipRef.current = null }
        video.play().catch(() => {})
      })
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal && skipRef.current) {
          clearTimeout(skipRef.current); skipRef.current = null
          setTimeout(() => { setIdx((i) => (i + 1) % channels.length); setLogoError(false) }, 1000)
        }
      })
      hlsRef.current = hls
      return () => {
        if (skipRef.current) clearTimeout(skipRef.current)
        hls.destroy(); hlsRef.current = null
      }
    }
  }, [current, channels.length, phase])

  const enableSound = useCallback(() => {
    if (videoRef.current) { videoRef.current.muted = false; videoRef.current.volume = 1 }
    setShowSoundBadge(false)
  }, [])

  if (phase === 'loading') {
    return (
      <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-[#0E7C3A] bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="mono text-xs text-zinc-400">Loading live channels...</p>
        </div>
      </div>
    )
  }

  if (phase === 'error' || channels.length === 0) {
    return (
      <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-[#0E7C3A] bg-black flex items-center justify-center">
        <div className="text-center p-4">
          <Tv className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
          <p className="mono text-xs text-zinc-400 mb-2">No channels available</p>
          <Link href="/tv" className="text-emerald-400 text-xs font-bold hover:underline">Go to TV →</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl overflow-hidden border-2 border-[#0E7C3A]">
      <div className="relative aspect-video bg-black" onClick={enableSound}>
        <video ref={videoRef} className="w-full h-full object-cover" muted autoPlay playsInline controls={false} poster="/og-image.png" />

        <div className="absolute top-3 right-3 bg-black/60 text-white px-3 py-1 text-xs font-bold tracking-wider z-10 pointer-events-none">HOSTAMAR.COM/TV</div>
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-red-600 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse z-10"><span className="w-2 h-2 bg-white rounded-full" /> LIVE</div>

        {current && (
          <div className="absolute top-2 left-16 flex items-center gap-2 bg-black/60 text-white px-2 py-1 rounded-full text-xs font-bold z-10">
            {current.logo && !logoError ? (
              <img src={current.logo} alt="" className="w-5 h-5 rounded" onError={() => setLogoError(true)} />
            ) : (
              <div className="w-5 h-5 rounded bg-emerald-500 flex items-center justify-center text-[10px] font-black">{current.title.charAt(0)}</div>
            )}
            {current.title}
          </div>
        )}

        {showSoundBadge && <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-white/90 text-[#0E7C3A] text-xs px-3 py-1 rounded-full font-bold shadow animate-pulse z-10 pointer-events-none">🔊 Tap for Sound</div>}

        <Link href={current ? `/tv?channel=${current.id}` : '/tv'} className="absolute bottom-2 left-2 right-2 bg-black/60 hover:bg-black/80 text-white text-xs px-2 py-1 rounded truncate z-10 block">
          🎬 {current?.title || 'Hostamar TV'} • {channels.length} stable • 10s rotation ▶
        </Link>

        {channels.length > 1 && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {channels.slice(0, 20).map((_, i) => (
              <button key={i} onClick={(e) => { e.stopPropagation(); setIdx(i); setLogoError(false); }} className={`w-1.5 h-1.5 rounded-full transition ${i === idx ? 'bg-white scale-125' : 'bg-white/40'}`} />
            ))}
          </div>
        )}
      </div>
      <AdTicker variant="marquee" />
      <Link href="/tv" className="block text-[11px] text-[#0E7C3A] font-semibold hover:underline px-2 py-1">📺 IPTV: hostamar.com/api/tv/iptv.m3u → VLC / Smart TV</Link>
    </div>
  )
}

function Tv({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="15" x="2" y="7" rx="2" ry="2" /><path d="m17 2-5 5-5-5" />
    </svg>
  )
}
