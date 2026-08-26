import { NextRequest } from 'next/server'
export const dynamic = 'force-dynamic'
export const maxDuration = 10
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) return Response.json({ error: 'NO_KEY' }, { status: 500 })

  const r = await fetch('https://openrouter.ai/api/v1/models?limit=1', {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(8000),
    cache: 'no-store',
  })
  const body = await r.text().catch(() => '')
  return Response.json({ ok: r.ok, status: r.status, bodyLen: body.length, starts: body.slice(0, 80) })
}
