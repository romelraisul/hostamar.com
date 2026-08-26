import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { chatRateFor } from '@/lib/pricing'
import { getBinanceRate } from '@/lib/binance'
import { deductCredits } from '@/lib/credits'

export const dynamic = 'force-dynamic'
export const maxDuration = 10
export const runtime = 'nodejs'

/**
 * POST /api/chat
 * Proxies to OpenRouter, counts tokens, deducts credits via shared lib.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const key = process.env.OPENROUTER_API_KEY
    if (!key) return Response.json({ error: 'OPENROUTER_API_KEY missing' }, { status: 500 })

    const body = await req.json().catch(() => null)
    if (!body) return Response.json({ error: 'Invalid JSON' }, { status: 400 })
    const model: string = (body.model || '').replace(/\s*\[.*?\]\s*$/, '').trim() || 'openai/gpt-4o-mini'
    const messages: Array<{ role: string; content: string }> = Array.isArray(body.messages) ? body.messages : []
    if (!messages.length) return Response.json({ error: 'messages[] required' }, { status: 400 })

    const rate = chatRateFor(model)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    const upRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
        'HTTP-Referer': 'https://hostamar.com',
        'X-Title': 'Hostamar AI Chat',
      },
      body: JSON.stringify({ model, messages, stream: false, max_tokens: 256 }),
      signal: controller.signal,
      cache: 'no-store',
    }).catch((e: any) => ({ ok: false, status: 0, text: () => Promise.resolve(e?.message || 'fetch failed') } as any))
    clearTimeout(timer)

    if (!upRes.ok) {
      const t = await upRes.text?.() || ''
      return Response.json({ error: { message: `upstream ${upRes.status}`, body: String(t).slice(0, 200) } }, { status: 502 })
    }
    const data = await upRes.json()
    const reply: string = data?.choices?.[0]?.message?.content || ''
    const p = Number(data?.usage?.prompt_tokens || 0)
    const c = Number(data?.usage?.completion_tokens || 0)
    const costTaka = Math.round((((p + c) / 1000) * rate) * 100) / 100

    const deduct = await deductCredits(user.id, -costTaka, 'chat', `${model} ${p}+${c} tokens`)

    const usdtBdt = (await getBinanceRate()).usdtBdt
    return Response.json({
      reply, model, costTaka,
      costUsd: Math.round((costTaka / usdtBdt) * 100) / 100,
      tokens: { p, c }, rate,
      creditsRemaining: deduct.ok ? deduct.creditsRemaining : 0,
      insufficient: deduct.ok === false && deduct.error === 'INSUFFICIENT_CREDITS',
      usdtBdt,
    }, { status: deduct.ok ? 200 : 402 })
  } catch (e: any) {
    return Response.json({ error: { message: e?.message || 'Internal error' } }, { status: 500 })
  }
}
