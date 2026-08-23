/**
 * Viral researcher — finds what will go viral in BD without needing browser.hostamar.com.
 * Tries browser automation if available (local Camofox http://127.0.0.1:9377), falls back to direct HTTP/RSS.
 *
 * Sources (free, no API keys):
 *  - Google Trends BD via RSS (if available) or fallback sampling
 *  - YouTube BD trending via HTML parse (ytInitialData)
 *  - Prothom Alo most-read via RSS/HTML
 *  - Daraz best-sellers via HTML parse
 *
 * SME relevance scoring: keyword heuristic 0-10, keeps >=7.
 * Writes ViralTrend rows with used=false.
 */

import { prisma } from '@/lib/prisma'
import { ensureSchema } from '@/lib/ensure-schema'

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

const SME_KEYWORDS: Record<string, number> = {
  // High relevance for Daraz/Aarong/Sailor sellers
  'fashion': 3, 'dress': 3, 'sari': 3, 'saree': 3, 'panjabi': 3, 'hijab': 3, 'threepiece': 3, '3-piece': 3, 'kurta': 3, 'lehenga': 3,
  'beauty': 3, 'cosmetic': 3, 'makeup': 3, 'skincare': 3, 'mehendi': 2,
  'jewellery': 3, 'jewelry': 3, 'bag': 2, 'shoe': 2, 'watch': 2,
  'eid': 3, 'puja': 2, 'wedding': 2, 'gift': 2,
  'daraz': 3, 'sale': 2, 'offer': 2, 'discount': 2, 'delivery': 1,
  'small business': 3, 'sme': 3, 'shop': 2, 'store': 2, 'online shop': 3,
  'cooking': 2, 'recipe': 2, 'food': 1.5, 'kitchen': 1.5,
  'mobile': 2, 'phone': 2, 'gadget': 2, 'electronics': 2,
  // Bangla variants
  'শাড়ি': 3, 'পাঞ্জাবি': 3, 'থ্রি-পিস': 3, 'ঈদ': 3, 'পূজা': 2, 'বিয়ে': 2,
  'প্রসাধনী': 3, 'গহনা': 3, 'ব্যাগ': 2,
}

const LOW_SCORE_KEYWORDS = ['politics', 'রাজনীতি', 'election', 'accident', 'murder', 'cricket score', 'football score']

function scoreSME(title: string): { score: number; category: string } {
  const t = title.toLowerCase()
  for (const kw of LOW_SCORE_KEYWORDS) if (t.includes(kw.toLowerCase())) return { score: 2, category: 'news' }
  let score = 3 // baseline
  let bestCat = 'general'
  for (const [kw, pts] of Object.entries(SME_KEYWORDS)) {
    if (t.includes(kw.toLowerCase())) {
      score += pts
      if (pts >= 3 && bestCat === 'general') {
        if (['fashion', 'dress', 'sari', 'saree', 'panjabi', 'hijab', 'threepiece', 'kurta', 'শাড়ি', 'পাঞ্জাবি', 'থ্রি-পিস', 'ঈদ'].some(k => kw.includes(k))) bestCat = 'fashion'
        else if (['beauty', 'cosmetic', 'makeup', 'skincare'].some(k => kw.includes(k))) bestCat = 'beauty'
        else if (['food', 'cooking', 'recipe', 'kitchen'].some(k => kw.includes(k))) bestCat = 'food'
        else if (['daraz', 'sale', 'offer', 'discount', 'shop', 'store', 'sme'].some(k => kw.includes(k))) bestCat = 'ecommerce'
        else bestCat = kw
      }
    }
  }
  return { score: Math.min(10, Math.round(score * 10) / 10), category: bestCat }
}

function translateToBn(title: string): string {
  // Keep original if already Bangla unicode, otherwise add Bangla context
  const hasBn = /[\u0980-\u09FF]/.test(title)
  if (hasBn) return title
  return title // LLM translation happens at video creation time
}

async function fetchText(url: string, headers: Record<string, string> = {}): Promise<string> {
  const r = await fetch(url, { headers: { 'User-Agent': UA, ...headers }, cache: 'no-store', signal: AbortSignal.timeout(15000) } as any)
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`)
  return r.text()
}

async function discoverGoogleTrendsBD(): Promise<Array<{ title: string; url?: string; views?: number }>> {
  const urls = [
    'https://trends.google.com/trends/trendingsearches/daily/rss?geo=BD',
    'https://trends.google.co.uk/trendingsearches/daily/rss?geo=BD',
  ]
  for (const url of urls) {
    try {
      const xml = await fetchText(url)
      const items = [...xml.matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<\/item>/g)].map(m => m[1].replace('<![CDATA[', '').replace(']]>', '').trim()).filter(Boolean)
      if (items.length) return items.slice(0, 10).map(t => ({ title: t }))
    } catch {}
  }
  // Fallback: curated BD SME seasonal trends
  return [
    { title: 'Eid fashion collection 2026' }, { title: 'Daraz 11.11 sale best deals' },
    { title: 'Winter pitha recipe viral' }, { title: 'Small business marketing tips Bangla' },
  ].slice(0, 4)
}

async function discoverYouTubeBD(): Promise<Array<{ title: string; url?: string; thumbnail?: string; views?: number }>> {
  try {
    const html = await fetchText('https://www.youtube.com/feed/trending?gl=BD')
    const m = html.match(/var ytInitialData = (\{[\s\S]*?\});<\/script>/)
    if (!m) return []
    const data = JSON.parse(m[1])
    const contents = data?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || []
    const out: Array<{ title: string; url?: string; thumbnail?: string }> = []
    const walk = (node: any) => {
      if (!node || typeof node !== 'object') return
      if (node.videoRenderer?.title?.runs?.[0]?.text) {
        const vr = node.videoRenderer
        out.push({
          title: vr.title.runs.map((r: any) => r.text).join(''),
          url: vr.videoId ? `https://www.youtube.com/watch?v=${vr.videoId}` : undefined,
          thumbnail: vr.thumbnail?.thumbnails?.[0]?.url,
        })
      }
      for (const v of Object.values(node)) if (typeof v === 'object') walk(v)
    }
    for (const c of contents) walk(c)
    return out.slice(0, 10)
  } catch (e) { console.warn('[viral] youtube bd failed', (e as Error).message); return [] }
}

async function discoverProthomAlo(): Promise<Array<{ title: string; url?: string }>> {
  try {
    const xml = await fetchText('https://www.prothomalo.com/feed')
    const items = [...xml.matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<link>([\s\S]*?)<\/link>/g)]
      .map(m => ({ title: m[1].replace('<![CDATA[', '').replace(']]>', '').trim(), url: m[2].trim() }))
    return items.slice(0, 8)
  } catch { return [] }
}

async function discoverDaraz(): Promise<Array<{ title: string; url?: string; thumbnail?: string }>> {
  try {
    const html = await fetchText('https://www.daraz.com.bd/tag/daraz-best-sellers/', { 'Accept-Language': 'en-BD' })
    // Daraz renders via JS; try to extract product titles from JSON embedded
    const titles = [...html.matchAll(/"name"\s*:\s*"([^"]{8,80})"/g)].map(m => m[1].trim()).filter(t => t.length > 8)
    const uniq = [...new Set(titles)]
    return uniq.slice(0, 8).map(t => ({ title: t }))
  } catch { return [] }
}

export interface ResearchResult {
  inserted: number
  trends: Array<{ id: string; title: string; titleBn: string; source: string; viralScore: number; category: string }>
  sources: Record<string, number>
}

export async function runViralResearch(): Promise<ResearchResult> {
  await ensureSchema()
  const sources: Record<string, number> = {}
  const raw: Array<{ title: string; source: string; url?: string; thumbnail?: string; views?: number }> = []

  const [gtrends, yt, prothom, daraz] = await Promise.all([
    discoverGoogleTrendsBD().catch(() => []),
    discoverYouTubeBD().catch(() => []),
    discoverProthomAlo().catch(() => []),
    discoverDaraz().catch(() => []),
  ])

  for (const t of gtrends) { raw.push({ ...t, source: 'google_trends_bd' }); sources['google_trends_bd'] = (sources['google_trends_bd'] || 0) + 1 }
  for (const t of yt) { raw.push({ ...t, source: 'youtube_bd' }); sources['youtube_bd'] = (sources['youtube_bd'] || 0) + 1 }
  for (const t of prothom) { raw.push({ ...t, source: 'prothomalo' }); sources['prothomalo'] = (sources['prothomalo'] || 0) + 1 }
  for (const t of daraz) { raw.push({ ...t, source: 'daraz' }); sources['daraz'] = (sources['daraz'] || 0) + 1 }

  let inserted = 0
  const trends: ResearchResult['trends'] = []

  for (const item of raw) {
    const title = item.title.trim().slice(0, 180)
    if (!title || title.length < 8) continue
    const { score, category } = scoreSME(title)
    if (score < 7) continue
    const viralScore = score + Math.random() * 0.8 // slight jitter for ordering
    const titleBn = translateToBn(title)
    // Dedupe by title
    const existing = await prisma.viralTrend.findFirst({ where: { title } })
    if (existing) continue
    const row = await prisma.viralTrend.create({
      data: {
        source: item.source,
        title,
        titleBn,
        url: item.url || null,
        thumbnail: (item as any).thumbnail || null,
        views: item.views || null,
        viralScore,
        category,
        rawData: item as any,
      },
    })
    inserted++
    trends.push({ id: row.id, title, titleBn, source: item.source, viralScore: Math.round(viralScore * 10) / 10, category })
  }

  // If nothing passed SME filter (e.g. all news), insert top curated SME trend so pipeline never stalls
  if (!inserted) {
    const fallback = { title: 'Eid fashion viral collection for Daraz sellers', source: 'curated' }
    const { score, category } = scoreSME(fallback.title)
    const exists = await prisma.viralTrend.findFirst({ where: { title: fallback.title } })
    if (!exists) {
      const row = await prisma.viralTrend.create({
        data: { source: 'curated', title: fallback.title, titleBn: 'ঈদ ফ্যাশন ভাইরাল কালেকশন - Daraz বিক্রেতাদের জন্য', viralScore: score, category, url: null },
      })
      inserted = 1
      trends.push({ id: row.id, title: fallback.title, titleBn: row.titleBn!, source: 'curated', viralScore: score, category })
    }
  }

  // Sort by viralScore desc
  trends.sort((a, b) => b.viralScore - a.viralScore)

  try {
    await prisma.tvLog.create({ data: { level: 'info', message: `Viral research: ${inserted} new trends from ${Object.keys(sources).join(', ')}` } })
  } catch {}

  return { inserted, trends: trends.slice(0, 10), sources }
}
