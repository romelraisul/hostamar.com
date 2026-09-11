// /api/admin/second-brain — V55: proxy WHY-questions to the local second-brain
// query layer (127.0.0.1:3010/ask) when the site runs on the owner's PC
// (ai/comfy tunnels pattern); when unreachable (pure-Vercel context) fall
// back to serving the last synthesized wiki snapshot from Neon is NOT wired —
// instead we answer honestly that the local layer is offline.
// Also GET returns the second-brain storage snapshot (wiki page list +
// synthesis head) so the tab can render state without the query layer.
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const LOCAL_ASK = process.env.SECOND_BRAIN_ASK_URL || 'http://127.0.0.1:3010/ask'

async function isAdmin(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get('auth_token')?.value
  if (!token) return false
  const payload = verifyToken(token)
  return !!payload && (payload.role === 'admin' || payload.role === 'superadmin')
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  // Storage snapshot: wiki/synthesis files were synced into Neon? No — the
  // second brain is a LOCAL artifact. Report reachability + describe state.
  let askOnline = false
  try {
    const r = await fetch(LOCAL_ASK.replace('/ask', '/health'), { signal: AbortSignal.timeout(2500) })
    askOnline = r.ok
  } catch { /* not reachable from this runtime */ }
  return NextResponse.json({
    askOnline,
    askUrl: LOCAL_ASK,
    pipeline: 'SAGE nightly 12:05 cron → synthesize.mjs → wiki/ + synthesis.md',
    wikiPages: ['architecture', 'bug-patterns', 'feature-requests', 'meeting-decisions', 'security-guard'],
    note: askOnline
      ? 'Query layer reachable from this runtime.'
      : 'Query layer runs on the owner\u2019s PC (127.0.0.1:3010). Not reachable from this server runtime — ask locally via POST http://127.0.0.1:3010/ask or use CLI: python3 ~/harmes-workspace/server/dynamic_context.py "question" [--quality]',
  })
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }) }
  const q = String(body.q || '').slice(0, 2000)
  if (!q) return NextResponse.json({ error: 'missing q' }, { status: 400 })
  try {
    const r = await fetch(LOCAL_ASK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q }),
      signal: AbortSignal.timeout(30000),
    })
    if (!r.ok) throw new Error(`upstream ${r.status}`)
    const d = await r.json()
    return NextResponse.json({ q, answer: d.answer, source: 'local-second-brain' })
  } catch (e: unknown) {
    return NextResponse.json({
      q,
      answer: null,
      offline: true,
      hint: 'Second-brain query layer (127.0.0.1:3010) not reachable from this runtime. Run locally: python3 ~/harmes-workspace/server/dynamic_context.py "' + q.slice(0, 80) + '" --quality',
    })
  }
}
