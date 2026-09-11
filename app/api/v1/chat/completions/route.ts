import { NextRequest, NextResponse } from 'next/server'
import { callBestModel } from '@/lib/ai-fallback'
import { streamChatCompletion } from '@/lib/ai-stream'
import { getAuthUser } from '@/lib/auth'
import { deductCredits } from '@/lib/credits'
import { slidingWindow, getClientIpEdge } from '@/lib/rate-limit-edge'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const maxDuration = 55

const SYSTEM_PROMPT =
  'You are Hostamar AI — an assistant for Bangladeshi businesses. Reply in Bangla or English matching the user. Hostamar offers 50+ AI services (video, logo, ads, social), 6000 FREE credits, bKash personal payment 01822417463, plans Starter ৳599 / Pro ৳1299 / Business ৳2999. Be concise and helpful.'

export async function POST(req: NextRequest) {
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

  let authUser: any = null
  try {
    authUser = await getAuthUser(req)
  } catch {
    authUser = null
  }

  // V62: true SSE streaming — OpenAI clients that ask for stream:true get real
  // `data:` frames with finish_reason and [DONE]; the buffered path below is
  // untouched for non-streaming callers.
  if (body.stream === true) {
    return streamChatCompletion(body, authUser)
  }

  // V36.48: support ?debug=1 to return full chain trace
  const debug = new URL(req.url).searchParams.get('debug') === '1';
  const result = await callBestModel(messages, SYSTEM_PROMPT, body.model || undefined, debug);

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
      creditsCharged = 0
      creditsRemaining = (spend as any).balance ?? null
    }
  } else {
    const promptTokens = Math.ceil(messages.reduce((n, m) => n + (m.content?.length || 0), 0) / 4)
    const completionTokens = Math.ceil((result.text?.length || 0) / 4)
    usage = { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: promptTokens + completionTokens }
  }

  // V36.47 DEBUG: Add provider header so we can see which provider actually answered
  const headers: Record<string, string> = {
    'X-AI-Provider': result.provider,
    'X-AI-Model': result.model,
    'Cache-Control': 'no-store', // V36.48: prevent caching causing header/body mismatch
  }
  if (result.provider === 'knowledge-base-fallback') {
    headers['X-AI-Fallback-Reason'] = 'all-providers-failed';
  }

  const response: any = {
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
  };

  // V36.48: when ?debug=1, include full chain trace in response body
  if (debug && result.trace) {
    response.trace = result.trace;
    response.debug = true;
  }

  return NextResponse.json(response, { headers });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/v1/chat/completions',
    usage: 'POST {model, messages[], max_tokens} — OpenAI compatible. Add &debug=1 for full chain trace.',
    auth: 'optional — public works, authed users get credit accounting',
  })
}
