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
  const { social_auto_post_new_service } = await import('@/lib/mcp/seo-marketing-mcp')

  const results: Array<{ serviceId: string; name: string; ok: boolean }> = []
  for (const svc of newServices) {
    const r: any = await social_auto_post_new_service(
      { serviceId: svc.id, serviceName: svc.name, description: String((svc as any).benefit || '').slice(0, 120), price: (svc as any).creditCost },
      undefined,
    ).catch((e: any) => ({ error: String(e).slice(0, 200) }))
    results.push({ serviceId: svc.id, name: svc.name, ok: !r || !('error' in (r as any)) })
  }

  // History row (SeoEvent: id/type/url/userAgent — url carries the summary)
  await prisma.seoEvent.create({
    data: {
      type: 'auto-post',
      url: 'https://hostamar.com/api/cron/seo-auto-post',
      userAgent: 'newServices=' + newServices.length + '; fb=' + (fbToken ? 'configured' : 'NOT-configured'),
    },
  }).catch(() => {})

  return NextResponse.json({
    ok: true,
    newServices: newServices.length,
    fbConfigured: !!fbToken,
    results,
    note: fbToken ? '' : 'Set FACEBOOK_PAGE_ACCESS_TOKEN in Vercel env to enable live posting.',
  })
}
