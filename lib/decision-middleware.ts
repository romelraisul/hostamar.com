/**
 * Decision middleware — one call shape for all six dashboard decision points.
 *
 * The Verdict API (Jev-Style 0.8B, calibrated, ~20-50 ms warm) runs on the home
 * box: :8083 in WSL, public via the hostamar-local tunnel at
 * https://decisions.hostamar.com. Both return {choice, confidence, probabilities,
 * reasoning, escalate, agree, judge2, receipt_id}.
 *
 * Why a client and not inline fetches: every PIN must behave the same when the
 * home computer is OFF (free-tier reality) — one timeout, one fallback, one shape.
 *
 *   const v = await decide(PIN.model_tier, { prompt: 'a cat', user_tier: 'free' })
 *   v.escalate === true → confidence < 0.60: route safe (balanced) + human review
 */
export type DecisionPin = {
  id: string
  who: string
  question: string
  choices: string[]
  /** safe default used when the home box is unreachable or we escalate */
  fallback: string
  escalateTo?: string
  note: string
}

export type Verdict = {
  choice: string
  confidence: number
  probabilities: Record<string, number>
  reasoning?: string
  escalate: boolean
  agree: boolean | null
  judge2?: { choice: string; confidence: number } | null
  receipt_id?: string | null
  model: string
  latency_ms: number
  degraded?: boolean
  error?: string
}

/** The six PINs from the audit/dashboard flow — data, so the UI and the API share it. */
export const PINS = {
  model_tier: {
    id: 'pin1.model_tier', who: 'dashboard/topbar',
    question: 'Which model tier should handle this request?',
    choices: ['fast', 'balanced', 'pro', 'flux', 'comfyui'],
    fallback: 'balanced', escalateTo: 'balanced',
    note: '60% rule: below 0.60 confidence the router takes balanced and flags review',
  },
  product_queue: {
    id: 'pin2.product_queue', who: 'inbox/router',
    question: 'Which product queue owns this request?',
    choices: ['hostamar-core', 'ai-store', 'browser-pro', 'billing', 'abuse', 'other'],
    fallback: 'other',
    note: 'two judges (jev + prism-bonsai) must agree → auto-tag; disagreement → Needs Review',
  },
  approval_gate: {
    id: 'pin3.approval_gate', who: 'ci/terraform',
    question: 'Does this change require human confirmation?',
    choices: ['yes', 'no'],
    fallback: 'yes',
    note: 'fail-safe: anything unreachable or uncertain gates to a human (module/vpc, 0.0.0.0/0)',
  },
  priority: {
    id: 'pin4.priority', who: 'cron/health',
    question: 'What is priority level?',
    choices: ['low', 'medium', 'high', 'critical'],
    fallback: 'high',
    note: 'sorts the System Health board; postgres down = critical, version drift = low',
  },
  abuse: {
    id: 'pin5.abuse', who: 'gateway/browser',
    question: 'Is this request abusive?',
    choices: ['yes', 'no'],
    fallback: 'no',
    note: 'block only on yes with confidence ≥ 0.8; low-confidence yes is still allowed + logged',
  },
  audit_actor: {
    id: 'pin6.audit_actor', who: 'dashboard/audit',
    question: 'Was this action a human override or an automated decision?',
    choices: ['human_override', 'automated'],
    fallback: 'automated',
    note: 'labels every receipt so the audit tab can show where the model was wrong',
  },
} as const satisfies Record<string, DecisionPin>

export type PinName = keyof typeof PINS

// strip a trailing /v1: a deploy var of "…/v1" would otherwise build /v1/v1/decisions
const DECISIONS_URL = (process.env.DECISIONS_URL || 'https://decisions.hostamar.com').replace(/\/+$/, '').replace(/\/v1$/, '')
// two-judge PINs wait for a second model: keep this under the route's maxDuration (30s)
const TIMEOUT_MS = Number(process.env.DECISIONS_TIMEOUT_MS || 12000)
export const CONFIDENCE_FLOOR = 0.6

/** Ask the decision API. Never throws: an unreachable box degrades to the PIN's safe default. */
export async function decide(
  pin: DecisionPin,
  context: Record<string, unknown> = {},
  opts: { judges?: number; timeoutMs?: number } = {},
): Promise<Verdict> {
  const body = {
    who: pin.who, question: pin.question, choices: pin.choices, context,
    escalate_to: pin.escalateTo, judges: opts.judges ?? 1,
  }
  try {
    const r = await fetch(`${DECISIONS_URL}/v1/decisions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(opts.timeoutMs ?? TIMEOUT_MS),
      cache: 'no-store',
    })
    if (!r.ok) throw new Error(`decision api ${r.status}`)
    const v = (await r.json()) as Verdict
    // Guard the contract: a bad choice must never reach a router or a gate.
    if (!pin.choices.includes(v.choice)) throw new Error(`choice ${v.choice} not in ${pin.choices.join('/')}`)
    return v
  } catch (e: any) {
    return {
      choice: pin.fallback, confidence: 0, probabilities: {}, escalate: true, agree: null,
      model: 'fallback', latency_ms: 0, degraded: true, error: String(e?.message || e),
    }
  }
}

export const decidePin = (name: PinName, context: Record<string, unknown> = {}, opts?: { judges?: number }) =>
  decide(PINS[name], context, opts)
