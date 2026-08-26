import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { hasGoogleServiceAccount } from '@/lib/google/auth'
import { submitUrlsToGoogle } from '@/lib/google/indexingApi'
import { checkPreferredSourceEligibility } from '@/lib/google/searchConsole'
import { hasBingKey, submitUrlsToBing, bingSiteUrl } from '@/lib/bing/webmaster'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

function requireAdmin(req: NextRequest): { id: string; role?: string } | null {
  const token = req.cookies.get('auth_token')?.value
  if (!token) return null
  const payload = verifyToken(token)
  if (!payload) return null
  if (payload.role !== 'admin' && payload.role !== 'superadmin') return null
  return payload
}

/**
 * POST /api/seo/submit  (admin)
 * Body: { urls?: string[], inspect?: boolean }
 * - Submits URLs to Google Indexing API + Bing SubmitUrlBatch in parallel.
 * - With inspect:true, returns Preferred Source eligibility for each URL.
 * All keys from env; missing integrations are reported, never fatal.
 */
export async function POST(req: NextRequest) {
  const admin = requireAdmin(req)
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const urls: string[] = Array.isArray(body.urls) && body.urls.length ? body.urls : [`${process.env.NEXT_PUBLIC_SITE_URL || 'https://hostamar.com'}/blog`]

  // Parallel fan-out: Google + Bing (Promise.allSettled — one failure never blocks the other)
  const [googleSettled, bingSettled] = await Promise.allSettled([
    hasGoogleServiceAccount() ? submitUrlsToGoogle(urls) : Promise.resolve([{ url: '', ok: false, status: 0, detail: 'GOOGLE_SERVICE_ACCOUNT_JSON missing' }]),
    hasBingKey() ? submitUrlsToBing(urls) : Promise.resolve({ ok: false, status: 0, detail: 'BING_WEBMASTER_API_KEY missing' }),
  ])

  const google = googleSettled.status === 'fulfilled' ? googleSettled.value : [{ url: '', ok: false, status: 0, detail: String(googleSettled.reason) }]
  const bing = bingSettled.status === 'fulfilled' ? bingSettled.value : { ok: false, status: 0, detail: String(bingSettled.reason) }

  let eligibility:
    | Awaited<ReturnType<typeof checkPreferredSourceEligibility>>
    | { eligible: boolean; reason: string }
    | null = null
  if (body.inspect) {
    try {
      const first = urls[0]
      eligibility = await checkPreferredSourceEligibility(first)
    } catch (e: any) {
      eligibility = { eligible: false, reason: String(e?.message || e) }
    }
  }

  await prisma.seoEvent
    .createMany({
      data: [
        { type: 'seo_submit_google', url: urls.join(','), userAgent: `admin:${admin.id}` },
        { type: 'seo_submit_bing', url: urls.join(','), userAgent: `admin:${admin.id}` },
      ],
    })
    .catch(() => {})

  return Response.json({
    ok: true,
    submitted: { count: urls.length, siteUrl: bingSiteUrl() },
    google,
    bing,
    eligibility,
  })
}
