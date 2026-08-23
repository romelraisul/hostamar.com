'use client'

import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'

/**
 * WatchPlayer — plays a single TV video.
 * Direct MP4 (tv.hostamar.com/videos/...) first; HLS live stream as fallback.
 * Same codec-fallback contract as app/tv/page.tsx (hls.js, VP9 variant).
 */
export default function WatchPlayer({ mp4Url, hlsUrl, poster, title }: {
  mp4Url: string | null
  hlsUrl: string
  poster?: string
  title: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const [mode, setMode] = useState<'mp4' | 'hls'>(mp4Url ? 'mp4' : 'hls')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (mode === 'mp4' && mp4Url) {
      video.src = mp4Url
      video.load()
      const onErr = () => setMode('hls') // MP4 unreachable → live HLS
      video.addEventListener('error', onErr, { once: true })
      return () => video.removeEventListener('error', onErr)
    }

    // HLS mode
    const VP9_URL = 'https://vp9.hostamar.com/master.m3u8'
    const h264Ok = typeof MediaSource !== 'undefined'
      && MediaSource.isTypeSupported('video/mp4; codecs="avc1.42E01E"')
    const source = h264Ok ? hlsUrl : VP9_URL

    if (Hls.isSupported()) {
      if (hlsRef.current) hlsRef.current.destroy()
      const hls = new Hls({ enableWorker: true, lowLatencyMode: false })
      hlsRef.current = hls
      hls.loadSource(source)
      hls.attachMedia(video)
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal && source !== VP9_URL) {
          hls.destroy()
          const h2 = new Hls({ enableWorker: true })
          hlsRef.current = h2
          h2.loadSource(VP9_URL)
          h2.attachMedia(video)
        } else if (data.fatal) {
          setFailed(true)
        }
      })
      return () => { hls.destroy(); hlsRef.current = null }
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = source
      video.load()
    } else {
      setFailed(true)
    }
  }, [mode, mp4Url, hlsUrl])

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
      <video
        ref={videoRef}
        controls
        autoPlay
        muted
        playsInline
        poster={poster}
        className="h-full w-full"
        aria-label={title}
      />
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white text-sm p-6 text-center">
          ভিডিও লোড হয়নি — <a href="/tv" className="underline ml-1">লাইভ TV দেখুন</a>
        </div>
      )}
    </div>
  )
}
