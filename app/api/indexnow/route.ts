import { NextResponse } from 'next/server'
import { getTursoEdgeClient } from '@/lib/turso-edge'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hostamar.com'
const INDEXNOW_API = 'https://api.indexnow.org/indexnow'
const DEFAULT_BATCH_SIZE = 10
const MAX_RETRIES = 3
const BASE_DELAY_MS = 2000
const MAX_BATCHES_PER_REQUEST = 2
const CACHE_TTL_SECONDS = 3600

// KV cache for sitemap URLs (1 hour TTL)
let sitemapCache: { urls: string[]; timestamp: number } | null = null

// Base routes from sitemap.ts (static routes)
const BASE_ROUTES = [
  '', '/pricing', '/sovereign', '/bkash', '/faq', '/about', '/blog',
  '/docs', '/docs/bn', '/generate', '/hosting', '/products', '/products/ai-video',
  '/products/cloud-hosting', '/products/ai-chat', '/products/ai-browser',
  '/products/dev-ide', '/products/game', '/ai-chat', '/ai-browser',
  '/game', '/gallery', '/prompts', '/payment', '/subscription',
  '/contact', '/terms', '/privacy', '/refund', '/beta', '/ossu',
  '/ossu/curriculum', '/download', '/store', '/store/m3e-canvas',
  '/store/understand-anything', '/store/openseo', '/labs', '/coinlab',
  '/coinlab/coin/bitcoin', '/coinlab/coin/ethereum', '/coinlab/coin/bnb',
  '/coinlab/coin/solana', '/coinlab/coin/xrp', '/coinlab/coin/cardano',
  '/coinlab/coin/dogecoin', '/coinlab/coin/tron', '/coinlab/coin/polkadot',
  '/coinlab/coin/polygon', '/dev', '/showcase', '/dev/android', '/tv',
  '/bangla-llm'
]

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function submitBatch(urls: string[], key: string, attempt: number = 1): Promise<{ success: boolean; status: number; response: string }> {
  try {
    const res = await fetch(INDEXNOW_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: 'hostamar.com',
        key,
        keyLocation: `https://hostamar.com/${key}.txt`,
        urlList: urls
      })
    })
    const responseText = await res.text()
    
    if (res.status === 429 && attempt < MAX_RETRIES) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1)
      console.log(`[indexnow] 429 rate limited, retry ${attempt}/${MAX_RETRIES} after ${delay}ms`)
      await sleep(delay)
      return submitBatch(urls, key, attempt + 1)
    }
    
    return { success: res.ok, status: res.status, response: responseText }
  } catch (error) {
    if (attempt < MAX_RETRIES) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1)
      console.log(`[indexnow] error, retry ${attempt}/${MAX_RETRIES} after ${delay}ms:`, error)
      await sleep(delay)
      return submitBatch(urls, key, attempt + 1)
    }
    throw error
  }
}

async function getSitemapUrls(): Promise<string[]> {
  // Check cache first
  const now = Date.now()
  if (sitemapCache && (now - sitemapCache.timestamp) < CACHE_TTL_SECONDS * 1000) {
    console.log('[indexnow] Using cached sitemap URLs')
    return sitemapCache.urls
  }

  const urls: string[] = []

  // Base routes
  for (const path of BASE_ROUTES) {
    urls.push(`${SITE_URL}${path}`)
  }

  // Blog posts
  try {
    const { POSTS } = await import('@/lib/blog')
    for (const post of POSTS) {
      urls.push(`${SITE_URL}/blog/${post.slug}`)
    }
  } catch {
    // blog list unavailable
  }

  // SOP entries from content.json
  try {
    const content = (await import('@/lib/docs/content.json')).default
    for (const section of (content as any).sections || []) {
      if (section?.id && section?.title) {
        urls.push(`${SITE_URL}/docs/sops/${section.id}`)
      }
    }
  } catch {
    // content unavailable
  }

  // TV videos: TvVideoSeo JOIN FreeVideoSource WHERE status='ready' LIMIT 200
  try {
    const client = getTursoEdgeClient()
    const res = await client.execute(`
      SELECT tvs.slug
      FROM "TvVideoSeo" tvs
      JOIN "FreeVideoSource" fvs ON tvs."videoSourceId" = fvs.id
      ORDER BY tvs.updatedAt DESC
      LIMIT 200
    `)
    for (const row of res.rows) {
      urls.push(`${SITE_URL}/tv/watch/${String(row.slug)}`)
    }
  } catch (e: unknown) {
    console.warn('[indexnow] turso path failed:', String(e instanceof Error ? e.message : e).slice(0, 200))
    // Prisma fallback
    try {
      const { prisma } = await import('@/lib/prisma')
      const videos = await (prisma as any).tvVideoSeo.findMany({
        where: { videoSource: {} },
        select: { slug: true },
        orderBy: { updatedAt: 'desc' },
        take: 200,
      })
      for (const v of videos) {
        urls.push(`${SITE_URL}/tv/watch/${v.slug}`)
      }
    } catch (e2: unknown) {
      console.warn('[indexnow] prisma fallback failed:', String(e2 instanceof Error ? e2.message : e2).slice(0, 200))
    }
  }

  // Update cache
  sitemapCache = { urls, timestamp: now }
  console.log('[indexnow] Sitemap cache updated, URL count:', urls.length)

  return urls
}

function logBatch(batchNum: number, totalBatches: number, urls: string[], result: { success: boolean; status: number; response: string }) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    batch: batchNum,
    totalBatches,
    urlCount: urls.length,
    urls: urls.slice(0, 3),
    status: result.status,
    success: result.success,
    response: result.response.slice(0, 200)
  }
  console.log('[indexnow-batch]', JSON.stringify(logEntry))
  // In production: append to /var/log/hostamar/indexnow-batch.log
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const batchSize = parseInt(searchParams.get('batch') || String(DEFAULT_BATCH_SIZE), 10)
    const dryRun = searchParams.get('dryRun') === 'true'
    
    const urls = await getSitemapUrls()
    const key = process.env.INDEXNOW_KEY || '200'
    const chunks = chunkArray(urls, batchSize)
    
    if (dryRun) {
      return NextResponse.json({
        status: 'dry-run',
        totalUrls: urls.length,
        batchSize,
        totalBatches: chunks.length,
        batches: chunks.map((chunk, i) => ({
          batch: i + 1,
          urlCount: chunk.length,
          urls: chunk.slice(0, 3)
        }))
      })
    }
    
    // Process limited batches per request to avoid timeout
    const startBatch = parseInt(searchParams.get('startBatch') || '0', 10)
    const endBatch = Math.min(startBatch + MAX_BATCHES_PER_REQUEST, chunks.length)
    
    const results: Array<{ batch: number; success: boolean; status: number; response: string }> = []
    for (let i = startBatch; i < endBatch; i++) {
      const chunk = chunks[i]
      const result = await submitBatch(chunk, key)
      logBatch(i + 1, chunks.length, chunk, result)
      results.push({ batch: i + 1, success: result.success, status: result.status, response: result.response })
      
      // Small delay between batches
      if (i < endBatch - 1) {
        await sleep(BASE_DELAY_MS)
      }
    }
    
    const allSuccess = results.every(r => r.success)
    const failedBatches = results.filter(r => !r.success).length
    const hasMore = endBatch < chunks.length
    
    return NextResponse.json({
      status: hasMore ? 'partial' : (allSuccess ? 'completed' : 'partial'),
      totalUrls: urls.length,
      batchSize,
      totalBatches: chunks.length,
      processedBatches: results.length,
      startBatch: startBatch + 1,
      endBatch,
      successfulBatches: results.filter(r => r.success).length,
      failedBatches,
      hasMore,
      nextStartBatch: hasMore ? endBatch : undefined,
      results
    })
  } catch (error) {
    console.error('[indexnow] error:', error)
    return NextResponse.json(
      { error: 'Failed to submit to IndexNow', details: String(error) },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const batchSize = parseInt(searchParams.get('batch') || String(DEFAULT_BATCH_SIZE), 10)
    const dryRun = searchParams.get('dryRun') === 'true'
    
    const urls = await getSitemapUrls()
    const chunks = chunkArray(urls, batchSize)
    
    if (dryRun) {
      return NextResponse.json({
        status: 'dry-run',
        endpoint: '/api/indexnow',
        totalUrls: urls.length,
        batchSize,
        totalBatches: chunks.length,
        batches: chunks.map((chunk, i) => ({
          batch: i + 1,
          urlCount: chunk.length,
          urls: chunk.slice(0, 3)
        }))
      })
    }
    
    return NextResponse.json({
      status: 'ok',
      endpoint: '/api/indexnow',
      urlCount: urls.length,
      urls: urls.slice(0, 10)
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate sitemap URLs', details: String(error) },
      { status: 500 }
    )
  }
}