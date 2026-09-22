import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  const { prompt } = await req.json().catch(() => ({}))
  const best = process.env.OMNI_BEST_MODEL || 'nvidia/meta/llama-3.2-11b-vision-instruct'
  try {
    const r = await fetch('https://omni.hostamar.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer sk-hostamar-wsl-2026' },
      body: JSON.stringify({ model: best, messages: [{ role: 'user', content: prompt || 'Hello Agent Cloud' }], max_tokens: 300 }),
      signal: AbortSignal.timeout(8000),
    })
    const data = await r.json()
    return NextResponse.json({
      brand: 'hostamar.com',
      product: 'Agent Cloud $49/mo',
      model: best,
      result: data.choices?.[0]?.message?.content,
      pc_vps: 'omni.hostamar.com LIVE',
    }, { headers: { 'Access-Control-Allow-Origin': '*' } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, fallback: 'Upstash cache good-models 9 + Fleet 19 employees' })
  }
}
