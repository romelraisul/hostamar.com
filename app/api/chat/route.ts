import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { chatRateFor } from '@/lib/pricing'
import { getBinanceRate } from '@/lib/binance'
import { deductCredits } from '@/lib/credits'
import { ROUTE_MAP } from '@/lib/gateway/95-models'
import { isFree } from '@/lib/gateway/filter'

const FALLBACK_MODEL = 'minimax/minimax-m3:free'

export const dynamic = 'force-dynamic'
export const maxDuration = 10 // Vercel hobby cap
export const runtime = 'nodejs'

/**
 * POST /api/chat
 * Routes through the SAME free-gateway logic as /api/v1/chat/completions
 * (kilo | opencode | openrouter | nvidia per generated ROUTE_MAP), then
 * deducts credits via shared lib. Zero cost: paid models hard-blocked on
 * free gateways.
 */
/**
 * Chat routing (2026-08-26): Kilo is the only FUNDED free-tier gateway right now
 * (opencode zen rejects most ids; OpenRouter key has 0 credits). All :free
 * models route to Kilo first; paid-model errors trigger the minimax fallback.
 */
function getProvider(model: string): { base: string; key?: string; provider: string } {
  // Everything free goes to Kilo — it accepts openrouter-style ids directly.
  if (isFree(model) || model.endsWith(':free')) {
    return { base: process.env.KILOCODE_BASE_URL || 'https://api.kilo.ai/api/gateway', key: process.env.KILOCODE_API_KEY, provider: 'kilo' }
  }
  switch (ROUTE_MAP[model]) {
    case 'nvidia':
      return { base: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1', key: process.env.NVIDIA_API_KEY, provider: 'nvidia' }
    default:
      return { base: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1', key: process.env.OPENROUTER_API_KEY, provider: 'openrouter' }
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => null)
    if (!body) return Response.json({ error: 'Invalid JSON' }, { status: 400 })

    // Accept display ids like "meituan/longcat-2.0-free [1M]" — strip ctx suffix
    const rawModel: string = body.model || 'meituan/longcat-2.0-free'
    const model = rawModel.replace(/\s*\[[^\]]*\]\s*$/, '').trim() || rawModel.trim()
    const messages: Array<{ role: string; content: string }> = Array.isArray(body.messages) ? body.messages : []
    if (!messages.length) return Response.json({ error: 'messages[] required' }, { status: 400 })

    const prov = getProvider(model)

    // Zero-cost rule: block paid models on free gateways
    if (['kilo', 'opencode', 'tokenrouter'].includes(prov.provider) && !isFree(model)) {
      return Response.json({
        error: { message: `PAID_BLOCKED: ${model} is paid and ${prov.provider} is a free-only gateway`, code: 402 },
      }, { status: 402 })
    }
    if (!prov.key) {
      return Response.json({ error: { message: `gateway ${prov.provider} key missing` } }, { status: 500 })
    }

    const rate = chatRateFor(model)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 4000)
    const upRes = await fetch(`${prov.base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${prov.key}`,
        'HTTP-Referer': 'https://hostamar.com',
        'X-Title': 'Hostamar AI Chat',
      },
      body: JSON.stringify({ model, messages, stream: false, max_tokens: 256 }),
      signal: controller.signal,
      cache: 'no-store',
    }).catch((e: any) => ({ ok: false, status: 0, text: () => Promise.resolve(e?.message || 'fetch failed') } as any))
    clearTimeout(timer)

    // Free-tier resilience: if the chosen model fails upstream, fall back to a
    // proven free model (minimax-m3 on kilo) instead of hard-failing.
    let data: any = null
    if (!upRes.ok && model !== FALLBACK_MODEL) {
      console.warn(`[chat] ${model} failed (${upRes.status}), falling back to ${FALLBACK_MODEL}`)
      const fbProv = getProvider(FALLBACK_MODEL)
      const fb = new AbortController()
      const ftimer = setTimeout(() => fb.abort(), 4000)
      const fbRes = await fetch(`${fbProv.base}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${fbProv.key}`,
          'HTTP-Referer': 'https://hostamar.com',
        },
        body: JSON.stringify({
          model: FALLBACK_MODEL,
          messages,
          stream: false,
          max_tokens: 256,
        }),
        signal: fb.signal,
        cache: 'no-store',
      }).catch(() => null)
      clearTimeout(ftimer)
      if (fbRes?.ok) {
        data = await fbRes.json()
        data.__fallbackFrom = model
        data.__provider = fbProv.provider
      }
    }

    if (!data && !upRes.ok) {
      const t = await upRes.text?.() || ''
      return Response.json({ error: { message: `upstream ${upRes.status} (${prov.provider})`, body: String(t).slice(0, 200) } }, { status: 502 })
    }
    if (!data) {
      data = await upRes.json()
    }
    const reply: string = data?.choices?.[0]?.message?.content || ''
    const p = Number(data?.usage?.prompt_tokens || 0)
    const c = Number(data?.usage?.completion_tokens || 0)
    const costTaka = Math.round((((p + c) / 1000) * rate) * 100) / 100

    const deduct = await deductCredits(user.id, -costTaka, 'chat', `${model}${data.__fallbackFrom ? ` (fallback from ${data.__fallbackFrom})` : ''} ${p}+${c} tokens`)

    const usdtBdt = (await getBinanceRate()).usdtBdt
    return Response.json({
      reply, model: model === FALLBACK_MODEL || !data.__fallbackFrom ? model : FALLBACK_MODEL,
      provider: data.__provider || prov.provider,
      fallbackFrom: data.__fallbackFrom || undefined,
      costTaka,
      costUsd: Math.round((costTaka / usdtBdt) * 100) / 100,
      tokens: { p, c }, rate,
      creditsRemaining: deduct.ok ? deduct.creditsRemaining : 0,
      insufficient: !deduct.ok && deduct.error === 'INSUFFICIENT_CREDITS',
      usdtBdt,
    }, { status: deduct.ok ? 200 : 402 })
  } catch (e: any) {
    return Response.json({ error: { message: e?.message || 'Internal error' } }, { status: 500 })
  }
}
