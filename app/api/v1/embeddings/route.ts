import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  const master = process.env.LITELLM_MASTER_KEY || ''
  if (master && auth !== `Bearer ${master}`) {
    return Response.json({ error: { message: 'Missing API key', code: 401 } }, { status: 401 })
  }
  let body: any
  try { body = await req.json() } catch { return Response.json({ error: { message: 'Invalid JSON' } }, { status: 400 }) }
  // proxy to openrouter for embeddings
  const base = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'
  const key = process.env.OPENROUTER_API_KEY
  if (!key) return Response.json({ error: { message: 'No OPENROUTER key' } }, { status: 500 })
  const res = await fetch(`${base}/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  return new Response(text, { status: res.status, headers: { 'Content-Type': 'application/json' } })
}
