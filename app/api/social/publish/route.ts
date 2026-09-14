import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * Social publishing API — wraps Graph API / X API / YouTube Data API.
 * Pushes job to Cloudflare Worker Queue, PC keepalive picks up and executes.
 * Routes:
 *   POST /api/social/publish — { platform: 'facebook'|'x'|'youtube', message: string, mediaUrl?: string }
 */
/**
 * Shared-secret guard. The endpoint is listed in middleware publicApiPaths
 * (no cookie auth is possible for server-to-server callers), so it MUST
 * fail closed here — otherwise it is an unauthenticated open relay to the
 * Cloudflare Worker queue.
 *
 * Callers must send:  x-social-secret: <SOCIAL_PUBLISH_SECRET>
 * If SOCIAL_PUBLISH_SECRET is unset we fall back to the existing
 * FLEET_REPORT_SECRET (already provisioned in prod) so no new secret is
 * required to close the hole.
 */
function socialSecret(): string {
  return (process.env.SOCIAL_PUBLISH_SECRET || process.env.FLEET_REPORT_SECRET || '').trim()
}

function authorized(req: NextRequest): boolean {
  const secret = socialSecret()
  const provided = (req.headers.get('x-social-secret') || '').trim()
  return !!secret && provided === secret
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json(
      { error: 'unauthorized', hint: 'send header x-social-secret' },
      { status: 401 },
    )
  }

  const body = await req.json().catch(() => ({}))
  const { platform, message, mediaUrl } = body

  if (!platform || !message) {
    return NextResponse.json({ error: 'platform and message required' }, { status: 400 })
  }

  const WORKER_URL = process.env.WORKER_URL || 'https://hostamar-orchestrator.romelraisul.workers.dev'

  // Map platform to job type
  const jobTypeMap: Record<string, string> = {
    facebook: 'fb-post',
    x: 'x-post',
    twitter: 'x-post',
    youtube: 'yt-upload',
  }

  const jobType = jobTypeMap[platform]
  if (!jobType) {
    return NextResponse.json({ error: `Unknown platform: ${platform}` }, { status: 400 })
  }

  // Push to Cloudflare Worker queue
  const res = await fetch(`${WORKER_URL}/api/queue/push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: jobType,
      payload: { platform, message, mediaUrl },
    }),
  })

  const data = await res.json()
  return NextResponse.json({ ...data, platform, jobType })
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'Social publishing API',
    usage: 'POST { platform, message, mediaUrl? } with header x-social-secret',
    platforms: ['facebook', 'x', 'twitter', 'youtube'],
    auth: 'header x-social-secret (SOCIAL_PUBLISH_SECRET, falls back to FLEET_REPORT_SECRET)',
  })
}
