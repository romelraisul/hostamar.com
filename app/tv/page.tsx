import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Hostamar TV — Live Nonstop 360 Videos • AI Video + Hosting + Agent Cloud',
  description: '24/7 live AI video channel: Sovereign Video OS, Agent Cloud, BDIX Hosting, EU-BD GPU spot market. 360 edge-served videos, PC-off safe via Vercel+Cloudflare.',
  openGraph: {
    title: 'Hostamar TV — Live Nonstop 360 Videos',
    description: '24/7 AI video channel: 360 edge-served videos, PC-off safe.',
    url: 'https://hostamar.com/tv',
    siteName: 'Hostamar',
    locale: 'bn_BD',
    type: 'video.other',
    images: [{ url: 'https://hostamar.com/tv-poster.jpg', width: 1200, height: 630, alt: 'Hostamar TV Live' }],
  },
  twitter: { card: 'summary_large_image', title: 'Hostamar TV — Live Nonstop 360', description: '24/7 AI video channel: 360 edge-served videos, PC-off safe.' },
}
const liveM3u8 = 'https://hostamar.com/api/tv/live'
// Fallback shelf: substantial edge-served videos (PC-off-safe, Vercel+CF)
const SHELF = [
  { fn: 'receipt-trillion-market.mp4', title: 'Trillion Market Receipt (15s)' },
  { fn: 'receipt-sovereign-2-narrated.mp4', title: 'Sovereign Cloud Infra Receipt (15s)' },
  { fn: 'sovereign-video-12-pipelines-narrated.mp4', title: 'Sovereign Video OS — 12 Pipelines (4:32)' },
  { fn: 'agent-cloud-episode-narrated.mp4', title: 'Agent Cloud — Autonomous Employees (3:51)' },
  { fn: 'video-ads-ad-builder-narrated.mp4', title: 'AI Video Ad Builder — One Brief to Campaign (3:47)' },
  { fn: 'gpu-spot-market-narrated.mp4', title: 'EU-BD GPU Spot Market — Sovereign Cloud (3:57)' },
  { fn: 'agent-cloud-audit-log-narrated.mp4', title: 'Agent Cloud — Audit Log & Memory (3:47)' },
  { fn: 'permafrost-thaw-episode-narrated.mp4', title: 'Permafrost Thaw — Climate & Compute (3:46)' },
  { fn: 'dubbing-bn-voice-tutorial-narrated.mp4', title: 'Bangla Voice Dubbing Tutorial (3:07)' },
  { fn: 'eu-bd-gpu-spot-narrated.mp4', title: 'EU-BD GPU Spot — Sovereign Cloud (3:41)' },
  { fn: 'dns-episode-narrated.mp4', title: 'DNS — ডোমেইন নামের গল্প (3:11)' },
  { fn: 'sovereign-video-os-episode-narrated.mp4', title: 'Sovereign Video OS Episode (3:13)' },
  { fn: 'opencut-headless-render-narrated.mp4', title: 'OpenCut Headless Render API (2:32)' },
  { fn: 'trillion-market-episode-v2-narrated2.mp4', title: 'Trillion Market — ট্রিলিয়ন বাজার (2:13)' },
  { fn: 'shorts-sovereign-video-12-pipelines.mp4', title: 'Shorts — 12 Pipelines (30s)' },
  { fn: 'sovereign-cloud-pricing-narrated.mp4', title: 'Sovereign Cloud Pricing (2:40)' },
  { fn: 'receipt-hosting.mp4', title: 'BDIX Hosting Receipt (15s)' },
  { fn: 'receipt-agentcloud-49.mp4', title: 'Agent Cloud Receipt (15s)' },
  { fn: 'receipt-prices-narrated.mp4', title: 'Pricing Receipt — ২৯০০/১৯০০/৯৯০ BDT (15s)' },
  { fn: 'receipt-privacy-narrated.mp4', title: 'Compliance & Audit Receipt — সেকিউরিটি জিরো খরচে (15s)' },
  { fn: 'receipt-compliance-audit-narrated.mp4', title: 'Compliance Audit Receipt — সেকিউরিটি অডিট (15s)' },
  { fn: 'receipt-agent-cloud-infra-narrated.mp4', title: 'Agent Cloud Infra Receipt (15s)' },
  { fn: 'receipt-sovereign-infra-narrated.mp4', title: 'Sovereign Infra Receipt (15s)' },
  { fn: 'receipt-om12-pipelines-narrated.mp4', title: 'OM12 Pipelines Receipt (60s)' },
  { fn: 'receipt-sovereign-video-2-narrated.mp4', title: 'Sovereign Video OS Receipt 2 (15s)' },
  { fn: 'receipt-store.mp4', title: 'AI Store Receipt — 106 Services (15s)' },
  { fn: 'receipt-gadget-lounge-narrated.mp4', title: 'Gadget Lounge Receipt — AI Gadgets (15s)' },
  { fn: 'receipt-reel-studio.mp4', title: 'Reel Studio Receipt — Script to Monetize (15s)' },
  { fn: 'receipt-ai-video-ads.mp4', title: 'AI Video Ads Receipt — One Brief to Campaign (15s)' },
  { fn: 'sovereign-video-os-script-to-monetizat.mp4', title: 'Sovereign Video OS — Script to Monetize (60s)' },
  { fn: 'receipt-reel-lab-15s-narrated.mp4', title: 'Reel Lab 15s Receipt (15s)' },
  { fn: 'sovereign-receipt-episode-narrated.mp4', title: 'Sovereign Receipt Episode (77s)' },
  { fn: 'build-log-008-narrated.mp4', title: 'Build Log 008 — Deploy Chains That Lie (2:08)' },
  { fn: 'agent-cloud-memory-narrated.mp4', title: 'Agent Cloud — Memory & Context Graph (2:47)' },
  { fn: 'agent-autonomous-employee-narrated.mp4', title: 'Agent Cloud — Autonomous Employees (3:31)' },
  { fn: 'gps-episode-narrated.mp4', title: 'GPS Episode — Location Tracking (3:25)' },
  { fn: 'https-tls-episode-narrated.mp4', title: 'HTTPS/TLS Episode — Secure Connections (3:17)' },
  { fn: 'cdn-edge-episode-narrated.mp4', title: 'CDN Edge Episode — Bangladesh Compute (3:13)' },
  { fn: 'bangla-llm-episode-narrated.mp4', title: 'Bangla LLM Episode — 5000cr Training (2:51)' },
  { fn: 'dubbing-bn-episode-narrated.mp4', title: 'Bangla Dubbing Episode (3:07)' },
]
function pickFallback() { return 'https://hostamar.com/tv/' + SHELF[Math.floor(Math.random() * SHELF.length)].fn }
export default function TVPage() {
  const fallbackMp4 = pickFallback()
  const jsonLd = {
    "@context": "https://schema.org", "@type": "VideoObject",
    "name": "Hostamar TV Live Nonstop",
    "description": "24/7 AI video channel: Sovereign Video OS, Agent Cloud, BDIX Hosting, EU-BD GPU spot. 360 edge-served videos, PC-off safe via Vercel+Cloudflare.",
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
        <div className="mt-4 text-sm opacity-70">Edge shelf 360 videos • Cloudflare HIT • PC-off-safe</div>
        <details className="mt-6 w-full">
          <summary className="cursor-pointer text-sm text-zinc-400 hover:text-white">Fallback shelf (edge-served, PC-off safe)</summary>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-4 text-[13px]">
            {SHELF.map((v) => (
              <li key={v.fn} className="rounded bg-white/5 p-2 hover:bg-white/10">
                <a href={`/tv/watch/${v.fn.replace('.mp4','')}`} className="text-[#4ade80] hover:underline">{v.title}</a>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </main>
  )
}