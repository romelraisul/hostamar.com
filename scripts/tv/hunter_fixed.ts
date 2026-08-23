/**
 * hunter_fixed.ts — Hunt free Creative-Commons YouTube videos for the 6 Hostamar
 * products using the FIXED browser automation (camofox.hostamar.com), verify
 * license + metadata with yt-dlp, and store candidates in FreeVideoSource.
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/tv/hunter_fixed.ts [--products Video,Hosting,...] [--max-per-product 2]
 */
import { prisma } from '../../lib/prisma'
import { ensureSchema } from '../../lib/ensure-schema'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(execFile)
const YT_DLP = process.env.HOME + '/.local/bin/yt-dlp'
const CAMOFOX = 'https://camofox.hostamar.com'
const USER_ID = 'tv-hunter'

// 6 products x queries. sp=EgIwAQ%3D%3D = Creative Commons filter on YouTube search.
// AUDIENCE-FOCUSED: only queries Daraz sellers / BD SME will love (no Perl, no generic English).
const PRODUCT_QUERIES: Record<string, string[]> = {
  Video: ['Daraz product video tutorial Bangla', 'Facebook Reels fashion video tutorial', 'Eid collection marketing video'],
  Hosting: ['WordPress e-commerce website tutorial Bangla', 'How to make website for small business Bangla', 'Domain hosting Bangla tutorial'],
  Chat: ['Messenger auto reply tutorial Bangla small business', 'Facebook page auto reply', 'AI chatbot for shop'],
  Browser: ['Daraz price tracking automation', 'Browser automation for marketers Bangla', 'How to automate Facebook posts'],
  IDE: ['VS Code tutorial Bangla beginners', 'JavaScript tutorial Bangla for e-commerce', 'WordPress PHP tutorial Bangla'],
  Gaming: ['Free Fire tournament hosting Bangla', 'Game server hosting tutorial Bangladesh', 'PUBG tournament how to organize'],
}

const CC_SP = 'sp=EgIwAQ%253D%253D' // double-encoded CC filter (survives URL building)

async function camofoxPost(path: string, body: any): Promise<any> {
  const r = await fetch(CAMOFOX + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90000) as any,
  })
  return r.json()
}
async function camofoxGet(path: string): Promise<any> {
  const r = await fetch(CAMOFOX + path, { signal: AbortSignal.timeout(60000) as any })
  return r.json()
}

async function huntYouTube(query: string): Promise<Array<{ title: string; url: string; videoId: string }>> {
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&${CC_SP}`
  const tab = await camofoxPost('/tabs', { userId: USER_ID, sessionKey: 'hunt-' + Date.now(), url: searchUrl })
  const tabId = tab?.tabId
  if (!tabId) { console.warn('  [hunt] no tab for', query); return [] }
  await new Promise(r => setTimeout(r, 6000)) // let results render
  const linksResp = await camofoxGet(`/tabs/${tabId}/links?userId=${USER_ID}`)
  const links: any[] = linksResp?.links || []
  const out: Array<{ title: string; url: string; videoId: string }> = []
  const seen = new Set<string>()
  for (const l of links) {
    const url = l?.url || ''
    const m = url.match(/watch\?v=([A-Za-z0-9_-]{11})/)
    if (!m) continue
    const videoId = m[1]
    if (seen.has(videoId)) continue
    const text = (l?.text || '').replace(/\s+/g, ' ').trim()
    // skip junk links (bare "Watch", durations, "Now playing")
    if (!text || text.length < 15 || /^\d+:\d+/.test(text) || /^Watch\b/.test(text) || /Now playing/.test(text)) continue
    seen.add(videoId)
    out.push({ title: text.slice(0, 150), url: `https://www.youtube.com/watch?v=${videoId}`, videoId })
    if (out.length >= 6) break
  }
  // close tab (best effort)
  try { await fetch(`${CAMOFOX}/tabs/${tabId}?userId=${USER_ID}`, { method: 'DELETE', signal: AbortSignal.timeout(10000) as any }) } catch {}
  return out
}

async function ytMeta(videoId: string): Promise<{ license: string; views: number; duration: number; title: string } | null> {
  try {
    const { stdout } = await execAsync(YT_DLP, ['--dump-json', '--no-warnings', `https://www.youtube.com/watch?v=${videoId}`], { timeout: 60000, maxBuffer: 20 * 1024 * 1024 } as any)
    const j = JSON.parse(String(stdout))
    return {
      license: j.license || 'unknown',
      views: j.view_count || 0,
      duration: j.duration || 0,
      title: j.title || '',
    }
  } catch { return null }
}

function isCC(license: string): boolean {
  const l = (license || '').toLowerCase()
  return l.includes('creative commons') || l.includes('cc') || l === 'cc0' || l.includes('public domain')
}

async function main() {
  await ensureSchema()
  const args = process.argv.slice(2)
  const prodArg = args.find(a => a.startsWith('--products='))?.split('=')[1]
  const products = prodArg ? prodArg.split(',') : Object.keys(PRODUCT_QUERIES)
  const maxPer = parseInt(args.find(a => a.startsWith('--max-per-product='))?.split('=')[1] || '2', 10)

  let inserted = 0
  const summary: Record<string, number> = {}

  for (const product of products) {
    const queries = PRODUCT_QUERIES[product] || []
    console.log(`\n=== ${product} ===`)
    let got = 0
    for (const q of queries) {
      if (got >= maxPer) break
      console.log(`  hunting: ${q}`)
      let results: Array<{ title: string; url: string; videoId: string }> = []
      try { results = await huntYouTube(q) } catch (e: any) { console.warn('  [hunt] failed:', e?.message); continue }
      console.log(`    ${results.length} candidates`)
      for (const r of results) {
        if (got >= maxPer) break
        // dedupe by url
        const existing = await prisma.freeVideoSource.findUnique({ where: { url: r.url } }).catch(() => null)
        if (existing) continue
        const meta = await ytMeta(r.videoId)
        if (!meta) { console.log(`    skip (no meta): ${r.title.slice(0, 40)}`); continue }
        if (!isCC(meta.license)) { console.log(`    skip (license ${meta.license}): ${r.title.slice(0, 40)}`); continue }
        if (meta.duration > 600 || meta.duration < 20) { console.log(`    skip (duration ${meta.duration}s)`); continue }
        const viralScore = Math.min(10, Math.log10(Math.max(meta.views, 1)) + 3)
        await prisma.freeVideoSource.create({
          data: {
            product,
            title: meta.title || r.title,
            url: r.url,
            videoId: r.videoId,
            license: meta.license,
            views: meta.views,
            duration: meta.duration,
            viralScore,
          },
        })
        inserted++
        got++
        console.log(`    ✓ CC [${meta.license}] ${meta.views} views ${Math.round(meta.duration)}s: ${meta.title.slice(0, 50)}`)
      }
    }
    summary[product] = got
  }

  console.log(`\n=== DONE: inserted ${inserted} CC videos ===`)
  console.log(JSON.stringify(summary))
  try { await prisma.tvLog.create({ data: { level: 'info', message: `Hunter: ${inserted} CC videos for ${products.join(',')}` } }) } catch {}
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
