import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hostamar.com'

// Public, indexable routes only. EXCLUDES /admin, /dashboard, /api, auth, payment results.
const routes: { path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }[] = [
  { path: '', changeFrequency: 'daily', priority: 1.0 },
  { path: '/pricing', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/faq', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/blog', changeFrequency: 'daily', priority: 0.7 },
  // V21: docs hub is public + indexable (EN + বাংলা)
  { path: '/docs', changeFrequency: 'daily', priority: 0.9 },
  { path: '/docs/bn', changeFrequency: 'daily', priority: 0.8 },
  { path: '/generate', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/hosting', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/products', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/products/ai-video', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/products/cloud-hosting', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/products/ai-chat', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/products/ai-browser', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/products/dev-ide', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/products/game', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/ai-chat', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/ai-browser', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/game', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/gallery', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/prompts', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/payment', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/subscription', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/refund', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/beta', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/ossu', changeFrequency: 'weekly', priority: 0.5 },
  { path: '/ossu/curriculum', changeFrequency: 'weekly', priority: 0.5 },
  { path: '/download', changeFrequency: 'daily', priority: 0.9 },
  { path: '/dev', changeFrequency: 'daily', priority: 0.8 },
  { path: '/dev/android', changeFrequency: 'weekly', priority: 0.7 },
]

// ISR: re-check the DB hourly so newly SEO'd videos enter the sitemap
// without a full rebuild.
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const base = routes.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }))

  // V21: static blog posts from lib/blog.ts
  let blogEntries: MetadataRoute.Sitemap = []
  try {
    const { POSTS } = await import('@/lib/blog')
    blogEntries = POSTS.map((p2) => ({
      url: `${SITE_URL}/blog/${p2.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))
  } catch { /* blog list unavailable in build sandbox */ }

  // Every TV video SEOs itself: /tv/watch/{slug} entries from TvVideoSeo.
  let videoEntries: MetadataRoute.Sitemap = []
  try {
    const videos = await (prisma as any).tvVideoSeo.findMany({
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    })
    videoEntries = videos.map((v: { slug: string; updatedAt: Date }) => ({
      url: `${SITE_URL}/tv/watch/${v.slug}`,
      lastModified: v.updatedAt || now,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }))
  } catch (e1: any) {
    // V25: ORM path failed (observed on prebuilt deploy) — retry with raw SQL
    // so the sitemap never silently loses the 83 TV URLs again.
    console.warn('[sitemap] tvVideoSeo.findMany failed:', String(e1?.message || e1).slice(0, 200))
    try {
      const rows: any[] = await (prisma as any).$queryRawUnsafe('SELECT slug, "updatedAt" FROM "TvVideoSeo" ORDER BY "updatedAt" DESC LIMIT 200') as any[]
      videoEntries = (rows || []).map((v: any) => ({
        url: `${SITE_URL}/tv/watch/${v.slug}`,
        lastModified: v.updatedAt ? new Date(v.updatedAt) : now,
        changeFrequency: 'daily' as const,
        priority: 0.8,
      }))
    } catch (e2: any) {
      console.warn('[sitemap] raw SQL fallback failed:', String(e2?.message || e2).slice(0, 200))
    }
  }

  return [...base, ...blogEntries, ...videoEntries]
}
