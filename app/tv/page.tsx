'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface VideoItem {
  id: string
  title: string
  url: string
  thumbnail?: string | null
  duration?: number | null
}

export default function TVPage() {
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Fetch playlist on mount
  useEffect(() => {
    async function fetchPlaylist() {
      try {
        const res = await fetch('/api/tv/playlist?format=json&limit=374', { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to fetch playlist')
        const data = await res.json()
        if (data.videos && data.videos.length > 0) {
          setVideos(data.videos)
        } else {
          throw new Error('No videos in playlist')
        }
      } catch (e: any) {
        setError(e.message)
        // Fallback to manifest
        try {
          const res = await fetch('/tv/manifest.json', { cache: 'no-store' })
          const data = await res.json()
          if (data.videos && data.videos.length > 0) {
            const manifestVideos = data.videos.map((fn: string, idx: number) => ({
              id: String(idx),
              title: fn.replace('.mp4', '').replace(/[_-]/g, ' '),
              url: `https://f005.hostamar.com/file/hostamar-prod/${fn}`,
              thumbnail: null,
              duration: null,
            }))
            setVideos(manifestVideos)
          }
        } catch {}
      } finally {
        setLoading(false)
      }
    }
    fetchPlaylist()
  }, [])

  // Handle video end -> auto-advance to next
  const handleEnded = useCallback(() => {
    if (videos.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % videos.length)
    }
  }, [videos.length])

  // Handle video error -> skip to next
  const handleError = useCallback(() => {
    if (videos.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % videos.length)
    }
  }, [videos.length])

  // Play next video when index changes
  useEffect(() => {
    if (videoRef.current && videos.length > 0) {
      videoRef.current.src = videos[currentIndex].url
      videoRef.current.load()
      videoRef.current.play().catch(() => { /* autoplay may be blocked */ })
    }
  }, [currentIndex, videos])

  const currentVideo = videos[currentIndex]

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-6xl">
          <div className="status live flex items-center gap-2 mb-2 text-green-400">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>Loading playlist...
          </div>
          <div className="w-full aspect-video bg-black rounded-lg flex items-center justify-center">
            <div className="text-zinc-400">Loading videos...</div>
          </div>
        </div>
      </main>
    )
  }

  if (videos.length === 0) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-6xl text-center">
          <h1 className="text-2xl font-bold mb-4">Hostamar TV</h1>
          <p className="text-zinc-400">No videos available. Check back later.</p>
        </div>
      </main>
    )
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "name": "Hostamar TV Live Nonstop",
    "description": "24/7 AI video channel: Sovereign Video OS, Agent Cloud, BDIX Hosting, EU-BD GPU spot. 374 edge-served videos, PC-off safe via Vercel+Cloudflare.",
    "thumbnailUrl": "https://hostamar.com/tv-poster.jpg",
    "contentUrl": currentVideo?.url || '',
    "embedUrl": "https://hostamar.com/tv",
    "uploadDate": "2026-10-01T00:00:00.000Z",
    "duration": "PT24H",
    "isLiveBroadcast": true,
    "keywords": "Hostamar TV, AI video, Sovereign Video OS, Agent Cloud, BDIX Hosting, GPU spot market, Bangla",
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="w-full max-w-6xl">
        <div className="status live flex items-center gap-2 mb-2 text-green-400">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          Live — NONSTOP ({videos.length} videos)
        </div>

        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            controls
            preload="metadata"
            poster="/tv-poster.jpg"
            className="w-full h-full object-contain"
            onEnded={handleEnded}
            onError={handleError}
          >
            <source src={currentVideo?.url} type="video/mp4" />
          </video>

          {/* Overlay with current video info */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-70">NOW PLAYING {currentIndex + 1} / {videos.length}</p>
                <h2 className="text-lg font-semibold truncate max-w-md">{currentVideo?.title}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentIndex((prev) => (prev - 1 + videos.length) % videos.length)}
                  className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition"
                  aria-label="Previous"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button
                  onClick={() => setCurrentIndex((prev) => (prev + 1) % videos.length)}
                  className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition"
                  aria-label="Next"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 text-sm opacity-70 flex items-center justify-between">
          <span>Edge shelf {videos.length} videos • Cloudflare HIT • PC-off-safe</span>
          <span className="text-[#4ade80]">● LIVE</span>
        </div>

        {/* Playlist drawer */}
        <details className="mt-6 w-full">
          <summary className="cursor-pointer text-sm text-zinc-400 hover:text-white flex items-center justify-between">
            Playlist ({videos.length} videos)
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </summary>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 text-[12px] max-h-96 overflow-y-auto">
            {videos.map((v, idx) => (
              <li key={v.id} className="rounded bg-white/5 p-2 hover:bg-white/10 transition cursor-pointer group"
                onClick={() => setCurrentIndex(idx)}
              >
                <div className="font-medium text-white truncate group-hover:text-[#4ade80]">{idx + 1}. {v.title}</div>
                <div className="text-[10px] text-zinc-500 truncate">{v.url}</div>
                {idx === currentIndex && <span className="text-[#4ade80] text-xs">▶ NOW PLAYING</span>}
              </li>
            ))}
          </ul>
        </details>
      </div>
    </main>
  )
}