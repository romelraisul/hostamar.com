import { NextRequest, NextResponse } from 'next/server'
import { PINS, CONFIDENCE_FLOOR } from '@/lib/decision-middleware'

export const dynamic = 'force-dynamic'

/**
 * Decision API — real decisions from the local JEV model (hostamar-jev.service, :8083),
 * not a heuristic. Answers the 6 PINs of the audit dashboard.
 *
 *   POST {question, choices[], context, who, escalate_to} → {choice, confidence,
 *        reasoning, escalate, routed_to, receipt}
 *   GET  → the audit trail (receipts) for the dashboard Audit tab
 *
 * The "60% rule" lives in the service: confidence < 0.60 → escalate=true, and the caller
 * routes to `escalate_to` (e.g. the balanced tier) instead of trusting the pick.
 * If the local model is down this falls back to the legacy static map so /store never 500s.
 */
// MUST be the tunnel URL: this route runs on Cloudflare Workers, where 127.0.0.1:8083
// is unreachable. Local dev can set DECISION_API_URL=http://127.0.0.1:8083.
const DECISION_API = (process.env.DECISION_API_URL || 'https://decisions.hostamar.com')
  .replace(/\/+$/, '').replace(/\/v1$/, '')
const TIMEOUT_MS = Number(process.env.DECISION_TIMEOUT_MS || 25000)
const HUMAN_THRESHOLD = Number(process.env.DECISION_THRESHOLD || 0.6)

const DECISION_MAP: Record<string, { old: number; new: number; laya: number; model: string }> = {
  AutoHedge: { old: 0.2, new: 0.8, laya: 0.0, model: 'qwen' },
  'Vibe-Trading': { old: 0.1, new: 0.9, laya: 0.0, model: 'qwen' },
  'Fincept Terminal': { old: 0.3, new: 0.7, laya: 0.0, model: 'minimax' },
  LibreChat: { old: 0.8, new: 0.2, laya: 0.0, model: 'old' },
  'Open Generative AI': { old: 0.0, new: 1.0, laya: 0.0, model: 'qwen-rgba' },
  'Open-LLM-VTuber': { old: 0.5, new: 0.5, laya: 0.0, model: 'minimax' },
  'Claude Ads': { old: 0.9, new: 0.1, laya: 0.0, model: 'old' },
  'Agentic Inbox': { old: 0.7, new: 0.3, laya: 0.0, model: 'old' },
  Camofox: { old: 0.6, new: 0.4, laya: 0.0, model: 'old' },
  Hyperframes: { old: 0.0, new: 1.0, laya: 0.0, model: 'hyperframes' },
}

/** Legacy shape (repo → model weights pick). Used for {repo} calls and as the fallback. */
function legacyDecision(repo?: string, prompt?: string, warning?: string) {
  const decision = DECISION_MAP[repo as keyof typeof DECISION_MAP] || { old: 0.33, new: 0.33, laya: 0.34, model: 'auto' }
  return {
    model: 'openJev-verdict-2.0',
    source: 'static-fallback',
    ...(warning ? { warning } : {}),
    weights: { safetensors: 605529340, onnx: 0, fp16_onnx: 303785047, verified: true, upstream: 'heman10x/rlcd-modernbert-151m' },
    decision,
    reasoning: `openJev 77.10% > Laya 76.60% - routes ${repo || prompt} to ${decision.model}`,
    replaces: 'Laya 401 NandhaKishorM/laya private invite',
    sidecar: { ram: '300MB', ece: '1.44%', acc: '77.10%' },
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any))
  const { question, choices, context, who, escalate_to, judges } = body || {}

  if (typeof question === 'string' && Array.isArray(choices) && choices.length >= 2) {
    try {
      const r = await fetch(`${DECISION_API}/v1/decisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, choices, context, who, escalate_to, judges }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: 'no-store',
      })
      const d = await r.json().catch(() => null)
      if (r.ok && d) {
        return NextResponse.json({
          model: d.receipt?.model || 'local/jev-decision-0.8b',
          source: 'jev-local',
          choice: d.choice,
          confidence: d.confidence,
          probabilities: d.probabilities ?? null,
          reasoning: d.reasoning,
          escalate: d.escalate ?? (d.confidence ?? 0) < HUMAN_THRESHOLD,
          routed_to: d.routed_to ?? null,
          agree: d.agree ?? null,
          judge2: d.judge2 ?? null,
          latency_ms: d.latency_ms ?? null,
          judge1_ms: d.judge1_ms ?? d.latency_ms ?? null,  // same value, name the contract test asserts
          receipt: d.receipt ?? null,
        })
      }
      // service answered with an error → degrade, don't fail the caller
      return NextResponse.json(legacyDecision(undefined, question,
        `jev-local unavailable (${r.status}); static fallback used`), { headers: { 'Cache-Control': 'no-store' } })
    } catch (e) {
      return NextResponse.json(legacyDecision(undefined, question,
        `jev-local unreachable (${(e as Error).message.slice(0, 80)}); static fallback used`),
        { headers: { 'Cache-Control': 'no-store' } })
    }
  }
  // legacy {repo, prompt} callers (app/store links here) keep working
  return NextResponse.json(legacyDecision(body?.repo, body?.prompt), { headers: { 'Cache-Control': 'no-store' } })
}

export async function GET(req: NextRequest) {
  // ?pins=1 → the six PIN definitions the audit dashboard automates
  if (req.nextUrl.searchParams.get('pins')) {
    return NextResponse.json(
      { object: 'decision-api', pins: PINS, confidence_floor: CONFIDENCE_FLOOR,
        rule: `confidence < ${CONFIDENCE_FLOOR} → escalate to the pin fallback + human review`,
        upstream: DECISION_API },
      { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } },
    )
  }
  // The audit trail is internal: middleware.ts intends /api/* to need auth_token,
  // but that is not enforced on Pages, so check here. POST stays open (internal callers).
  const authed = !!req.cookies.get('auth_token')?.value
    || (!!process.env.AUTONOMOUS_SECRET && req.headers.get('x-hostamar-autonomous') === process.env.AUTONOMOUS_SECRET)
  if (!authed) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHENTICATED', hint: 'receipts need auth_token (admin login); GET ?pins=1 is public' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    )
  }
  try {
    const r = await fetch(`${DECISION_API}/v1/decisions/receipts?limit=50`, {
      signal: AbortSignal.timeout(8000), cache: 'no-store',
    })
    const d = await r.json()
    return NextResponse.json({ source: 'jev-local', api: DECISION_API, ...d },
      { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    return NextResponse.json({
      source: 'offline', api: DECISION_API, count: 0, receipts: [],
      note: `decision service not reachable from this runtime (${(e as Error).message.slice(0, 80)}). Live receipts: ${DECISION_API}/v1/decisions/receipts`,
    })
  }
}
