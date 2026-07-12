// ============================================================================
// POST /api/voice-token — short-lived LiveKit access token (server-only).
//
// Layer 2 of the prod voice stack: the browser NEVER sees LIVEKIT_API_KEY /
// LIVEKIT_API_SECRET. It authenticates with us, we mint a 1-hour JWT scoped to
// a single room, and return only { rtc_url, token, expires_in }.
// ============================================================================
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { hasAccess } from '@/lib/subscription'
import { checkRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rate-limit'
import { AccessToken } from 'livekit-server-sdk'

export const runtime = 'nodejs'

const LIVEKIT_URL_PUBLIC = process.env.LIVEKIT_URL || 'wss://voice.hostamar.com'
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || ''
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || ''
const TOKEN_TTL_SECONDS = Number(process.env.VOICE_TOKEN_TTL_SECONDS || 3600)

export async function POST(req: NextRequest) {
  const t0 = Date.now()
  // Secrets must exist server-side; never return them.
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    return NextResponse.json({ error: 'voice not configured' }, { status: 503 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Reuse the shared subscription gate — Voice is Chat's voice mode, so it
  // follows the ai-chat product access rule.
  const sub = (session as any).subscription
  if (sub && !hasAccess(sub, 'ai-chat')) {
    return NextResponse.json({ error: 'no voice access' }, { status: 403 })
  }

  // Rate-limit: 10/min per user (per spec). Keyed by bucket + ip.
  const ip = getClientIp(req)
  const rl = await checkRateLimit(ip, RATE_LIMITS.voiceToken, '/api/voice-token', 'POST')
  if (!rl.allowed) {
    return NextResponse.json({ error: 'rate limited' }, { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } })
  }

  const body = await req.json().catch(() => ({}))
  const room = String(body.room || `voice-${session.user.email}`).slice(0, 64)
  const identity = `user-${session.user.email}`.slice(0, 64)

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity,
    ttl: TOKEN_TTL_SECONDS,
  })
  at.addGrant({
    roomJoin: true,
    room,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  })
  const token = at.toJwt()

  console.log('[voice-token] minted', { room, ms: Date.now() - t0 })
  return NextResponse.json(
    { rtc_url: LIVEKIT_URL_PUBLIC, token, expires_in: TOKEN_TTL_SECONDS, room },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
