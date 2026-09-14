import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * Social publishing API — wraps Graph API / X API / YouTube Data API.
 * Pushes job to Cloudflare Worker Queue, PC keepalive picks up and executes.
 * Routes:
 *   POST /api/social/publish — { platform: 'facebook'|'x'|'youtube', message: string, mediaUrl?: string }
 */
export async function POST(req: NextRequest) {
  const body = await req.json()
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
    usage: 'POST { platform, message, mediaUrl? }',
    platforms: ['facebook', 'x', 'twitter', 'youtube'],
  })
}
