/**
 * browserTool.ts — browser.hostamar.com "find free CC video" TOOL.
 *
 * Wraps camofox.hostamar.com REST automation so an AI (or the workflow) can call
 * a single tool-shaped function:
 *
 *   browser_search_youtube_cc({ product, query }) → FreeVideoSource candidates
 *
 * Uses the YouTube Creative-Commons search filter (sp=EgIwAQ%253D%253D), scrapes
 * results via camofox /tabs + /links, then verifies license/duration with yt-dlp
 * before persisting to FreeVideoSource.
 */
import { execFile } from 'child_process'
import { promisify } from 'util'
import { prisma } from '../../prisma'

const execAsync = promisify(execFile)
const CAMOFOX = process.env.CAMOFOX_URL || 'https://camofox.hostamar.com'
const USER_ID = 'tv-hunter-tool'
const YT_DLP = process.env.HOME + '/.local/bin/yt-dlp'

// 6 products x 4 queries each — AUDIENCE-FOCUSED (Daraz seller, BD SME, not generic/Perl)
export const PRODUCT_QUERIES: Record<string, string[]> = {
  Video: ['Daraz product video tutorial Bangla', 'Facebook Reels fashion video tutorial', 'Eid collection marketing video', 'Saree 3-piece product photography'],
  Hosting: ['WordPress e-commerce website tutorial Bangla', 'How to make website for small business Bangla', 'Domain hosting Bangla tutorial'],
  Chat: ['Messenger auto reply tutorial Bangla small business', 'Facebook page auto reply', 'AI chatbot for shop'],
  Browser: ['Daraz price tracking automation', 'Browser automation for marketers Bangla', 'How to automate Facebook posts'],
  IDE: ['VS Code tutorial Bangla beginners', 'JavaScript tutorial Bangla for e-commerce', 'Free website hosting for students Bangla', 'WordPress PHP tutorial Bangla'],
  Gaming: ['Free Fire tournament hosting Bangla', 'Game server hosting tutorial Bangladesh', 'PUBG tournament how to organize'],
}

const CC_SP = 'sp=EgIwAQ%253D%253D' // double-encoded YouTube CC filter

export interface HuntResult {
  ok: boolean
  product: string
  query?: string
  inserted: number
  candidates?: Array<{ title: string; url: string; videoId: string; license?: string }>
  error?: string
}

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

/** Scrape top YouTube CC search results via camofox (browser automation, not HTTP). */
export async function scrapeYouTubeCC(query: string): Promise<Array<{ title: string; url: string; videoId: string }>> {
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&${CC_SP}`
  const tab = await camofoxPost('/tabs', { userId: USER_ID, sessionKey: 'hunt-' + Date.now(), url: searchUrl })
  const tabId = tab?.tabId
  if (!tabId) return []
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
    if (!text || text.length < 15 || /^\d+:\d+/.test(text) || /^Watch\b/.test(text) || /Now playing/.test(text)) continue
    seen.add(videoId)
    out.push({ title: text.slice(0, 150), url: `https://www.youtube.com/watch?v=${videoId}`, videoId })
    if (out.length >= 6) break
  }
  try { await fetch(`${CAMOFOX}/tabs/${tabId}?userId=${USER_ID}`, { method: 'DELETE', signal: AbortSignal.timeout(10000) as any }) } catch {}
  return out
}

function isCC(license: string): boolean {
  const l = (license || '').toLowerCase()
  return l.includes('creative commons') || l === 'cc0' || l.includes('public domain')
}

/** Verify license/meta via yt-dlp; only true CC passes. */
export async function verifyCC(videoId: string): Promise<{ license: string; views: number; duration: number; title: string } | null> {
  try {
    const { stdout } = await execAsync(YT_DLP, ['--dump-json', '--no-warnings', `https://www.youtube.com/watch?v=${videoId}`], { timeout: 60000, maxBuffer: 20 * 1024 * 1024 } as any)
    const j = JSON.parse(String(stdout))
    return { license: j.license || 'unknown', views: j.view_count || 0, duration: j.duration || 0, title: j.title || '' }
  } catch { return null }
}

/**
 * THE TOOL: search YouTube CC for one product/query, verify, persist.
 * Idempotent (dedupes by url). Returns what was inserted.
 */
export async function browser_search_youtube_cc(product: string, query: string, opts?: { maxInsert?: number }): Promise<HuntResult> {
  const maxInsert = opts?.maxInsert ?? 1
  try {
    if (!PRODUCT_QUERIES[product]) return { ok: false, product, inserted: 0, error: `unknown product ${product}` }
    const results = await scrapeYouTubeCC(query)
    let inserted = 0
    const saved: Array<{ title: string; url: string; videoId: string; license?: string }> = []
    for (const r of results) {
      if (inserted >= maxInsert) break
      const existing = await prisma.freeVideoSource.findUnique({ where: { url: r.url } }).catch(() => null)
      if (existing) continue
      const meta = await verifyCC(r.videoId)
      if (!meta || !isCC(meta.license)) continue
      if (meta.duration > 600 || meta.duration < 20) continue
      const viralScore = Math.min(10, Math.log10(Math.max(meta.views, 1)) + 3)
      await prisma.freeVideoSource.create({
        data: { product, title: meta.title || r.title, url: r.url, videoId: r.videoId, license: meta.license, views: meta.views, duration: meta.duration, viralScore },
      })
      inserted++
      saved.push({ title: meta.title, url: r.url, videoId: r.videoId, license: meta.license })
    }
    return { ok: true, product, query, inserted, candidates: saved }
  } catch (e: any) {
    return { ok: false, product, query, inserted: 0, error: e?.message?.slice(0, 200) }
  }
}
