export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { getTursoEdgeClient } from '@/lib/turso-edge'
import { verifyToken } from '@/lib/auth-utils'

// ponytail: GramJS (telegram) does raw TCP for MTProto and workerd stubs
// `net` — the module-init import alone crashes the isolate (CF 1102), so
// Telegram downloads can NEVER run on the Worker. The Vercel Node origin
// runs the same route fine (that is where the working downloads happened).
// This route mints a 1h share token and issues a 302 to the origin.
// The browser streams directly from Vercel (Node runtime, GramJS works).
const ORIGIN = 'https://hostamar-build.vercel.app'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const token = req.cookies.get('auth_token')?.value
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const payload = verifyToken(token)
    if (!payload?.id) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    const ownerId = String(payload.id)

    const client = getTursoEdgeClient()
    const rs = await client.execute({
      sql: `SELECT "id","ownerId" FROM "DriveFile" WHERE "id" = ? AND "ownerId" = ? LIMIT 1`,
      args: [id, ownerId],
    })
    if (!rs.rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Mint a 1h share token for this file so the origin can serve it.
    const bytes = new Uint8Array(24)
    crypto.getRandomValues(bytes)
    const shareToken = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
    const expires = new Date(Date.now() + 3600_000).toISOString()
    await client.execute({
      sql: `UPDATE "DriveFile" SET "shareToken" = ?, "shareTokenExpires" = ? WHERE "id" = ? AND "ownerId" = ?`,
      args: [shareToken, expires, id, ownerId],
    })

    const url = `${ORIGIN}/api/drive/file/${id}?token=${encodeURIComponent(shareToken)}`
    const headers: Record<string, string> = {}
    const range = req.headers.get('range')
    if (range) headers['Range'] = range
    // NO cookie — the share token is the credential. Forwarding the auth_token
    // cookie makes the origin re-auth as owner and mint yet another token.
    const res = await fetch(url, { headers, redirect: 'manual' })
    if (res.status === 302 || res.status === 301) {
      // Origin tried to hand off again — the token path is not being honoured.
      return NextResponse.json(
        { error: 'Drive handoff rejected by origin', status: res.status },
        { status: 502 },
      )
    }
    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: err.slice(0, 300) }, { status: res.status })
    }
    const out = new NextResponse(res.body, { status: res.status })
    const pass = new Set([
      'content-type', 'content-range', 'content-length', 'content-disposition',
      'accept-ranges', 'cache-control', 'etag', 'last-modified',
    ])
    res.headers.forEach((v, k) => {
      if (pass.has(k.toLowerCase())) out.headers.set(k, v)
    })
    return out
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Drive handoff failed', detail: String(e?.message || e).slice(0, 200) },
      { status: 500 },
    )
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const token = req.cookies.get('auth_token')?.value
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const payload = verifyToken(token)
    if (!payload?.id) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    const ownerId = String(payload.id)

    // DELETE is lightweight — proxy it.
    const res = await fetch(`${ORIGIN}/api/drive/file/${id}`, {
      method: 'DELETE',
      headers: { Cookie: req.headers.get('cookie') || '' },
    })
    const txt = await res.text()
    try {
      return NextResponse.json(JSON.parse(txt), { status: res.status })
    } catch {
      return NextResponse.json({ error: txt }, { status: res.status })
    }
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Drive delete failed', detail: String(e?.message || e).slice(0, 200) },
      { status: 500 },
    )
  }
}