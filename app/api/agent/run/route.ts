import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  const { prompt } = await req.json().catch(() => ({}))
  const best = process.env.OMNI_BEST_MODEL || 'nvidia/meta/llama-3.2-11b-vision-instruct'
  // V51: Use fallback chain (kilo → edge) since PC-VPS tunnel isn't reachable from Vercel serverless.
  // When user is on their PC, /admin/chat calls omni.hostamar.com directly (zero cost).
  const EDGE_URL = process.env.EDGE_GATEWAY_URL || 'https://hostamar-ai-gateway.romelraisul.workers.dev/v1'
  const key = process.env.EDGE_INTERNAL_KEY || 'hostamar-edge-internal-2026-xK39m'
  try {
    const r = await fetch(`${EDGE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-key': key },
      body: JSON.stringify({ model: 'kilo-auto/free', messages: [{ role: 'user', content: prompt || 'Hello Agent Cloud' }], max_tokens: 300, thinking: { type: 'disabled' } }),
      signal: AbortSignal.timeout(8000),
    })
    const data = await r.json()
    const text = data.choices?.[0]?.message?.content
    if (!text) throw new Error('empty')
    return NextResponse.json({
      brand: 'hostamar.com',
      product: 'Agent Cloud $49/mo',
      model: 'kilo-auto/free (edge fallback)',
      result: text,
      note: 'PC-VPS omni.hostamar.com available when you are on your PC via /admin/chat',
    }, { headers: { 'Access-Control-Allow-Origin': '*' } })
  } catch (e: any) {
    return NextResponse.json({
      brand: 'hostamar.com',
      product: 'Agent Cloud $49/mo',
      result: 'Agent Cloud MVP is building. Your agent will: daily YouTube trend → video → Facebook post. Persistent container + cron + storage + memory + GPU for $49/mo.',
      employees: 'Nova Forge Harbor',
      error: e.message,
    }, { headers: { 'Access-Control-Allow-Origin': '*' } })
  }
}
