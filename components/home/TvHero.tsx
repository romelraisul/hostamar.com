'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import Hls from 'hls.js'
import { registerTvSw, TV_LEVEL_KEY } from '@/lib/tv/useHlsSaveData'

type Channel = {
  id: string
  title: string
  url: string
  logo?: string
  category?: string
  country?: string
}

/**
 * TvHero — Hostamar TV live player for the homepage.
 * Fetches 20 channels, auto-rotates every 10s, dots indicator, click → /tv.
 * Muted autoplay + "Tap for Sound" overlay (browser policy compliant).
 */
export default function TvHero() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  const [channels, setChannels] = useState<Channel[]>([])
  const [idx, setIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [logoError, setLogoError] = useState(false)
  const [showSoundBadge, setShowSoundBadge] = useState(true)

  const current = channels[idx]

  // Load channels from API
  useEffect(() => {
    fetch('/api/tv/channels?limit=20', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        const items = d.items || d.channels || []
        if (items.length > 0) {
          setChannels(items)
          // Default = first BD channel sorted by views, else first
          const bdIdx = items.findIndex((c: Channel) => c.country === 'bd')
          setIdx(bdIdx >= 0 ? bdIdx : 0)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
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
    if (!video || !current) return
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }
    const url = current.url
    if (!url) return

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url
      video.play().catch(() => {})
      return
    }
    if (Hls.isSupported()) {
      let savedLevel = -1
      try { savedLevel = Number(localStorage.getItem(TV_LEVEL_KEY) ?? '-1') } catch {}
      const hls = new Hls({
        enableWorker: true, lowLatencyMode: false,
        backBufferLength: 30, maxBufferLength: 30, maxMaxBufferLength: 60,
        maxBufferSize: 20 * 1000 * 1000, maxBufferHole: 0.5,
        highBufferWatchdogPeriod: 2, nudgeOffset: 0.1, nudgeMaxRetry: 5,
        maxFragLookUpTolerance: 0.25, liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 10, liveDurationInfinity: false,
        startLevel: Number.isFinite(savedLevel) && savedLevel >= 0 ? savedLevel : -1,
        capLevelToPlayerSize: true, autoStartLoad: true, testBandwidth: true, progressive: false,
      })
      hls.loadSource(url)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(() => {}) })
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          // Auto-skip dead channel
          setTimeout(() => {
            setIdx((i) => (i + 1) % channels.length)
            setLogoError(false)
          }, 1500)
        }
      })
      hls.on(Hls.Events.LEVEL_SWITCHED, (_e, d) => {
        try { localStorage.setItem(TV_LEVEL_KEY, String(d.level)) } catch {}
      })
      hlsRef.current = hls
      return () => { hls.destroy(); hlsRef.current = null }
    }
  }, [current, channels.length])

  // Service worker
  useEffect(() => { registerTvSw() }, [])

  // First interaction → enable sound
  const enableSound = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = false
      videoRef.current.volume = 1
    }
    if (!audioCtxRef.current) {
      try { audioCtxRef.current = new AudioContext() } catch {}
    }
    audioCtxRef.current?.resume()
    setShowSoundBadge(false)
  }, [])

  if (loading) {
    return (
      <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-[#0E7C3A] bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="mono text-xs text-zinc-400">Loading live channels...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-[#0E7C3A] bg-black" onClick={enableSound}>
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        muted
        autoPlay
        playsInline
        controls={false}
        poster="/og-image.png"
      />

      {/* Watermark */}
      <div className="absolute top-3 right-3 bg-black/60 text-white px-3 py-1 text-xs font-bold tracking-wider z-10 pointer-events-none">
        HOSTAMAR.COM/TV
      </div>

      {/* LIVE badge */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-red-600 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse z-10">
        <span className="w-2 h-2 bg-white rounded-full" /> LIVE
      </div>

      {/* Channel name + logo */}
      {current && (
        <div className="absolute top-2 left-16 flex items-center gap-2 bg-black/60 text-white px-2 py-1 rounded-full text-xs font-bold z-10">
          {current.logo && !logoError ? (
            <img src={current.logo} alt="" className="w-5 h-5 rounded" onError={() => setLogoError(true)} />
          ) : (
            <div className="w-5 h-5 rounded bg-emerald-500 flex items-center justify-center text-[10px] font-black">
              {current.title.charAt(0)}
            </div>
          )}
          {current.title}
        </div>
      )}

      {/* Tap for Sound badge */}
      {showSoundBadge && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-white/90 text-[#0E7C3A] text-xs px-3 py-1 rounded-full font-bold shadow animate-pulse z-10 pointer-events-none">
          🔊 Tap for Sound
        </div>
      )}

      {/* Bottom bar */}
      <Link
        href={current ? `/tv?channel=${current.id}` : '/tv'}
        className="absolute bottom-2 left-2 right-2 bg-black/60 hover:bg-black/80 text-white text-xs px-2 py-1 rounded truncate z-10 block"
      >
        🎬 {current?.title || 'Hostamar TV'} • {channels.length} channels • 10s rotation ▶
      </Link>

      {/* Dots indicator */}
      {channels.length > 1 && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-1 z-10">
          {channels.slice(0, 20).map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setIdx(i); setLogoError(false); }}
              className={`w-1.5 h-1.5 rounded-full transition ${i === idx ? 'bg-white scale-125' : 'bg-white/40'}`}
            />
          ))}
        </div>
      )}

      {/* IPTV link */}
      <Link href="/tv" className="absolute -bottom-7 left-0 text-[11px] text-[#0E7C3A] font-semibold hover:underline z-10">📺 IPTV: hostamar.com/api/tv/iptv.m3u → VLC / Smart TV</Link>
    </div>
  )
}
