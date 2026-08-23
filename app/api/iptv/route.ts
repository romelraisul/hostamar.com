export const dynamic = 'force-dynamic'

export async function GET() {
  // Alias for clients that don't allow .m3u extension
  const hls = 'https://tv.hostamar.com/hls/tv/index.m3u8'
  const vp9 = 'https://vp9.hostamar.com/master.m3u8'
  const m3u = `#EXTM3U
#EXTINF:-1 tvg-id="hostamar.tv" tvg-name="Hostamar TV" tvg-logo="https://hostamar.com/og-image.png" group-title="Bangladesh;Business" tvg-language="bn" ,Hostamar TV
${hls}
#EXTINF:-1 tvg-id="hostamar.tv.vp9" tvg-name="Hostamar TV VP9" group-title="Bangladesh",Hostamar TV VP9
${vp9}
`
  return new Response(m3u, {
    headers: {
      'Content-Type': 'audio/x-mpegurl',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    },
  })
}
