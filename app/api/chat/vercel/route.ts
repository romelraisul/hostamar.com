import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { deductCredits } from '@/lib/credits'
import { getBinanceRate } from '@/lib/binance'
import { callVercelGateway } from '@/lib/ai-gateway'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * POST /api/chat/vercel
 * Vercel AI Gateway — ?freeTier=true models, $5 included no card
 * Primary: openai/gpt-oss-120b, fallbacks: gemini-2.5-flash-lite, ling-3.0-flash-free, laguna-s-2.1-free
 * On Vercel: auth via VERCEL_OIDC_TOKEN auto (no key in code). Local: AI_GATEWAY_API_KEY=vgw_xxx
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  // simple in-memory rate limit per IP (10/60s) — Vercel edge will also enforce gateway budget
  const g: any = globalThis
  g._vgRate = g._vgRate || new Map<string, number[]>()
  const now = Date.now()
  const arr: number[] = g._vgRate.get(ip) || []
  const recent = arr.filter((t: number) => now - t < 60_000)
  if (recent.length >= 10) return Response.json({ error: 'Rate limited: 10 req / 60s' }, { status: 429 })
  recent.push(now); g._vgRate.set(ip, recent)

  const user = await getAuthUser(req)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const prompt: string = body?.prompt || body?.messages?.[body.messages.length - 1]?.content || ''
  const messages = Array.isArray(body?.messages) ? body.messages : prompt ? [{ role: 'user', content: prompt }] : []
  if (!messages.length) return Response.json({ error: 'prompt or messages required' }, { status: 400 })

  const model = body?.model || 'openai/gpt-oss-120b'
  const result = await callVercelGateway({ model, messages }, [
    'google/gemini-2.5-flash-lite',
    'inclusionai/ling-3.0-flash-free',
    'poolside/laguna-s-2.1-free',
  ])

  if (!result.ok) {
    return Response.json({ error: (result as any).error || 'Gateway failed', status: (result as any).status || 502 }, { status: 502 })
  }

  // deduct 1cr per message (same as /api/chat)
  const deduct = await deductCredits(user.id, -1, 'chat-vercel', `${result.model} via vercel-gateway`)
  const usdtBdt = (await getBinanceRate().catch(() => ({ usdtBdt: 126.4 })) as any).usdtBdt || 126.4

  return Response.json({
    reply: result.content,
    model: result.model,
    provider: result.provider,
    tokens: (result as any).data?.usage || null,
    creditsRemaining: deduct.ok ? deduct.creditsRemaining : 0,
    insufficient: !deduct.ok,
    usdtBdt,
  }, { status: deduct.ok ? 200 : 402 })
}
