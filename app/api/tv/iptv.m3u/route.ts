export const dynamic = 'force-dynamic'

export async function GET() {
  const hls = 'https://tv.hostamar.com/hls/tv/index.m3u8'
  const vp9 = 'https://vp9.hostamar.com/master.m3u8'
  const m3u = `#EXTM3U
#EXTINF:-1 tvg-id="hostamar.tv" tvg-name="Hostamar TV" tvg-logo="https://hostamar.com/og-image.png" group-title="Bangladesh;Business" tvg-language="bn" tvg-country="BD",Hostamar TV - বাংলাদেশি SME মার্কেটিং
${hls}
#EXTINF:-1 tvg-id="hostamar.tv.vp9" tvg-name="Hostamar TV VP9" tvg-logo="https://hostamar.com/og-image.png" group-title="Bangladesh" tvg-language="bn",Hostamar TV VP9 (Low Bandwidth)
${vp9}
`
  return new Response(m3u, {
    headers: {
      'Content-Type': 'audio/x-mpegurl; charset=utf-8',
      'Content-Disposition': 'inline; filename="hostamar.m3u"',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store',
    },
  })
}
