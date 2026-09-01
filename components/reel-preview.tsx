'use client'

/**
 * components/reel-preview.tsx — reusable 9:16 reel player (V25).
 * Props-driven, no fetches: parent supplies images/captions/logo.
 * 3s per slide + progress bar + Bangla caption overlay + logo watermark.
 */
import { useEffect, useRef, useState } from 'react'

const SLIDE_MS = 3000

export default function ReelPreview({
  images,
  captions,
  logoUrl,
  autoPlay = true,
  onSlide,
}: {
  images: string[]
  captions: string[]
  logoUrl?: string
  autoPlay?: boolean
  onSlide?: (i: number) => void
}) {
  const [idx, setIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const [playing, setPlaying] = useState(autoPlay)
  const startRef = useRef<number>(0)
  const rafRef = useRef<number>(0)

  const n = Math.max(1, images.length)

  useEffect(() => {
    if (!playing) return
    startRef.current = performance.now()
    const tick = (t: number) => {
      const el = t - startRef.current
      const p = Math.min(1, (el % SLIDE_MS) / SLIDE_MS)
      setProgress(p)
      const i = Math.floor(el / SLIDE_MS) % n
      setIdx((prev) => {
        if (prev !== i) onSlide?.(i)
        return i
      })
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [playing, n, onSlide])

  const caption = (captions[idx] || '').slice(0, 140)

  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-[#0a0a0a] select-none"
      style={{ width: 360, height: 640, maxWidth: '100%' }}
      onClick={() => setPlaying((p) => !p)}
    >
      {images[idx] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={images[idx]} alt={`Slide ${idx + 1}`} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#052e16] to-[#0a0a0a]" />
      )}

      {/* logo watermark */}
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="logo" className="absolute top-4 right-4 w-12 h-12 rounded-full object-cover border-2 border-white/70 shadow-lg opacity-90" />
      ) : (
        <div className="absolute top-4 right-4 w-12 h-12 rounded-full bg-[#0E7C3A]/80 text-white flex items-center justify-center font-bold text-xl shadow-lg opacity-90">H</div>
      )}

      {/* caption */}
      <div className="absolute inset-x-0 bottom-14 bg-gradient-to-t from-black/80 to-transparent pt-10 pb-4 px-4">
        <p
          className="text-white text-center text-[19px] leading-relaxed font-semibold"
          style={{ fontFamily: "'Noto Sans Bengali', 'Hind Siliguri', sans-serif", textShadow: '0 2px 8px rgba(0,0,0,0.9)', overflowWrap: 'break-word', wordBreak: 'keep-all' } as React.CSSProperties}
        >
          {caption}
        </p>
      </div>

      {/* progress */}
      <div className="absolute bottom-0 inset-x-0 h-1.5 bg-black/40">
        <div className="h-full flex gap-0.5 px-0.5">
          {Array.from({ length: n }).map((_, i) => (
            <div key={i} className="flex-1 h-full bg-white/20 rounded-sm overflow-hidden">
              <div
                className="h-full bg-[#10B981] transition-none"
                style={{ width: i < idx ? '100%' : i === idx ? `${progress * 100}%` : '0%' }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
