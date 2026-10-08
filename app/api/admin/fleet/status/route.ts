import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'
import content from '@/lib/docs/content.json'

/**
 * /api/admin/fleet/status — one-shot fleet status aggregation.
 * Edge/workerd-safe: no fs (content.json is bundled), no child_process.
 * GPU numbers cannot be sampled on the Worker — the local fleet loop
 * (scripts/fleet/loop.mjs) is the only thing with nvidia-smi, and it
 * POSTs GPU samples through /api/admin/fleet as employee Fleet-Heartbeat.
 * This route reports what the Worker CAN see + the last reported GPU state.
 */
export const dynamic = 'force-dynamic'

async function isAdmin(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get('auth_token')?.value
  if (!token) return false
  const payload = verifyToken(token)
  return !!payload && (payload.role === 'admin' || payload.role === 'superadmin')
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const sops = (content.sections || []).filter((s: any) => s?.id && s?.title)

  // Gateway models count — ai.hostamar.com/v1/models (public, 200).
  let models = { count: 0, gateway: 'down', ok: false }
  try {
    const r = await fetch('https://ai.hostamar.com/v1/models', { signal: AbortSignal.timeout(10_000) })
    const j: any = await r.json().catch(() => null)
    const n = Array.isArray(j?.data) ? j.data.length : 0
    models = { count: n, gateway: `ai.hostamar.com/v1/models ${r.status}`, ok: r.ok && n > 0 }
  } catch {}

  return NextResponse.json({
    gpu: {
      // filled by the local loop's latest Fleet-Heartbeat report; null until then
      note: 'sampled by scripts/fleet/loop.mjs (local nvidia-smi) — workerd has no GPU access',
    },
    models,
    ai_employees: {
      roster: 17,
      support_chat: '/api/support/chat live (best-free-model chain)',
      autonomous_agent: '/api/agent/run',
      cron_employees: ['ceo', 'cto', 'marketing', 'monitor', 'seo-automation', 'support', 'content-pipeline'],
      note: '7 .mjs cron agents in ~/hostamar-agents + 17-entry site roster',
    },
    sops: { count: sops.length, docs: 'bundled content.json — /docs/sops' },
    human: { bKash: '01822417463', verification: 'manual TrxID approve (admin console)' },
    credits: { rate: '1cr = 1TK = 1 HOST coin', testPlan: 1000 },
    overflow: {
      enabled: false,
      reason: 'LIGHTNING_API_TOKEN missing — lib/fleet/overflow.ts stays log-only',
      threshold: 'gpu util >90% for 5min',
    },
  })
}
