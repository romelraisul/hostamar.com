import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Hostamar - AI Video Maker for Bangladeshi Business'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/**
 * English-only OG image (2026-08-29): Satori cannot reliably shape Bangla
 * conjuncts even with Noto Sans Bengali - Facebook previews showed broken
 * glyphs. English text renders 100% correctly with Inter. Bangla stays on the
 * page itself (H1, copy, services) - only the share image is English.
 * 2026-09-14: restyled to the approved Bazaar Poster brand (cream paper, ink,
 * green accent) replacing the old dark purple gradient.
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
          backgroundColor: '#FBF4E4',
          backgroundImage: 'linear-gradient(135deg, #FBF4E4 0%, #F6EBD2 55%, #FBEAC6 100%)',
          border: '6px solid #1C1917',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 26 }}>
          <div style={{ width: 54, height: 54, borderRadius: 14, background: '#FFFDF6', border: '3px solid #1C1917', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 0, height: 0, borderTop: '10px solid transparent', borderBottom: '10px solid transparent', borderLeft: '16px solid #0E7C3A' }} />
          </div>
          <div style={{ display: 'flex', fontSize: 32, fontWeight: 700, color: '#1C1917' }}>Hostamar</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', fontSize: 64, fontWeight: 700, lineHeight: 1.15, color: '#1C1917' }}>
          <span>AI Video Maker for</span>
          <span style={{ color: '#0E7C3A' }}>Bangladeshi Business</span>
        </div>
        <div style={{ display: 'flex', fontSize: 24, color: '#57534E', marginTop: 28 }}>50+ Templates  Bangla Voiceover  bKash Payment</div>
        <div style={{ display: 'flex', fontSize: 18, color: '#8a8075', marginTop: 12 }}>hostamar.com  6000 FREE credits  50+ AI Services  TV 3700 channels</div>
      </div>
    ),
    { ...size, fonts: [{ name: 'Inter', data: interBold, weight: 700 }] }
  )
}
