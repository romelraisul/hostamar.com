import { NextRequest, NextResponse } from 'next/server'
import { callBestModel } from '@/lib/ai-fallback'
import { getAuthUser } from '@/lib/auth'
import { deductCredits } from '@/lib/credits'
import { slidingWindow, getClientIpEdge } from '@/lib/rate-limit-edge'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const maxDuration = 55

/**
 * POST /api/v1/chat/completions — PUBLIC OpenAI-compatible endpoint.
 * Same-domain customer base URL (works with OPENAI_BASE_URL=https://hostamar.com/api/v1
 * for codex/claude/hermes CLIs and the dashboard chat) — serverless, always-on:
 * runs the lib/ai-fallback.ts unlimited chain (vercel-gateway → litellm →
 * nvidia → groq → openrouter → knowledge-base), NOT the home-VPS tunnel.
 *
 * Auth model:
 *  - No auth → allowed (rate-limited naturally by the free fallback chain),
 *    no credit deduction (public support tier).
 *  - Authed customer (cookie or Bearer JWT) → credit spend: 1 credit per
 *    request min, plus usage-based (total_tokens/1000, min 1) via deductCredits,
 *    with CreditTransaction audit row and INSUFFICIENT → 402 + bKash link.
 */
const SYSTEM_PROMPT =
  'You are Hostamar AI — an assistant for Bangladeshi businesses. Reply in Bangla or English matching the user. Hostamar offers 50+ AI services (video, logo, ads, social), 6000 FREE credits, bKash personal payment 01822417463, plans Starter ৳599 / Pro ৳1299 / Business ৳2999. Be concise and helpful.'

export async function POST(req: NextRequest) {
  // RATE LIMIT (audit HIGH fix): 100 req/min/IP zero-cost in-process window.
  const rl = slidingWindow(`chat:${getClientIpEdge(req)}`, 100, 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: { message: 'Rate limit exceeded — 100 req/min. Try again shortly.', code: 429 } },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetInMs / 1000)) } },
    )
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: { message: 'Invalid JSON', code: 400 } }, { status: 400 })
  }

  const messages: Array<{ role: string; content: string }> = Array.isArray(body.messages)
    ? body.messages.filter((m: any) => m?.content)
    : []
  if (!messages.length) {
    return NextResponse.json({ error: { message: 'messages[] required', code: 400 } }, { status: 400 })
  }

  // Optional auth — public works, authed users get credit accounting
  let authUser: any = null
  try {
    authUser = await getAuthUser(req)
  } catch {
    authUser = null
  }

  // FULL FREE (v11): chat is free for everyone — no pre-spend check, no 402,
  // balance never changes.

  const result = await callBestModel(messages, SYSTEM_PROMPT, body.model || undefined)

  // PAID TOKEN BILLING (V12): market price per model + real token counts.
  // 1cr = 1TK = 1 future HOST coin. Race-safe deduct via lib/credits.
  let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
  let creditsCharged = 0
  let creditsRemaining: number | null = null
  let pricing: any = null
  if (authUser) {
    const promptTokens = Math.ceil(messages.reduce((n, m) => n + (m.content?.length || 0), 0) / 4)
    const completionTokens = Math.ceil((result.text?.length || 0) / 4)
    const totalTokens = promptTokens + completionTokens
    usage = { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: totalTokens }

    const { computeCharge } = await import('@/lib/pricing/market-pricing')
    const { credits, breakdown } = computeCharge(result.model, promptTokens, completionTokens)
    pricing = { credits, ...breakdown }

    const spend = await deductCredits(authUser.id, -credits, 'chat', `chat ${result.model} ${totalTokens}tk`).catch(() => null)
    if (spend && 'creditsRemaining' in spend) {
      creditsCharged = credits
      creditsRemaining = (spend as any).creditsRemaining
    } else if (spend && (spend as any).error === 'INSUFFICIENT_CREDITS') {
      // Deliver the answer but flag the balance (never silently lose a reply)
      creditsCharged = 0
      creditsRemaining = (spend as any).balance ?? null
    }
  } else {
    const promptTokens = Math.ceil(messages.reduce((n, m) => n + (m.content?.length || 0), 0) / 4)
    const completionTokens = Math.ceil((result.text?.length || 0) / 4)
    usage = { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: promptTokens + completionTokens }
  }

  return NextResponse.json({
    id: `chatcmpl-${Date.now().toString(36)}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: result.model,
    provider: result.provider,
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content: result.text },
        finish_reason: 'stop',
      },
    ],
    usage,
    credits: authUser ? { charged: creditsCharged, remaining: creditsRemaining } : undefined,
    pricing: authUser ? pricing : undefined,
    ok: true,
  })
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/v1/chat/completions',
    usage: 'POST {model, messages[], max_tokens} — OpenAI compatible',
    auth: 'optional — public works, authed users get credit accounting',
  })
}
