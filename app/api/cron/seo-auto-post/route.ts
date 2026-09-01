export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/cron/seo-auto-post — daily SEO + social auto-post.
 * Auth: x-vercel-cron header OR Bearer/?secret= CRON_SECRET (fail-closed like V18).
 *
 * What it does:
 *  1. Finds AI services created in the last 24h (ServiceCatalog newer than cutoff)
 *  2. For each: queue a social_auto_post_new_service MCP call (FB + IG)
 *     (today returns UNAUTHENTICATED until FACEBOOK_PAGE_ACCESS_TOKEN is set in
 *      Vercel env — the cron still runs green and reports what it WOULD post)
 *  3. Records a SeoEvent row for history (same table seo-sync uses)
 */
const CRON_SECRET = process.env.CRON_SECRET || ''

// V22 TOP-10 services for the auto-blog (REAL catalog ids, grounded from the
// live 106 — the spec's list was 90% phantom ids). Prices/discounts from the
// live catalog API (tiers.basic / hostamarDiscountPct).
const TOP10_SERVICES = [
  { id: 'voiceover', name: 'Voiceover Bangla', price: 500, discount: 79, keywords: ['bangla voiceover', 'bangla voiceover ai', 'ai voiceover bangladesh', 'voiceover bangladesh', 'bangla tts', 'bangla voice generator', 'bangla ai voice', 'bangla voiceover service', 'bangla voiceover price', 'hostamar voiceover'] },
  { id: 'logo-design', name: 'Logo Design', price: 400, discount: 83, keywords: ['logo design', 'logo design bangladesh', 'ai logo design', 'logo maker', 'business logo', 'brand logo', 'cheap logo design', 'professional logo', 'logo design price', 'hostamar logo'] },
  { id: 'product-demo', name: 'Product Demo Video', price: 1440, discount: 95, keywords: ['product demo video', 'ai demo video', 'product video bangladesh', 'saas demo video', 'demo video maker', 'product demo ai', 'demo video price', 'hostamar demo'] },
  { id: 'content-repurpose', name: 'Content Repurposing', price: 1440, discount: 88, keywords: ['content repurposing', 'repurpose content', 'blog to social posts', 'content automation', 'repurpose ai', 'content repurposing bangladesh', 'hostamar repurpose'] },
  { id: 'social-automation', name: 'Social Automation Plan', price: 1440, discount: 94, keywords: ['social automation', 'n8n automation', 'zapier alternative', 'social media automation', 'automation blueprint', 'social automation bangladesh', 'hostamar automation'] },
  { id: 'website-to-app', name: 'Website to App', price: 1920, discount: 97, keywords: ['website to app', 'web to app', 'pwa wrapper', 'convert website to app', 'website to app bangladesh', 'hostamar web to app'] },
  { id: 'seo-audit', name: 'SEO Audit', price: 500, discount: 99, keywords: ['seo audit', 'seo audit bangladesh', 'on page seo audit', 'seo audit service', 'seo fixes list', 'cheap seo audit', 'hostamar seo audit'] },
  { id: 'logo-animation', name: 'Logo Animation', price: 1440, discount: 88, keywords: ['logo animation', 'animated logo', 'logo intro video', 'animated logo maker', 'logo animation ai', 'logo animation bangladesh', 'hostamar logo animation'] },
  { id: 'translation', name: 'Translation EN-BN', price: 200, discount: 96, keywords: ['bangla translation', 'english to bangla translation', 'bangla to english', 'translation service bangladesh', 'ai translation bangla', 'hostamar translation'] },
  { id: 'chatbot-script', name: 'Chatbot Script', price: 1920, discount: 89, keywords: ['chatbot script', 'chatbot flow', 'bot script writing', 'intent flow design', 'chatbot script ai', 'chatbot script bangladesh', 'hostamar chatbot'] },
]

export async function GET(req: NextRequest) {
  const isVercelCron = req.headers.get('x-vercel-cron') === '1' || req.headers.get('x-vercel-cron') === 'true'
  if (!isVercelCron && CRON_SECRET) {
    const auth = req.headers.get('authorization') || ''
    const q = new URL(req.url).searchParams.get('secret') || ''
    if (auth !== 'Bearer ' + CRON_SECRET && q !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized cron' }, { status: 401 })
    }
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const newServices = await prisma.serviceCatalog.findMany({
    where: { createdAt: { gte: cutoff }, isActive: true },
    take: 10,
  }).catch(() => [] as any[])

  const fbToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN || ''
  const { social_auto_post_new_service, seo_generate_blog_post } = await import('@/lib/mcp/seo-marketing-mcp')

  const results: Array<{ serviceId: string; name: string; ok: boolean }> = []
  const blogPosts: Array<{ slug: string; url: string }> = []

  // V21 AUTO-BLOG: for each new service, generate + persist a 1500-word SEO post
  // (BlogPost row — renders at /blog/{slug} via the dynamic [slug] page), then
  // queue it for Google Indexing. Anonymous cron context: no billing (free path).
  const { ensureSchema } = await import('@/lib/ensure-schema')
  await ensureSchema().catch(() => {})

  for (const svc of newServices) {
    const blog: any = await seo_generate_blog_post(
      {
        topic: 'Best ' + svc.name + ' AI in Bangladesh — 79% Cheaper Than Fiverr',
        keywords: [svc.name.toLowerCase(), (svc.name + ' ai').toLowerCase(), (svc.name + ' bangladesh').toLowerCase(), 'ai services bangladesh', 'hostamar'],
        serviceId: svc.id,
      },
      undefined,
    ).catch((e: any) => ({ error: String(e).slice(0, 200) }))

    let slug = ''
    if (blog && !('error' in blog) && blog.title) {
      slug = String(blog.title)
        .toLowerCase()
        .replace(/[^a-z0-9\u0980-\u09FF]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80)
      const content = typeof blog.content === 'string' ? blog.content : JSON.stringify(blog)
      try {
        await (prisma as any).blogPost.upsert({
          where: { slug },
          create: {
            slug,
            title: String(blog.title).slice(0, 200),
            excerpt: String(blog.metaDescription || '').slice(0, 200) || ('SEO guide for ' + svc.name),
            metaDescription: String(blog.metaDescription || '').slice(0, 200),
            keywords: (blog.keywords as string[]) || [],
            content: content.slice(0, 100_000),
            serviceId: svc.id,
          },
          update: { content: content.slice(0, 100_000), updatedAt: new Date() },
        })
        blogPosts.push({ slug, url: 'https://hostamar.com/blog/' + slug })
      } catch (e: any) { blogPosts.push({ slug: 'FAILED:' + String(e?.message || e).slice(0, 80), url: '' }) }
    }

    const r: any = await social_auto_post_new_service(
      { serviceId: svc.id, serviceName: svc.name, description: String((svc as any).benefit || '').slice(0, 120), price: (svc as any).creditCost },
      undefined,
    ).catch((e: any) => ({ error: String(e).slice(0, 200) }))
    results.push({ serviceId: svc.id, name: svc.name, ok: !r || !('error' in (r as any)) })
  }

  // V21 GSC PING: submit new blog URLs via the real Indexing API when the
  // service account is configured (GOOGLE_SERVICE_ACCOUNT_JSON — same one the
  // seo-sync cron and /api/seo/submit use). Bing sitemap ping (no key needed).
  let googlePing: any = 'skipped'
  let bingPing = 'skipped'
  if (blogPosts.length) {
    try {
      const { submitUrlsToGoogle } = await import('@/lib/google/indexingApi')
      const { hasGoogleServiceAccount } = await import('@/lib/google/auth')
      if (hasGoogleServiceAccount()) {
        googlePing = await submitUrlsToGoogle(blogPosts.map(b => b.url).filter(Boolean))
      } else {
        googlePing = 'GOOGLE_SERVICE_ACCOUNT_JSON missing (owner: see docs/v21-audit.md)'
      }
    } catch (e: any) { googlePing = String(e?.message || e).slice(0, 160) }
    try {
      const r = await fetch('https://www.bing.com/ping?sitemap=' + encodeURIComponent('https://hostamar.com/sitemap.xml'), { signal: AbortSignal.timeout(10000) })
      bingPing = 'HTTP ' + r.status
    } catch (e: any) { bingPing = String(e?.message || e).slice(0, 120) }
  }

  // V22 TOP-10 AUTO-BLOG (round-robin): generate up to 2 missing top-10 blog
  // posts per run — 60s serverless budget fits ~2 LLM posts (15-25s each with
  // the 15s race timeout); idempotent (skip existing slugs), converges over
  // daily runs. ?top10=true forces the pass; default daily runs include it.
  const wantTop10 = new URL(req.url).searchParams.get('top10') !== 'false'
  const top10Generated: Array<{ slug: string; service: string }> = []
  if (wantTop10) {
    const existing: Set<string> = new Set()
    try {
      const rows = await (prisma as any).blogPost.findMany({ select: { slug: true, serviceId: true } })
      for (const r of rows) { existing.add(r.slug); if (r.serviceId) existing.add('svc:' + r.serviceId) }
    } catch { /* table may not exist yet */ }

    let made = 0
    for (const svc of TOP10_SERVICES) {
      if (made >= 2) break // per-run budget
      if (existing.has('svc:' + svc.id)) continue // idempotent
      const blog: any = await seo_generate_blog_post(
        {
          topic: 'Best ' + svc.name + ' AI in Bangladesh — ' + svc.discount + '% Cheaper Than Fiverr',
          keywords: svc.keywords,
          serviceId: svc.id,
        },
        undefined,
      ).catch(() => null)
      if (blog && blog.title && blog.slug && String(blog.content || '').length > 300) {
        try {
          await (prisma as any).blogPost.upsert({
            where: { slug: blog.slug },
            create: {
              slug: blog.slug, title: String(blog.title).slice(0, 200),
              excerpt: String(blog.metaDescription || '').slice(0, 200) || ('SEO guide for ' + svc.name),
              metaDescription: String(blog.metaDescription || '').slice(0, 200),
              keywords: (blog.keywords as string[]) || [], content: String(blog.content).slice(0, 100_000),
              serviceId: svc.id,
            },
            update: { updatedAt: new Date() },
          })
          top10Generated.push({ slug: blog.slug, service: svc.id })
          blogPosts.push({ slug: blog.slug, url: 'https://hostamar.com/blog/' + blog.slug })
          made++
        } catch { /* upsert race — fine */ }
      }
    }

    // Google ping for newly generated top10 URLs
    if (top10Generated.length) {
      try {
        const { submitUrlsToGoogle } = await import('@/lib/google/indexingApi')
        const { hasGoogleServiceAccount } = await import('@/lib/google/auth')
        if (hasGoogleServiceAccount()) {
          googlePing = await submitUrlsToGoogle(blogPosts.map(b => b.url).filter(Boolean).slice(-4))
        } else {
          googlePing = 'GOOGLE_SERVICE_ACCOUNT_JSON missing (owner: docs/v22-audit.md)'
        }
      } catch (e: any) { googlePing = String(e?.message || e).slice(0, 160) }
    }
  }

  // History row (SeoEvent: id/type/url/userAgent — url carries the summary)
  await prisma.seoEvent.create({
    data: {
      type: 'auto-post',
      url: 'https://hostamar.com/api/cron/seo-auto-post',
      userAgent: 'newServices=' + newServices.length + '; blogs=' + blogPosts.length + '; top10=' + top10Generated.length + '; fb=' + (fbToken ? 'configured' : 'NOT-configured') + '; google=' + (typeof googlePing === 'string' ? googlePing.slice(0, 40) : 'submitted'),
    },
  }).catch(() => {})

  return NextResponse.json({
    ok: true,
    newServices: newServices.length,
    blogs: blogPosts,
    top10Generated,
    googlePing,
    bingPing,
    fbConfigured: !!fbToken,
    results,
    note: fbToken ? '' : 'Set FACEBOOK_PAGE_ACCESS_TOKEN in Vercel env to enable live posting.',
  })
}
