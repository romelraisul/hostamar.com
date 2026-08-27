/**
 * Vercel AI Gateway helper — free-tier eligible models via ?freeTier=true
 * Docs: https://vercel.com/ai-gateway/models?freeTier=true
 * - Single API, hundreds of models, transparent pricing, $5/mo included (no card)
 * - 217/316 models availableToFreeTier, 2 truly $0/$0 free
 * - Auth: local AI_GATEWAY_API_KEY=vgw_xxx, on Vercel auto VERCEL_OIDC_TOKEN
 */

const GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions'

export function getGatewayKey(): string | null {
  // On Vercel, VERCEL_OIDC_TOKEN is auto-injected — no key needed in code
  return (
    process.env.AI_GATEWAY_API_KEY ||
    process.env.VERCEL_OIDC_TOKEN ||
    process.env.VERCEL_GATEWAY_API_KEY ||
    null
  )
}

export const FREE_GATEWAY_MODELS = [
  'openai/gpt-oss-120b', // best free general, also shown as Free Tier eligible
  'google/gemini-2.5-flash-lite', // fast + free tier
  'openai/gpt-5-nano', // free tier
  'moonshotai/kimi-k2', // free tier eligible
  'inclusionai/ling-3.0-flash-free', // $0/$0
  'poolside/laguna-s-2.1-free', // $0/$0
] as const

export type GatewayModel = typeof FREE_GATEWAY_MODELS[number]

export interface GatewayChatParams {
  model?: string
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  temperature?: number
  max_tokens?: number
  stream?: boolean
}

export async function callVercelGateway(params: GatewayChatParams, fallbackModels?: string[]) {
  const key = getGatewayKey()
  // On Vercel, key may be VERCEL_OIDC_TOKEN auto — if no key locally, return hint
  if (!key) {
    return { ok: false as const, error: 'AI_GATEWAY_API_KEY not set (or VERCEL_OIDC_TOKEN missing on Vercel)', status: 401 }
  }
  const primary = params.model || 'openai/gpt-oss-120b'
  const tryModels = [primary, ...(fallbackModels || ['google/gemini-2.5-flash-lite', 'inclusionai/ling-3.0-flash-free', 'poolside/laguna-s-2.1-free'])]
  let lastErr: any = null
  for (const mdl of tryModels) {
    try {
      const res = await fetch(GATEWAY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: mdl,
          messages: params.messages,
          temperature: params.temperature ?? 0.7,
          max_tokens: params.max_tokens ?? 512,
          stream: false,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const content = data.choices?.[0]?.message?.content || ''
        return { ok: true as const, data, content, model: mdl, provider: 'vercel-gateway' }
      }
      const txt = await res.text().catch(() => '')
      lastErr = { status: res.status, body: txt.slice(0, 500), model: mdl }
      // 429 / 402 / 404 try next fallback
      if (res.status === 429 || res.status === 402 || res.status === 404) continue
      // 401 -> no retry
      if (res.status === 401) return { ok: false as const, error: txt.slice(0, 500), status: 401, model: mdl }
      continue
    } catch (e: any) {
      lastErr = { error: e?.message, model: mdl }
      continue
    }
  }
  return { ok: false as const, error: lastErr, status: 502 }
}
