import { NextRequest } from 'next/server'
export const dynamic = 'force-dynamic'
export const maxDuration = 10

export async function GET(req: NextRequest) {
  const key = process.env.OPENROUTER_API_KEY
  // not configured != broken: 501 keeps the endpoint honest without a 5xx-500 error
  if (!key) return Response.json({ error: 'NO_KEY', detail: 'OPENROUTER_API_KEY is not set on this deployment' }, { status: 501 })

  const body = JSON.stringify({ model: 'openai/gpt-4o-mini', messages: [{role:'user',content:'hi'}], max_tokens: 5, stream: false })
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, 'HTTP-Referer': 'https://hostamar.com', 'X-Title': 'Hostamar' },
    body,
    signal: AbortSignal.timeout(8000),
    cache: 'no-store',
  })
  const text = await r.text().catch(() => '')
  return Response.json({ ok: r.ok, status: r.status, bodyLen: text.length, starts: text.slice(0, 150) })
}
