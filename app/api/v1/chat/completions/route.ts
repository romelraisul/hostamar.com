import { NextRequest } from 'next/server'
import { shouldUseNvidia, markFail, markSuccess, retryWithBackoff, isBlocked } from '@/lib/gateway/nvidia-guard'
import { nvidiaGuardWithRanking, getFallbackForModel } from '@/lib/gateway/ranking-fallback'
import { isFree } from '@/lib/gateway/filter'
import { ROUTE_MAP } from '@/lib/gateway/95-models'

export const dynamic = 'force-dynamic'
export const maxDuration = 10 // Vercel hobby free tier limit

const OPENROUTER_BASE = () => process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'

/**
 * Deterministic routing from the generated catalog (ROUTE_MAP), falling back to
 * legacy heuristics for unknown ids. Routes: kilo | opencode | openrouter |
 * nvidia | hostamar-alias | ollama-local.
 */
function getProvider(model: string): { base: string; key: string | undefined; provider: string } {
  switch (ROUTE_MAP[model]) {
    case 'kilo':
      return { base: process.env.KILOCODE_BASE_URL || 'https://api.kilo.ai/api/gateway', key: process.env.KILOCODE_API_KEY, provider: 'kilo' }
    case 'opencode':
      return { base: process.env.OPENCODE_ZEN_BASE_URL || 'https://opencode.ai/zen/v1', key: process.env.OPENCODE_ZEN_API_KEY, provider: 'opencode' }
    case 'nvidia':
      return { base: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1', key: process.env.NVIDIA_API_KEY, provider: 'nvidia' }
    case 'openrouter':
    case 'hostamar-alias':
      return { base: OPENROUTER_BASE(), key: process.env.OPENROUTER_API_KEY, provider: 'openrouter' }
  }
  // legacy heuristic fallback (ids not yet in the generated catalog)
  const lower = model.toLowerCase()
  if (lower.endsWith(':free') && !lower.startsWith('opencode') && !lower.startsWith('kilocode') && !lower.startsWith('tokenrouter')) {
    return { base: OPENROUTER_BASE(), key: process.env.OPENROUTER_API_KEY, provider: 'openrouter' }
  }
  if (lower.startsWith('nvidia/')) {
    return { base: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1', key: process.env.NVIDIA_API_KEY, provider: 'nvidia' }
  }
  if (lower.includes('kilo') || lower.startsWith('kilo')) {
    return { base: process.env.KILOCODE_BASE_URL || 'https://api.kilo.ai/api/gateway', key: process.env.KILOCODE_API_KEY, provider: 'kilo' }
  }
  if (lower.includes('tokenrouter')) {
    return { base: process.env.TOKENROUTER_BASE_URL || 'https://tokenrouter.app/api/v1', key: process.env.TOKENROUTER_API_KEY, provider: 'tokenrouter' }
  }
  return { base: OPENROUTER_BASE(), key: process.env.OPENROUTER_API_KEY, provider: 'openrouter' }
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  const master = process.env.LITELLM_MASTER_KEY || ''
  if (master && auth !== `Bearer ${master}`) {
    return Response.json({ error: { message: 'Missing API key', code: 401 } }, { status: 401 })
  }

  let body: any
  try { body = await req.json() } catch { return Response.json({ error: { message: 'Invalid JSON' } }, { status: 400 }) }
  // Accept display ids like "moonshotai/kimi-k3 [1M]" — strip the context suffix
  const rawModel: string = body.model || 'moonshotai/kimi-k3'
  const model = rawModel.replace(/\s*\[[^\]]*\]\s*$/, '').trim() || rawModel.trim()
  body.model = model
  const messages: any[] = body.messages || []

  // free filter: block paid models on the free-only gateways (zero-cost rule)
  const prov = getProvider(model)
  if (['kilocode', 'kilo', 'tokenrouter', 'opencode'].includes(prov.provider) && !isFree(model) && !model.startsWith('hostamar-')) {
    return Response.json({ error: { message: `Model ${model} filtered: only :free allowed for ${prov.provider}`, code: 400 } }, { status: 400 })
  }

  // nvidia guard: live limits (nvidia docs via browser.hostamar.com) +
  // world-ranking fallback (glm→kimi-k3, circuit-open→top model)
  let activeModel = model
  if (prov.provider === 'nvidia') {
    const guard = await nvidiaGuardWithRanking(model, messages, isBlocked(model))
    if ('fallback' in guard) {
      console.log(`[nvidia-guard] ${model} → ${guard.to} (${guard.reason})`)
      // reroute to the ranking-based fallback via openrouter
      const fbBase = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'
      const fbKey = process.env.OPENROUTER_API_KEY
      if (fbKey) {
        try {
          const res = await fetch(`${fbBase}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${fbKey}` },
            body: JSON.stringify({ ...body, model: guard.to }),
          })
          const data = await res.text()
          return new Response(data, {
            status: res.status,
            headers: { 'Content-Type': 'application/json', 'X-Fallback-From': model, 'X-Fallback-To': guard.to, 'X-Fallback-Reason': guard.reason },
          })
        } catch {}
      }
      return Response.json({ error: { message: `nvidia guard: ${guard.reason}`, code: 429 } }, { status: 429 })
    }
  }

  if (!prov.key) {
    return Response.json({ error: { message: `No API key for provider ${prov.provider}`, code: 500 } }, { status: 500 })
  }

  // hostamar-1m-a/b mapping
  let forwardModel = model
  let forwardBase = prov.base
  let forwardKey = prov.key
  if (model.startsWith('hostamar-1m-')) {
    // map to latest 1M: use openrouter kimi-k3 as base
    forwardModel = 'moonshotai/kimi-k3'
    forwardBase = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'
    forwardKey = process.env.OPENROUTER_API_KEY!
  }
  if (prov.provider === 'opencode') {
    // catalog ids are prefixed opencode/<model>; the zen gateway expects bare ids
    forwardModel = model.replace(/^opencode\//, '')
  }
  if (model === 'hostamar-own') {
    forwardModel = 'qwen3:8b'
    forwardBase = 'http://host.docker.internal:11434/v1'
    forwardKey = 'ollama'
  }

  const stream = body.stream === true

  try {
    const doFetch = async () => {
      const r = await fetch(`${forwardBase.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${forwardKey}` },
        body: JSON.stringify({ ...body, model: forwardModel, stream }),
      })
      if (!r.ok) {
        const t = await r.text()
        const err: any = new Error(t)
        err.status = r.status
        throw err
      }
      return r
    }

    const res = await retryWithBackoff(doFetch, prov.provider === 'nvidia' ? 3 : 1)

    if (prov.provider === 'nvidia') markSuccess(model)

    if (stream && res.body) {
      return new Response(res.body, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    }

    const text = await res.text()
    return new Response(text, { status: res.status, headers: { 'Content-Type': 'application/json' } })
  } catch (e: any) {
    const status = e?.status || 500
    if (prov.provider === 'nvidia') markFail(model, status)
    // auto-fallback on nvidia fail: world-ranking target (glm→kimi-k3 etc.)
    if (prov.provider === 'nvidia' && (status === 429 || status === 402 || status === 404 || status === 500)) {
      const rankTo = await getFallbackForModel(model)
      try {
        const fbBase = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'
        const fbKey = process.env.OPENROUTER_API_KEY!
        const r = await fetch(`${fbBase}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${fbKey}` },
          body: JSON.stringify({ ...body, model: forwardModel.startsWith('nvidia/') ? rankTo : forwardModel }),
        })
        const t = await r.text()
        return new Response(t, { status: r.status, headers: { 'Content-Type': 'application/json', 'X-Fallback-Provider': 'openrouter' } })
      } catch {}
    }
    return Response.json({ error: { message: e?.message || 'Upstream error', code: status } }, { status })
  }
}
