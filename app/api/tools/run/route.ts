// ============================================================================
// POST /api/tools/run — server-side tool layer (layer 5 safety).
//
// Timeout (2s) + circuit breaker (3 failures -> open 10s) + allowlist +
// destructive-action confirmation gate. Agent suggestions reach here only
// AFTER the client allowlist; this is the second, authoritative boundary.
// ============================================================================
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { checkRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rate-limit'
import { evaluateToolCall, isDestructive, TOOL_ALLOWLIST } from '@/lib/voice/toolPolicy'

export const runtime = 'nodejs'

// --- circuit breaker state (per-process; fine for single node) ---
const failures = new Map<string, { count: number; openedAt: number }>()
const BREAKER_THRESHOLD = 3
const BREAKER_OPEN_MS = 10_000

function withTimeout<T>(p: Promise<T>, ms = 2000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('timeout')), ms)
    p.then(
      (v) => {
        clearTimeout(id)
        resolve(v)
      },
      (e) => {
        clearTimeout(id)
        reject(e)
      }
    )
  })
}

async function runTool(tool: string, payload: any, traceId: string): Promise<any> {
  // Destructive tools need explicit confirmation from the client action gate.
  const meta = TOOL_ALLOWLIST[tool]
  if (!meta) throw new Error('tool not allowed')

  switch (tool) {
    case 'get_hosting_status':
      return { status: 'ok', hosting: 'live', region: 'ap-south-1' }
    case 'create_video':
      // Reuse existing video generation; in this repo the generator is invoked
      // via the studio pipeline. We return a queued handle.
      return { queued: true, job: `vid_${Date.now()}`, prompt: payload?.prompt ?? '' }
    case 'create_ticket':
      return { ticket: `T-${Math.floor(Math.random() * 9000 + 1000)}`, created: true }
    case 'initiate_bkash_payment':
      return { payment: 'initiated', ref: `bk_${Date.now()}` }
    default:
      throw new Error('tool not allowed')
  }
}

export async function POST(req: NextRequest) {
  const t0 = Date.now()
  const traceId = `tool_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const ip = getClientIp(req)
  const rl = await checkRateLimit(ip, RATE_LIMITS.apiGeneral, '/api/tools/run', 'POST')
  if (!rl.allowed) {
    return NextResponse.json({ error: 'rate limited' }, { status: 429 })
  }

  const body = await req.json().catch(() => ({}))
  const tool: string = body?.tool
  const userConfirmed: boolean = body?.user_confirmed === true

  // Single source of truth for the safety gate (unit-tested in toolPolicy.test).
  const verdict = evaluateToolCall(tool, userConfirmed)
  if (!verdict.allowed) {
    const status = verdict.status
    if (status === 400) {
      // Destructive + unconfirmed, or disallowed tool.
      return NextResponse.json(
        { error: verdict.error, tool, destructive: isDestructive(tool) },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: verdict.error, tool }, { status: status })
  }

  // Circuit breaker: if this tool is open, fast-fail.
  const br = failures.get(tool)
  if (br && br.count >= BREAKER_THRESHOLD && Date.now() - br.openedAt < BREAKER_OPEN_MS) {
    return NextResponse.json({ error: 'circuit open', tool }, { status: 503 })
  }

  // Destructive gate: require explicit confirmation from the client action.
  if (TOOL_ALLOWLIST[tool].destructive && !userConfirmed) {
    return NextResponse.json({ error: 'Confirmation required', tool, destructive: true }, { status: 400 })
  }

  try {
    const result = await withTimeout(runTool(tool, body?.payload ?? {}, traceId), 2000)
    failures.set(tool, { count: 0, openedAt: 0 })
    console.log('[tool_call]', { tool, ms: Date.now() - t0, traceId, ok: true })
    return NextResponse.json({ ok: true, tool, result, traceId })
  } catch (e: any) {
    const f = failures.get(tool) ?? { count: 0, openedAt: 0 }
    f.count += 1
    f.openedAt = Date.now()
    failures.set(tool, f)
    const msg = String(e?.message || e)
    if (msg === 'timeout' || f.count >= BREAKER_THRESHOLD) {
      console.log('[tool_call]', { tool, ms: Date.now() - t0, traceId, ok: false, reason: msg })
      return NextResponse.json(
        { ok: false, tool, error: 'temporarily unavailable', message: 'I can’t access that system right now, here’s the manual fallback.' },
        { status: 503 }
      )
    }
    console.log('[tool_call]', { tool, ms: Date.now() - t0, traceId, ok: false, reason: msg })
    return NextResponse.json({ ok: false, tool, error: msg }, { status: 500 })
  }
}
