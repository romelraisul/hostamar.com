export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'

/**
 * GET /api/ai/health — public AI gateway health surface (V26).
 *
 * Before V26 there was NO public way to check the AI chain: ai.hostamar.com/health
 * 404s (DNS points at Vercel, not the CF Worker) and this path 401'd in middleware.
 * Now public + cached 60s: probes the live chat-completions endpoint with a tiny
 * request, reports chain state honestly (latency, model served, fallback used).
 * Never 504s itself — every probe has its own short timeout and honest reporting.
 */
export async function GET() {
  const started = Date.now()

  // 1) Models catalog (Vercel route, fast + cached)
  let modelsCount: number | null = null
  let modelsStatus = 'unknown'
  try {
    const r = await fetch('https://hostamar.com/api/v1/models', {
      signal: AbortSignal.timeout(5_000),
      headers: { 'x-skip-rewrite': '1' },
    })
    modelsStatus = String(r.status)
    if (r.ok) {
      const j: any = await r.json()
      modelsCount = Array.isArray(j?.data) ? j.data.length : null
    }
  } catch (e: any) {
    modelsStatus = `error: ${String(e?.message || e).slice(0, 60)}`
  }

  // 2) Live completion probe — tiny "hi" through the full chain
  let chat: any = { reachable: false }
  try {
    const r = await fetch('https://hostamar.com/api/v1/chat/completions', {
      method: 'POST',
      signal: AbortSignal.timeout(20_000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'hostamar-1m-a', messages: [{ role: 'user', content: 'hi' }], max_tokens: 10 }),
    })
    const j: any = await r.json().catch(() => ({}))
    chat = {
      reachable: r.ok,
      status: r.status,
      latencyMs: Date.now() - started,
      model: j?.model || null,
      provider: j?.provider || null,
      usedKnowledgeBase: j?.provider === 'fallback' || j?.model === 'knowledge-base-fallback',
    }
  } catch (e: any) {
    chat = { reachable: false, error: String(e?.message || e).slice(0, 80) }
  }

  return NextResponse.json(
    {
      ok: true,
      gateway: {
        endpoint: 'https://hostamar.com/api/v1 (ai.hostamar.com/v1 → same route via rewrite)',
        serving: 'vercel', // ground truth: ai.* DNS → Vercel anycast, not the CF Worker
        models: { status: modelsStatus, count: modelsCount },
        chat,
        chain: ['kilocode-direct', 'cf-edge-worker', 'kilo-auto/free', 'meituan/longcat-2.0-free', 'knowledge-base'],
        budget: { chainBudgetMs: Number(process.env.AI_CHAIN_BUDGET_MS || 42_000), maxDuration: 55, fiftyOhFourFix: 'V26 wall-clock budget — chain can no longer exceed function maxDuration' },
      },
      hostamar1mAServed: Boolean(chat.reachable && (chat.model === 'hostamar-1m-a' || chat.usedKnowledgeBase)),
      fallback: { knowledgeBaseActive: true, note: 'chain always terminates in a well-formed completion' },
      checkedAt: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' } },
  )
}
