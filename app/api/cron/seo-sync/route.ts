import { NextRequest } from 'next/server'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { prisma } from '@/lib/prisma'
import { hasGoogleServiceAccount, getSearchConsoleSiteUrl } from '@/lib/google/auth'
import { getIndexingStatus } from '@/lib/google/searchConsole'
import { hasBingKey, getBingStats, bingSiteUrl } from '@/lib/bing/webmaster'
import { POSTS } from '@/lib/blog'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const CRON_SECRET = process.env.CRON_SECRET || ''

/**
 * Daily SEO sync cron:
 * - Inspects all blog posts in Google Search Console (index status)
 * - Fetches Bing crawl stats
 * - Writes a markdown report to /tmp/seo-reports/seo-YYYY-MM-DD.md
 *   (serverless-safe; local runs land next to the Windows temp reports dir when present)
 * - Persists a summary SeoEvent row for history
 *
 * Auth: x-vercel-cron header OR Bearer/?secret= CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const isVercelCron = req.headers.get('x-vercel-cron') === '1'
  if (!isVercelCron && CRON_SECRET) {
    const auth = req.headers.get('authorization') || ''
    const q = req.nextUrl.searchParams.get('secret') || ''
    if (auth !== `Bearer ${CRON_SECRET}` && q !== CRON_SECRET) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://hostamar.com').replace(/\/$/, '')
  const urls = POSTS.map((p) => `${site}/blog/${p.slug}`)
  const day = new Date().toISOString().slice(0, 10)

  const [gscSettled, bingSettled] = await Promise.allSettled([
    hasGoogleServiceAccount() ? getIndexingStatus(urls.slice(0, 10)) : Promise.resolve([]),
    hasBingKey() ? getBingStats() : Promise.resolve({ ok: false, detail: 'no key' }),
  ])

  const gsc = gscSettled.status === 'fulfilled' ? gscSettled.value : []
  const bing = bingSettled.status === 'fulfilled' ? bingSettled.value : { ok: false, detail: 'failed' }

  const indexed = gsc.filter((g) => g.indexed).length
  const lines = [
    `# SEO Daily Report ${day}`,
    '',
    `- Site: ${site}`,
    `- GSC siteUrl: ${getSearchConsoleSiteUrl()}`,
    `- Blog posts inspected: ${Math.min(urls.length, 10)} | indexed: ${indexed}`,
    ...gsc.map((g) => `  - ${g.url} -> ${g.verdict} (${g.coverageState}) canonical=${g.canonical}`),
    `- Bing (${bingSiteUrl()}): ${bing.ok ? 'crawl stats fetched' : `skipped/failed: ${bing.detail}`}`,
    '- Integrations: Google SA=' + hasGoogleServiceAccount() + ', Bing=' + hasBingKey(),
    '',
  ]
  const report = lines.join('\n')

  // Write report (best-effort; serverless FS is ephemeral)
  try {
    const dir = path.join(os.tmpdir(), 'ceo-automation', 'reports')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, `seo-${day}.md`), report)
  } catch {}

  await prisma.seoEvent
    .create({
      data: {
        type: 'seo_daily_sync',
        url: site,
        userAgent: `indexed:${indexed}/${Math.min(urls.length, 10)};bing:${bing.ok ? 'ok' : 'skip'}`,
      },
    })
    .catch(() => {})

  return Response.json({ ok: true, day, postsInspected: Math.min(urls.length, 10), indexed, bingOk: bing.ok })
}
