import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Hostamar TV — Live Nonstop 3700 Channels' }
export default function TVPage() {
  const liveM3u8 = 'https://cdn.hostamar.com/tv/live.m3u8'
  const fallbackMp4 = 'https://f002.backblazeb2.com/file/hostamar-prod/tv/product-hunt-demo.mp4'
  const jsonLd = { "@context": "https://schema.org", "@type": "VideoObject", "name": "Hostamar TV Live Nonstop", "description": "AI Store + 152 Models + 300 Directories/Day Auto SEO — Live Nonstop 142 videos loop", "thumbnailUrl": "https://hostamar.com/tv-poster.jpg", "contentUrl": liveM3u8, "embedUrl": "https://hostamar.com/tv", "uploadDate": new Date().toISOString(), "duration": "PT24H", "isLiveBroadcast": true }
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="w-full max-w-6xl">
        <div className="status live flex items-center gap-2 mb-2 text-green-400"><span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>Live — NONSTOP</div>
        <video autoPlay loop muted playsInline controls preload="metadata" poster="/tv-poster.jpg" className="w-full aspect-video bg-black rounded-lg">
          <source src={liveM3u8} type="application/x-mpegURL" />
          <source src={fallbackMp4} type="video/mp4" />
        </video>
        <div className="mt-4 text-sm opacity-70">B2 ONLY 142 videos + 485 legacy • Cloudflare HIT • ComfyUI RTX 5060 8188 INT8 • Gateway 11442 152 models • No R2 No KV</div>
      </div>
    </main>
  )
}