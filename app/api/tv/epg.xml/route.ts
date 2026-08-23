export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { ensureSchema } from '@/lib/ensure-schema'

export async function GET() {
  try {
    await ensureSchema()
    const ch = await prisma.tvChannel.findFirst()
    const items = ch ? await prisma.tvPlaylistItem.findMany({ where: { channelId: ch.id }, orderBy: { position: 'asc' }, take: 12 }) : []
    const now = new Date()
    const fmt = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0')
      return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}00 +0600`
    }
    let t = new Date(now)
    const programmes = items.map((it, i) => {
      const start = fmt(t)
      const durSec = 180 // estimate; real durations unknown server-side without ffprobe
      const endDate = new Date(t.getTime() + durSec * 1000)
      const end = fmt(endDate)
      t = endDate
      const title = (it.title || 'Hostamar TV').replace(/&/g, '&amp;').replace(/</g, '&lt;')
      return `  <programme start="${start}" stop="${end}" channel="hostamar.tv"><title lang="bn">${title}</title><desc lang="bn">বাংলাদেশি SME মার্কেটিং ভিডিও — Hostamar TV</desc><category>Business</category></programme>`
    }).join('\n')
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<tv generator-info-name="Hostamar TV" generator-info-url="https://hostamar.com/tv">
  <channel id="hostamar.tv"><display-name>Hostamar TV</display-name><display-name lang="bn">হোস্টামার টিভি</display-name><icon src="https://hostamar.com/og-image.png" /><url>https://hostamar.com/tv</url></channel>
${programmes}
</tv>`
    return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=300' } })
  } catch (e: any) {
    return new Response(`<tv><channel id="hostamar.tv"><display-name>Hostamar TV</display-name></channel></tv>`, { headers: { 'Content-Type': 'application/xml' } })
  }
}
