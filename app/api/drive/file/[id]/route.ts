export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { getTursoEdgeClient } from '@/lib/turso-edge'
import { verifyToken } from '@/lib/auth-utils'

// ponytail: GramJS does raw TCP for MTProto and workerd stubs `net` — even a
// dynamic import that EXECUTES crashes the isolate (CF 1102). So the same route
// file serves two runtimes, split by Host: the Vercel origin streams from
// Telegram, the Cloudflare Worker only authenticates and proxies to it.
// No second route file, no second deploy to keep in sync.
const ORIGIN_HOST = 'hostamar-build.vercel.app'

const isOrigin = (req: NextRequest) =>
  (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').endsWith(ORIGIN_HOST)

type Row = { id: string; fileName: string; fileSize: bigint; mimeType: string | null; telegramMessageId: number | null; chunkGroupId: string | null }

async function loadFile(id: string, ownerId: string | null, shareToken: string | null) {
  const client = getTursoEdgeClient()
  const rs = await client.execute({
    sql: `SELECT "id","ownerId","fileName","fileSize","mimeType","telegramMessageId","chunkGroupId","shareToken","shareTokenExpires"
          FROM "DriveFile" WHERE "id" = ? LIMIT 1`,
    args: [id],
  })
  const f = rs.rows[0] as Record<string, unknown> | undefined
  if (!f) return null
  const ownerOk = Boolean(ownerId && f.ownerId === ownerId)
  const exp = f.shareTokenExpires ? Date.parse(String(f.shareTokenExpires)) : 0
  const shareOk = Boolean(shareToken && f.shareToken === shareToken && exp > Date.now())
  if (!ownerOk && !shareOk) return null // IDOR-safe wording
  return f as unknown as Row & { shareToken: string | null }
}

async function rowsFor(f: Row & { shareToken: string | null }) {
  const client = getTursoEdgeClient()
  if (!f.chunkGroupId) return [f]
  const rs = await client.execute({
    sql: `SELECT "id","fileName","fileSize","mimeType","telegramMessageId","chunkGroupId","shareToken"
          FROM "DriveFile" WHERE "chunkGroupId" = ? ORDER BY "createdAt" ASC`,
    args: [f.chunkGroupId],
  })
  return (rs.rows as unknown as Row[]) ?? []
}

/** Origin path: real MTProto download. Only ever runs on Node. */
async function serveFromTelegram(req: NextRequest, f: Row & { shareToken: string | null }) {
  if (!(process.env.TG_API_ID && process.env.TG_API_HASH && process.env.TG_SESSION_STRING && process.env.TG_CHANNEL_ID)) {
    return NextResponse.json({ error: 'Drive storage backend not configured' }, { status: 503 })
  }
  const parts = await rowsFor(f)
  const totalSize = parts.reduce((a, p) => a + Number(p.fileSize), 0)
  const baseHeaders: Record<string, string> = {
    'Content-Type': f.mimeType || 'application/octet-stream',
    'Accept-Ranges': 'bytes',
    'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(f.fileName)}`,
    'Cache-Control': 'private, max-age=0, must-revalidate',
  }

  const m = req.headers.get('range')?.match(/bytes=(\d+)-(\d*)/)
  const start = m ? Number(m[1]) : 0
  const end = m ? (m[2] ? Math.min(Number(m[2]), totalSize - 1) : totalSize - 1) : totalSize - 1
  if (start >= totalSize || start > end) {
    return new NextResponse(null, { status: 416, headers: { 'Content-Range': `bytes */${totalSize}` } })
  }

  const { iterMessageBytes } = await import('@/lib/telegram/download')
  const collected: Buffer[] = []
  const want = end - start + 1

  if (m && parts.length === 1) {
    // Single message + Range: MTProto offset/limit pulls ONLY those bytes.
    let got = 0
    await iterMessageBytes(parts[0].telegramMessageId as number, (chunk) => {
      if (got < want) { collected.push(chunk); got += chunk.length }
    }, { offset: start, limit: want })
  } else if (m) {
    // Range spanning a chunk group: walk parts, skip what is before `start`.
    let pos = 0
    let emitted = 0
    for (const p of parts) {
      const partSize = Number(p.fileSize)
      if (pos + partSize <= start) { pos += partSize; continue }
      const within = Math.max(0, start - pos)
      await iterMessageBytes(p.telegramMessageId as number, (chunk, off) => {
        const abs = pos + off
        const from = Math.max(abs, start)
        const to = Math.min(abs + chunk.length - 1, end)
        if (from <= to && emitted < want) { collected.push(chunk.subarray(from - abs, to - abs + 1)); emitted += to - from + 1 }
      }, within ? { offset: within } : {})
      pos += partSize
      if (emitted >= want) break
    }
  } else {
    for (const p of parts) {
      await iterMessageBytes(p.telegramMessageId as number, (chunk) => { collected.push(chunk) })
    }
  }

  const slice = Buffer.concat(collected).subarray(0, m ? want : undefined)
  return new NextResponse(new Uint8Array(slice), {
    status: m ? 206 : 200,
    headers: {
      ...baseHeaders,
      ...(m ? { 'Content-Range': `bytes ${start}-${end}/${totalSize}` } : {}),
      'Content-Length': String(slice.length),
    },
  })
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const shareToken = req.nextUrl.searchParams.get('token')
    const cookie = req.cookies.get('auth_token')?.value
    const payload = cookie ? verifyToken(cookie) : null
    const ownerId = payload?.id ? String(payload.id) : null

    if (isOrigin(req)) {
      const f = await loadFile(id, ownerId, shareToken)
      if (!f) return NextResponse.json({ error: 'Not found for this account' }, { status: 404 })
      return serveFromTelegram(req, f)
    }

    // Worker: authenticate the owner, mint a 1h share token, proxy to origin.
    if (!ownerId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const f = await loadFile(id, ownerId, null)
    if (!f) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const client = getTursoEdgeClient()
    const bytes = new Uint8Array(24)
    crypto.getRandomValues(bytes)
    const token = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
    await client.execute({
      sql: `UPDATE "DriveFile" SET "shareToken" = ?, "shareTokenExpires" = ? WHERE "id" = ? AND "ownerId" = ?`,
      args: [token, new Date(Date.now() + 3600_000).toISOString(), id, ownerId],
    })

    const headers: Record<string, string> = {}
    const range = req.headers.get('range')
    if (range) headers['Range'] = range
    // No cookie forwarded — the share token is the credential.
    const res = await fetch(`https://${ORIGIN_HOST}/api/drive/file/${id}?token=${encodeURIComponent(token)}`, {
      headers, redirect: 'manual',
    })
    if (!res.ok) {
      return NextResponse.json({ error: (await res.text()).slice(0, 300) }, { status: res.status })
    }
    const out = new NextResponse(res.body, { status: res.status })
    const pass = new Set([
      'content-type', 'content-range', 'content-length', 'content-disposition',
      'accept-ranges', 'cache-control',
    ])
    res.headers.forEach((v, k) => { if (pass.has(k.toLowerCase())) out.headers.set(k, v) })
    return out
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Drive download failed', detail: String(e?.message || e).slice(0, 200) },
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

    const f = await loadFile(id, ownerId, null)
    if (!f) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const parts = await rowsFor(f)

    if (isOrigin(req)) {
      if (process.env.TG_API_ID && process.env.TG_CHANNEL_ID) {
        try {
          const { deleteMessages } = await import('@/lib/telegram/download')
          await deleteMessages(parts.map((p) => p.telegramMessageId as number).filter(Boolean))
        } catch { /* best-effort revoke; the row delete is the source of truth */ }
      }
      await getTursoEdgeClient().execute({
        sql: `DELETE FROM "DriveFile" WHERE "id" IN (${parts.map(() => '?').join(',')}) AND "ownerId" = ?`,
        args: [...parts.map((p) => p.id), ownerId],
      })
      return NextResponse.json({ ok: true })
    }

    const res = await fetch(`https://${ORIGIN_HOST}/api/drive/file/${id}`, {
      method: 'DELETE', headers: { Cookie: req.headers.get('cookie') || '' },
    })
    const txt = await res.text()
    try { return NextResponse.json(JSON.parse(txt), { status: res.status }) }
    catch { return NextResponse.json({ error: txt }, { status: res.status }) }
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Drive delete failed', detail: String(e?.message || e).slice(0, 200) },
      { status: 500 },
    )
  }
}