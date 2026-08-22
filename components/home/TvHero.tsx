'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Hls from 'hls.js'

/**
 * TvHero — Hostamar TV live player for the homepage 70% HERO cell.
 * Same playback contract as app/tv/page.tsx:
 *   - hls.js (MSE) FIRST, native HLS fallback
 *   - error-driven + 2s-watchdog fallback to the codec-free VP9/Opus variant,
 *     remounting a FRESH <video> element (key=variant) because a poisoned
 *     MSE element cannot be reused after MEDIA_ERR_SRC_NOT_SUPPORTED.
 * Muted autoplay, controls, pulsing LIVE badge, now-playing title.
 */

type NowPlaying = {
  ok?: boolean
  isLive?: boolean
  hlsReachable?: boolean
  hlsUrl?: string | null
  title?: string | null
  channelName?: string
  gender?: string | null
  voiceUsed?: string | null
  credit?: number | null
}

const VP9_URL = 'https://vp9.hostamar.com/master.m3u8'
const FALLBACK_TITLE = '[TV] রাষ্ট্রপতি মির্জা ফখরুলকে মালদ্বীপের প্রেসিডেন্টের অভিনন্দন'

export default function TvHero() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const [np, setNp] = useState<NowPlaying | null>(null)
  const [variant, setVariant] = useState<'h264' | 'vp9'>('h264')
  const [unsupported, setUnsupported] = useState(false)

  // Poll now-playing (title + live status) every 30s
  useEffect(() => {
    let alive = true
    const load = () =>
      fetch('/api/tv/now-playing', { cache: 'no-store' })
        .then((r) => r.json())
        .then((j) => { if (alive) setNp(j) })
        .catch(() => {})
    load()
    const t = setInterval(load, 30000)
    return () => { alive = false; clearInterval(t) }
  }, [])

  const isLive = !!(np?.isLive && np?.hlsReachable !== false)

  // Player — identical error-driven fallback chain as /tv
  useEffect(() => {
    const video = videoRef.current
    if (!video || !isLive) return
    const source = variant === 'vp9' ? VP9_URL : (np?.hlsUrl || '')
    if (!source) return

    const goVp9 = () => setVariant((v) => (v === 'h264' ? 'vp9' : v))

    if (Hls.isSupported()) {
      if (hlsRef.current) hlsRef.current.destroy()
      const hls = new Hls({ enableWorker: true, lowLatencyMode: false })
      hls.loadSource(source)
      hls.attachMedia(video)
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return
        if (variant === 'h264') { goVp9(); return }
        hls.destroy()
      })
      const onMediaErr = () => { if (variant === 'h264') goVp9() }
      video.addEventListener('error', onMediaErr)
      const watchdog = setInterval(() => {
        if (variant === 'h264' && video.error) goVp9()
      }, 2000)
      hlsRef.current = hls
      return () => {
        clearInterval(watchdog)
        video.removeEventListener('error', onMediaErr)
        hls.destroy()
      }
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = source
      video.play().catch(() => {})
    } else {
      setUnsupported(true)
    }
  }, [isLive, variant, np?.hlsUrl])

  const title = np?.title || FALLBACK_TITLE
  const credit = np?.credit ?? 6000
  const isFemale = np?.gender === 'female'
  const genderIcon = isFemale ? '👩' : '👨'
  const voiceName = np?.voiceUsed
    ? (np.voiceUsed.includes('Nabanita') ? 'Nabanita' : np.voiceUsed.includes('Pradeep') ? 'Pradeep' : np.voiceUsed)
    : ''

  return (
    <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-[#0E7C3A] bg-black">
      <video
        key={variant}
        ref={videoRef}
        className="w-full h-full object-cover"
        muted
        autoPlay
        playsInline
        controls
        poster="/og-image.png"
      />

      {/* Channel watermark — top RIGHT corner */}
      <div className="absolute top-3 right-3 bg-black/60 text-white px-3 py-1 text-xs font-bold tracking-wider z-10 pointer-events-none">
        HOSTAMAR.COM/TV
      </div>

      {/* LIVE badge */}
      {isLive ? (
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-red-600 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse z-10">
          <span className="w-2 h-2 bg-white rounded-full" /> LIVE
        </div>
      ) : (
        <div className="absolute top-2 left-2 bg-zinc-700 text-white text-xs px-2 py-1 rounded-full font-bold z-10">OFFLINE</div>
      )}

      {/* Watch Live — below watermark so both fit in the top-right stack */}
      <Link
        href="/tv"
        className="absolute top-11 right-3 bg-white/90 hover:bg-white text-[#0E7C3A] text-xs px-2.5 py-1 rounded-full font-bold shadow z-10"
      >
        LIVE দেখুন →
      </Link>

      {/* Gender + voice indicator — bottom right, above the title bar */}
      {(isFemale || voiceName) && (
        <div className="absolute bottom-9 right-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded z-10">
          {genderIcon} {voiceName}
        </div>
      )}

      {/* Now playing bar */}
      <div className="absolute bottom-2 left-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded truncate z-10">
        🎬 [TV] {title} • credit {credit} • 70% HERO ▶{unsupported ? ' • browser HLS unsupported' : ''}
      </div>
    </div>
  )
}
