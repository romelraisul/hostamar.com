'use client'

/**
 * app/dashboard/reel/page.tsx — AI Reel Generator (V25).
 * 4 slides, Bangla captions, logo watermark, Bangla voiceover (ElevenLabs →
 * browser TTS), 12s WEBM export via canvas.captureStream + MediaRecorder —
 * client-side, no ffmpeg (Vercel serverless safe). Sanitized: no innerHTML.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { Loader2, Upload, Volume2, VolumeX, Download, Copy, Video } from 'lucide-react'
import ReelPreview from '@/components/reel-preview'

type ReelData = {
  images: string[]
  captions: string[]
  script: string
  audioUrl: string
  useBrowserTTS: boolean
  duration: number
}

const GRADIENTS = [
  'data:image/svg+xml;base64,' + btoaSafe(`<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280"><rect width="100%" height="100%" fill="#052e16"/><circle cx="540" cy="320" r="180" fill="#10b981" opacity="0.2"/><text x="50%" y="50%" text-anchor="middle" font-size="60" fill="#34d399" opacity="0.4">Hostamar</text></svg>`),
  'data:image/svg+xml;base64,' + btoaSafe(`<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280"><rect width="100%" height="100%" fill="#1e1b4b"/><circle cx="180" cy="900" r="240" fill="#0ea5e9" opacity="0.15"/><text x="50%" y="50%" text-anchor="middle" font-size="60" fill="#818cf8" opacity="0.4">Hostamar</text></svg>`),
  'data:image/svg+xml;base64,' + btoaSafe(`<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280"><rect width="100%" height="100%" fill="#3b0764"/><circle cx="540" cy="640" r="200" fill="#a78bfa" opacity="0.15"/><text x="50%" y="50%" text-anchor="middle" font-size="60" fill="#c4b5fd" opacity="0.4">Hostamar</text></svg>`),
  'data:image/svg+xml;base64,' + btoaSafe(`<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280"><rect width="100%" height="100%" fill="#0c0a09"/><circle cx="360" cy="300" r="220" fill="#10b981" opacity="0.12"/><text x="50%" y="50%" text-anchor="middle" font-size="60" fill="#a7f3d0" opacity="0.4">Hostamar</text></svg>`),
]
function btoaSafe(s: string) { try { return btoa(unescape(encodeURIComponent(s))) } catch { return '' } }

const DEFAULT_CAPTIONS = ['এক ডলারে দশ কেজি প্লাস্টিক', 'পিওর কার্বন ফিডস্টক বানাও', 'ফ্ল্যাশ জুল হিটিং ৩১০০K', 'আড়াই কেজি গ্রাফিন = $১২৫-১২৫০']

export default function ReelPage() {
  const [data, setData] = useState<ReelData | null>(null)
  const [loading, setLoading] = useState(true)
  const [logoUrl, setLogoUrl] = useState('')
  const [speaking, setSpeaking] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [msg, setMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const captions = (data?.captions?.length ? data.captions : DEFAULT_CAPTIONS).slice(0, 4).map(c => String(c).slice(0, 140))
  const images = (data?.images?.length === 4 ? data.images : GRADIENTS)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/video/reel/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'graphene' }),
        credentials: 'include',
      })
      const j = await r.json().catch(() => null)
      if (r.ok && j?.ok && Array.isArray(j.images) && j.images.length === 4) {
        setData({ images: j.images, captions: j.captions || DEFAULT_CAPTIONS, script: j.script || '', audioUrl: j.audioUrl || '', useBrowserTTS: !!j.useBrowserTTS, duration: j.duration || 12 })
      } else {
        setData({ images: GRADIENTS, captions: DEFAULT_CAPTIONS, script: '', audioUrl: '', useBrowserTTS: true, duration: 12 })
      }
    } catch {
      setData({ images: GRADIENTS, captions: DEFAULT_CAPTIONS, script: '', audioUrl: '', useBrowserTTS: true, duration: 12 })
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const onLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const fd = new FormData()
    fd.append('logo', f)
    try {
      const r = await fetch('/api/video/reel/upload-logo', { method: 'POST', body: fd, credentials: 'include' })
      const j = await r.json().catch(() => null)
      if (r.ok && j?.url) { setLogoUrl(j.url); setMsg('লোগো যোগ হয়েছে ✓') }
      else setMsg(j?.error || 'লোগো আপলোড ব্যর্থ')
    } catch { setMsg('লোগো আপলোড ব্যর্থ') }
  }

  const speak = (text: string) => {
    try {
      if (!('speechSynthesis' in window)) { setMsg('এই ব্রাউজারে TTS নেই'); return }
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'bn-BD'
      u.rate = 0.9
      u.onend = () => setSpeaking(false)
      u.onerror = () => setSpeaking(false)
      setSpeaking(true)
      window.speechSynthesis.speak(u)
    } catch { setSpeaking(false) }
  }

  const toggleVoice = () => {
    if (speaking) { window.speechSynthesis?.cancel(); setSpeaking(false); return }
    if (data?.audioUrl && !data.useBrowserTTS) {
      const a = audioRef.current || new Audio(data.audioUrl)
      audioRef.current = a
      a.play().then(() => setSpeaking(true)).catch(() => speak(data.script || captions.join('. ')))
      a.onended = () => setSpeaking(false)
      return
    }
    speak(data?.script || captions.join('. '))
  }

  /** 12s WEBM export — canvas 720x1280, captureStream 30fps, MediaRecorder. */
  const exportReel = async () => {
    if (exporting) return
    setExporting(true)
    setMsg('')
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 720
      canvas.height = 1280
      const ctx = canvas.getContext('2d')!
      const slideMs = 3000
      const totalMs = 12000

      // preload images + logo
      const loadImg = (src: string) => new Promise<HTMLImageElement>((res) => {
        const im = new Image()
        im.crossOrigin = 'anonymous'
        im.onload = () => res(im)
        im.onerror = () => res(im)
        im.src = src
      })
      const slideImgs = await Promise.all(images.map(loadImg))
      const logoImg = logoUrl ? await loadImg(logoUrl) : null

      const stream = canvas.captureStream(30)
      // optional audio track (ElevenLabs URL)
      let audioCtx: AudioContext | null = null
      if (data?.audioUrl && !data.useBrowserTTS) {
        try {
          const a = await fetch(data.audioUrl).then(r => r.blob())
          const buf = await a.arrayBuffer()
          audioCtx = new AudioContext()
          const src = audioCtx.createBufferSource()
          src.buffer = await audioCtx.decodeAudioData(buf)
          const dest = audioCtx.createMediaStreamDestination()
          src.connect(dest)
          src.start()
          dest.stream.getAudioTracks().forEach(t => stream.addTrack(t))
        } catch { /* silent video if audio fails */ }
      }

      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm'
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_500_000 })
      const chunks: Blob[] = []
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
      const done = new Promise<Blob>((res) => { rec.onstop = () => res(new Blob(chunks, { type: 'video/webm' })) })
      rec.start(200)

      const t0 = performance.now()
      await new Promise<void>((resolve) => {
        const draw = (t: number) => {
          const el = t - t0
          const i = Math.min(3, Math.floor(el / slideMs))
          const img = slideImgs[i]
          // backdrop
          ctx.fillStyle = '#0a0a0a'
          ctx.fillRect(0, 0, 720, 1280)
          try { ctx.drawImage(img, 0, 0, 720, 1280) } catch { /* keep backdrop */ }
          // bottom gradient
          const g = ctx.createLinearGradient(0, 950, 0, 1280)
          g.addColorStop(0, 'rgba(0,0,0,0)')
          g.addColorStop(1, 'rgba(0,0,0,0.8)')
          ctx.fillStyle = g
          ctx.fillRect(0, 950, 720, 330)
          // caption
          ctx.fillStyle = '#ffffff'
          ctx.font = 'bold 40px "Noto Sans Bengali", "Hind Siliguri", sans-serif'
          ctx.textAlign = 'center'
          ctx.shadowColor = 'rgba(0,0,0,0.9)'
          ctx.shadowBlur = 10
          const cap = captions[i] || ''
          ctx.fillText(cap, 360, 1150, 640)
          // logo
          if (logoImg) {
            ctx.save()
            ctx.beginPath()
            ctx.arc(660, 70, 44, 0, Math.PI * 2)
            ctx.closePath()
            ctx.clip()
            try { ctx.drawImage(logoImg, 616, 26, 88, 88) } catch { /* skip */ }
            ctx.restore()
            ctx.strokeStyle = 'rgba(255,255,255,0.8)'
            ctx.lineWidth = 3
            ctx.beginPath(); ctx.arc(660, 70, 44, 0, Math.PI * 2); ctx.stroke()
          } else {
            ctx.fillStyle = 'rgba(14,124,58,0.85)'
            ctx.beginPath(); ctx.arc(660, 70, 44, 0, Math.PI * 2); ctx.fill()
            ctx.fillStyle = '#ffffff'
            ctx.font = 'bold 44px sans-serif'
            ctx.fillText('H', 660, 86)
          }
          if (el >= totalMs) { resolve(); return }
          requestAnimationFrame(draw)
        }
        requestAnimationFrame(draw)
      })

      rec.stop()
      const blob = await done
      audioCtx?.close().catch(() => {})
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `hostamar-reel-${Date.now()}.webm`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 30000)
      setMsg('✓ ১২ সেকেন্ডের রিল ডাউনলোড হয়েছে')
    } catch (e: any) {
      setMsg('এক্সপোর্ট ব্যর্থ: ' + String(e?.message || e).slice(0, 120))
    } finally { setExporting(false) }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Video className="h-7 w-7 text-[#10B981]" />
          <h1 className="text-2xl font-bold">AI রিল জেনারেটর</h1>
          <span className="rounded-full bg-[#10B981]/15 text-[#10B981] text-[11px] font-bold px-2 py-0.5 border border-[#10B981]/30">NEW</span>
          {loading && <Loader2 className="h-5 w-5 animate-spin text-zinc-500 ml-1" />}
        </div>

        <div className="grid md:grid-cols-[380px_1fr] gap-8 items-start">
          <div className="flex flex-col gap-4">
            <ReelPreview images={images} captions={captions} logoUrl={logoUrl} />
            <div className="flex flex-wrap gap-2">
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={onLogoUpload} />
              <button onClick={() => logoInputRef.current?.click()} className="flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 px-4 py-2 text-sm font-medium">
                <Upload className="h-4 w-4" /> লোগো আপলোড
              </button>
              <button onClick={toggleVoice} className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white transition ${speaking ? 'bg-[#10B981] animate-pulse' : 'bg-[#0E7C3A] hover:bg-[#10B981]'}`}>
                {speaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                {speaking ? 'বন্ধ করুন' : 'বাংলা ভয়েসওভার চালু করুন'}
              </button>
              <button onClick={exportReel} disabled={exporting} className="flex items-center gap-1.5 rounded-full bg-[#0E7C3A] hover:bg-[#10B981] disabled:opacity-60 text-white px-4 py-2 text-sm font-semibold">
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                ভিডিও এক্সপোর্ট (১২ সেকেন্ড)
              </button>
              <button onClick={load} disabled={loading} className="rounded-full border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 px-4 py-2 text-sm">
                রিফ্রেশ
              </button>
            </div>
            {msg && <p className="text-sm text-[#10B981]">{msg}</p>}
          </div>

          <div className="space-y-5">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold text-sm">স্ক্রিপ্ট</h2>
                <button onClick={() => { navigator.clipboard?.writeText(data?.script || ''); setCopied(true); setTimeout(() => setCopied(false), 2000) }} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white">
                  <Copy className="h-3 w-3" /> {copied ? 'কপি হয়েছে' : 'কপি'}
                </button>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap" style={{ fontFamily: "'Noto Sans Bengali', sans-serif" }}>
                {data?.script || 'প্লাস্টিক → গ্রাফিন — $১ → $১২৫০ রিল স্ক্রিপ্ট লোড হচ্ছে…'}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <h2 className="font-semibold text-sm mb-2">ক্যাপশন (৪ স্লাইড)</h2>
              <ol className="text-sm text-zinc-300 space-y-1 list-decimal list-inside" style={{ fontFamily: "'Noto Sans Bengali', sans-serif" }}>
                {captions.map((c, i) => <li key={i}>{c}</li>)}
              </ol>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-400">
              <p className="mb-2 font-semibold text-zinc-200">HD এক্সপোর্ট চাই? Pro নিন</p>
              <p>Pro ১২৯৯ TK → 13000cr — bKash <span className="text-[#10B981] font-semibold">01822417463</span></p>
              <Link href="/dashboard/payment" className="inline-flex mt-3 rounded-full bg-[#0E7C3A] hover:bg-[#10B981] text-white px-4 py-1.5 font-semibold text-xs">আপগ্রেড করুন →</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
