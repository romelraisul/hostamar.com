import { NextRequest, NextResponse } from 'next/server'
import { callBestModel } from '@/lib/ai-fallback'
import { getAuthUser } from '@/lib/auth'
import { deductCredits } from '@/lib/credits'

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

  // Pre-spend check for authed users (min 1 credit)
  if (authUser) {
    const precheck = await deductCredits(authUser.id, 0, 'spend', 'chat precheck noop')
    if (!precheck.ok) {
      return NextResponse.json(
        {
          error: {
            message: 'INSUFFICIENT_CREDITS',
            code: 402,
            needed: precheck.needed,
            balance: precheck.balance,
            bkash: { number: '01822417463', link: 'https://hostamar.com/dashboard/payment' },
          },
        },
        { status: 402 }
      )
    }
  }

  const result = await callBestModel(messages, SYSTEM_PROMPT)

  // Token estimate + credit spend for authed users: 1 credit per 1000 tokens, min 1
  let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
  let creditsCharged = 0
  let creditsRemaining: number | null = null
  if (authUser) {
    const promptTokens = Math.ceil(messages.reduce((n, m) => n + (m.content?.length || 0), 0) / 4)
    const completionTokens = Math.ceil((result.text?.length || 0) / 4)
    const totalTokens = promptTokens + completionTokens
    const amount = Math.max(1, Math.ceil(totalTokens / 1000)) // 1 credit / 1k tokens, min 1
    const spend = await deductCredits(authUser.id, -amount, 'spend', `chat ${result.model} ${totalTokens}tk`).catch(() => null)
    usage = { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: totalTokens }
    if (spend && 'creditsRemaining' in spend) {
      creditsCharged = amount
      creditsRemaining = (spend as any).creditsRemaining
    } else if (spend && (spend as any).error === 'INSUFFICIENT_CREDITS') {
      // Response already produced by free chain — deliver it but flag the balance.
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
