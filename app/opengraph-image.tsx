import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Hostamar — AI Video Maker for Bangladeshi Business'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/**
 * English-only OG image (2026-08-29): Satori cannot reliably shape Bangla
 * conjuncts (যুক্তাক্ষর) even with Noto Sans Bengali — Facebook previews showed
 * broken glyphs (মেকার → মকোর). English text renders 100% correctly with Inter.
 * Bangla stays on the page itself (H1, copy, services) — only the share image
 * is English. NotoSansBengali-*.ttf remain in public/fonts for page use.
 */
export default async function Image() {
  let interBold: ArrayBuffer
  try {
    const r = await fetch('https://hostamar.com/fonts/Inter-Bold.ttf')
    if (!r.ok) throw new Error(String(r.status))
    interBold = await r.arrayBuffer()
  } catch {
    const r = await fetch('https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Bold.woff2')
    interBold = await r.arrayBuffer()
  }

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px',
          backgroundColor: '#0a0a0a',
          backgroundImage: 'linear-gradient(to bottom right, #0a0a0a, #1a1a2e, #1a0a2e)',
        }}
      >
        <div style={{ display: 'flex', fontSize: 32, fontWeight: 700, color: '#ffffff', marginBottom: 24 }}>
          Hostamar
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', fontSize: 64, fontWeight: 700, lineHeight: 1.15, color: '#ffffff' }}>
          <span>AI Video Maker for</span>
          <span style={{ color: '#a855f7' }}>Bangladeshi Business</span>
        </div>
        <div style={{ display: 'flex', fontSize: 24, color: '#a1a1aa', marginTop: 28 }}>
          50+ Templates • Bangla Voiceover • bKash Payment
        </div>
        <div style={{ display: 'flex', fontSize: 18, color: '#71717a', marginTop: 12 }}>
          hostamar.com • 6000 FREE credits • 50+ AI Services • TV 3700 channels
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: 'Inter', data: interBold, weight: 700 }] }
  )
}
