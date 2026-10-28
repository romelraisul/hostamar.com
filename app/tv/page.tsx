import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Hostamar TV — Live Nonstop 348 Videos • AI Video + Hosting + Agent Cloud',
  description: '24/7 live AI video channel: Sovereign Video OS, Agent Cloud, BDIX Hosting, EU-BD GPU spot market. 348 edge-served videos, PC-off safe via Vercel+Cloudflare.',
  openGraph: {
    title: 'Hostamar TV — Live Nonstop 348 Videos',
    description: '24/7 live AI video channel: Sovereign Video OS, Agent Cloud, BDIX Hosting, EU-BD GPU spot market.',
    url: 'https://hostamar.com/tv',
    siteName: 'Hostamar',
    locale: 'bn_BD',
    type: 'video.other',
    images: [{ url: 'https://hostamar.com/tv-poster.jpg', width: 1200, height: 630, alt: 'Hostamar TV Live' }],
  },
  twitter: { card: 'summary_large_image', title: 'Hostamar TV — Live Nonstop', description: '24/7 AI video channel: 348 edge-served videos, PC-off safe.' },
}
const liveM3u8 = 'https://hostamar.com/api/tv/live'
// Fallback shelf: substantial edge-served videos (PC-off-safe, Vercel+CF)
const SHELF = [
  { fn: 'receipt-sovereign-2-narrated.mp4', title: 'Sovereign Cloud Infra Receipt (15s)' },
  { fn: 'sovereign-video-12-pipelines-narrated.mp4', title: 'Sovereign Video OS — 12 Pipelines (4:32)' },
  { fn: 'agent-cloud-episode-narrated.mp4', title: 'Agent Cloud — Autonomous Employees (3:51)' },
  { fn: 'video-ads-ad-builder-narrated.mp4', title: 'AI Video Ad Builder — One Brief to Campaign (3:47)' },
  { fn: 'gpu-spot-market-narrated.mp4', title: 'EU-BD GPU Spot Market — Sovereign Cloud (3:57)' },
  { fn: 'agent-cloud-audit-log-narrated.mp4', title: 'Agent Cloud — Audit Log & Memory (3:47)' },
  { fn: 'permafrost-thaw-episode-narrated.mp4', title: 'Permafrost Thaw — Climate & Compute (3:46)' },
  { fn: 'dubbing-bn-voice-tutorial-narrated.mp4', title: 'Bangla Voice Dubbing Tutorial (3:07)' },
  { fn: 'eu-bd-gpu-spot-narrated.mp4', title: 'EU-BD GPU Spot — Sovereign Cloud (3:41)' },
]
function pickFallback() { return 'https://hostamar.com/tv/' + SHELF[Math.floor(Math.random() * SHELF.length)].fn }
export default function TVPage() {
  const fallbackMp4 = pickFallback()
  const jsonLd = {
    "@context": "https://schema.org", "@type": "VideoObject",
    "name": "Hostamar TV Live Nonstop",
    "description": "24/7 AI video channel: Sovereign Video OS, Agent Cloud, BDIX Hosting, EU-BD GPU spot. 348 edge-served videos, PC-off safe via Vercel+Cloudflare.",
    "thumbnailUrl": "https://hostamar.com/tv-poster.jpg",
    "contentUrl": liveM3u8,
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
        <div className="status live flex items-center gap-2 mb-2 text-green-400"><span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>Live — NONSTOP</div>
        <video autoPlay loop muted playsInline controls preload="metadata" poster="/tv-poster.jpg" className="w-full aspect-video bg-black rounded-lg">
          <source src={liveM3u8} type="application/x-mpegURL" />
          <source src={fallbackMp4} type="video/mp4" />
        </video>
        <div className="mt-4 text-sm opacity-70">Edge shelf 348 videos • Cloudflare HIT • PC-off-safe</div>
        <details className="mt-6 w-full">
          <summary className="cursor-pointer text-sm text-zinc-400 hover:text-white">Fallback shelf (edge-served, PC-off safe)</summary>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-4 text-[13px]">
            {SHELF.map((v) => (
              <li key={v.fn} className="rounded bg-white/5 p-2 hover:bg-white/10">
                <a href={`/tv/watch/own-${v.fn.replace('.mp4','')}-bangla-tutorial-2026`} className="text-[#4ade80] hover:underline">{v.title}</a>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </main>
  )
}