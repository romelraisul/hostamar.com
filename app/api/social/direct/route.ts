import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * POST /api/social/direct — PULSE marketing publisher.
 * Posts DIRECTLY from Vercel where the real X_/YOUTUBE_/REDDIT_ creds live
 * (encrypted env; local copies are stubs, CF-queue path is dead — jq parse
 * error under cron locale means the local runner NEVER executed a job).
 * Same fail-closed shared-secret guard as /api/social/publish: header
 * x-social-secret = SOCIAL_PUBLISH_SECRET || FLEET_REPORT_SECRET.
 *
 * Body: { platform: 'x'|'youtube'|'reddit', message: string,
 *         title?: string (reddit), videoUrl?: string (youtube mp4 to fetch+upload) }
 * Returns the platform's post ID/URL or a precise per-platform error.
 * NOTHING is queued: this route is synchronous, result is real or it failed.
 */
import crypto from 'crypto'

function socialSecret(): string {
  return (process.env.SOCIAL_PUBLISH_SECRET || process.env.FLEET_REPORT_SECRET || '').trim()
}
function authorized(req: NextRequest): boolean {
  const secret = socialSecret()
  const provided = (req.headers.get('x-social-secret') || '').trim()
  return !!secret && provided === secret
}

// ── X: OAuth 1.0a user-context POST /2/tweets ────────────────────────────────
function pct(s: string): string { return encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')) }
async function postToX(message: string) {
  const CK = process.env.X_API_KEY || '', CKS = process.env.X_API_SECRET || ''
  const AT = process.env.X_ACCESS_TOKEN || '', ATS = process.env.X_ACCESS_SECRET || ''
  if (!CK || !CKS || !AT || !ATS) return { ok: false, error: 'X creds not set' }
  if (message.length > 280) return { ok: false, error: 'message > 280 chars: ' + message.length }
  const url = 'https://api.twitter.com/2/tweets'
  const oauth: Record<string, string> = {
    oauth_consumer_key: CK, oauth_token: AT, oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: crypto.randomBytes(16).toString('hex'), oauth_version: '1.0',
  }
  // JSON body: only oauth_* params enter the signature base string.
  const sigBase = ['POST', pct(url), pct(Object.keys(oauth).sort().map(k => `${k}=${oauth[k]}`).join('&'))].join('&')
  const sig = crypto.createHmac('sha1', `${pct(CKS)}&${pct(ATS)}`).update(sigBase).digest('base64')
  const oauthSigned: Record<string, string> = { ...oauth, oauth_signature: sig }
  const header = 'OAuth ' + Object.keys(oauthSigned).sort().map(k => `${k}="${pct(oauthSigned[k])}"`).join(', ')
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: header, 'Content-Type': 'application/json', 'User-Agent': 'HostamarPulse/1.0' },
    body: JSON.stringify({ text: message }),
  })
  const body = await res.json().catch(() => ({} as any))
  if (res.status === 201 && body?.data?.id) {
    return { ok: true, id: body.data.id, url: 'https://x.com/i/web/status/' + body.data.id }
  }
  return { ok: false, status: res.status, error: JSON.stringify(body).slice(0, 300) }
}

// ── Reddit: OAuth password grant + submit ────────────────────────────────────
async function postToReddit(title: string, message: string, subreddit: string) {
  const CID = process.env.REDDIT_CLIENT_ID || '', CSEC = process.env.REDDIT_CLIENT_SECRET || ''
  const RU = process.env.REDDIT_USERNAME || '', RP = process.env.REDDIT_PASSWORD || ''
  if (!CID || !CSEC || !RU || !RP) return { ok: false, error: 'Reddit creds not set' }
  const tokRes = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(`${CID}:${CSEC}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'HostamarPulse/1.0' },
    body: new URLSearchParams({ grant_type: 'password', username: RU, password: RP }),
  })
  const tok = await tokRes.json().catch(() => ({} as any))
  if (!tok?.access_token) return { ok: false, status: tokRes.status, error: 'token: ' + JSON.stringify(tok).slice(0, 200) }
  const res = await fetch('https://oauth.reddit.com/api/submit', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tok.access_token}`, 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'HostamarPulse/1.0' },
    body: new URLSearchParams({ sr: subreddit, kind: 'self', title: title.slice(0, 300), text: message.slice(0, 40000) }),
  })
  const body = await res.json().catch(() => ({} as any))
  if (res.ok && (body?.json?.data?.id || body?.json?.data?.url)) {
    return { ok: true, id: body.json.data.id, url: body.json.data.url || `https://www.reddit.com${body.json.data.permalink || ''}` }
  }
  return { ok: false, status: res.status, error: JSON.stringify(body).slice(0, 300) }
}

// ── YouTube: refresh access token, fetch video, resumable upload ────────────
async function postToYouTube(videoUrl: string, title: string, description: string) {
  const CID = process.env.YOUTUBE_CLIENT_ID || '', CSEC = process.env.YOUTUBE_CLIENT_SECRET || ''
  const RT = process.env.YOUTUBE_REFRESH_TOKEN || ''
  if (!CID || !CSEC || !RT) return { ok: false, error: 'YouTube creds not set' }
  const tokRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CID, client_secret: CSEC, refresh_token: RT, grant_type: 'refresh_token' }),
  })
  const tok = await tokRes.json().catch(() => ({} as any))
  if (!tok?.access_token) return { ok: false, status: tokRes.status, error: 'token: ' + JSON.stringify(tok).slice(0, 200) }
  const vid = await fetch(videoUrl).catch(() => null)
  if (!vid || !vid.ok) return { ok: false, error: 'videoUrl fetch failed: ' + (vid ? vid.status : 'network') }
  const buf = Buffer.from(await vid.arrayBuffer())
  if (buf.length > 60 * 1024 * 1024) return { ok: false, error: 'video > 60MB: ' + buf.length }
  const initRes = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tok.access_token}`, 'Content-Type': 'application/json',
      'X-Upload-Content-Length': String(buf.length), 'Content-Length': '0',
    },
    body: JSON.stringify({ snippet: { title: title.slice(0, 100), description: description.slice(0, 5000), tags: description.match(/#\w+/g)?.slice(0, 10) }, status: { privacyStatus: 'public', selfDeclaredMadeForKids: false } }),
  })
  const uploadUrl = initRes.headers.get('location')
  if (!initRes.ok || !uploadUrl) return { ok: false, status: initRes.status, error: 'resumable init: ' + JSON.stringify(await initRes.json().catch(() => ({}))).slice(0, 300) }
  const upRes = await fetch(uploadUrl, {
    method: 'PUT', headers: { Authorization: `Bearer ${tok.access_token}`, 'Content-Type': 'video/mp4', 'Content-Length': String(buf.length) }, body: buf,
  })
  const up = await upRes.json().catch(() => ({} as any))
  if (upRes.ok && up?.id) return { ok: true, id: up.id, url: 'https://youtube.com/shorts/' + up.id }
  return { ok: false, status: upRes.status, error: JSON.stringify(up).slice(0, 300) }
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'unauthorized', hint: 'send header x-social-secret' }, { status: 401 })
  }
  const body = await req.json().catch(() => ({}))
  const { platform, message, title, videoUrl, subreddit } = body
  if (!platform || (!message && !videoUrl)) return NextResponse.json({ error: 'platform and message required' }, { status: 400 })
  try {
    if (platform === 'x') return NextResponse.json(await postToX(String(message)))
    if (platform === 'reddit') return NextResponse.json(await postToReddit(String(title || message.slice(0, 80)), String(message), String(subreddit || 'smallbusiness')))
    if (platform === 'youtube') return NextResponse.json(await postToYouTube(String(videoUrl), String(title || message.slice(0, 90)), String(message)))
    return NextResponse.json({ error: 'unknown platform ' + platform }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e).slice(0, 300) }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true, message: 'Direct social publisher (synchronous, real result or real error)',
    usage: 'POST { platform: x|youtube|reddit, message, title?, subreddit?, videoUrl? } header x-social-secret',
  })
}
