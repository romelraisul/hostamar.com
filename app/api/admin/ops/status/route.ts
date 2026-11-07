// /api/admin/ops/status — Employee Ops Center: KPI strip + lane grid.
//
// KPI definitions (documented, defensible):
//   signupsToday     = Customer rows created since local midnight.
//   payingCustomers  = distinct customers with a paid Payment (last 30d)
//                      OR an active Subscription.
//   mrrBdt           = SUM(Payment.amount WHERE status='paid' AND createdAt>=30d),
//                      falling back to SUM(active Subscription.price) — i.e. the
//                      SAME source lib/autonomy/tools/measureMRR.ts (the Ledger
//                      tally) uses. 0 when neither is present.
//   alerts24h        = FleetReport(verdict=ALERT, 24h) + FleetEvent(severity='alert', 24h).
//                      Report-verdict ALERT maps to FleetEvent severity 'warn'
//                      (see verdictSeverity) so the two never double-count.
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { OPS_EMPLOYEES, LANE_META } from '@/lib/ops-lanes'
import { executeWithFailover } from '@/lib/db-failover'

export const dynamic = 'force-dynamic'

const TARGET_CUSTOMERS = 10

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

async function isAdmin(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get('auth_token')?.value
  if (!token) return false
  const payload = verifyToken(token)
  return !!payload && (payload.role === 'admin' || payload.role === 'superadmin')
}

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p
  } catch {
    return fallback
  }
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'নিষিদ্ধ: অ্যাডমিন অ্যাক্সেস দরকার' }, { status: 403, headers: corsHeaders() })

  const now = new Date()
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const since30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const result = await executeWithFailover(async (client, dbType) => {
    // ---- KPIs -------------------------------------------------------------
    const [signupsToday, paidPayments, activeSubs] = await Promise.all([
      safe(
        dbType === 'turso'
          ? client.execute({ sql: 'SELECT COUNT(*) as cnt FROM Customer WHERE "createdAt" >= ?', args: [startOfToday.toISOString()] })
          : client.query('SELECT COUNT(*) as cnt FROM "Customer" WHERE "createdAt" >= $1', [startOfToday.toISOString()]),
        { rows: [{ cnt: 0 }] } as { rows: { cnt: number }[] }
      ),
      safe(
        dbType === 'turso'
          ? client.execute({ sql: 'SELECT "customerId", amount FROM "Payment" WHERE status = \'paid\' AND "createdAt" >= ?', args: [since30d.toISOString()] })
          : client.query('SELECT "customerId", amount FROM "Payment" WHERE status = \'paid\' AND "createdAt" >= $1', [since30d.toISOString()]),
        { rows: [] as { customerId: string; amount: number }[] }
      ),
      safe(
        dbType === 'turso'
          ? client.execute({ sql: 'SELECT "customerId", price FROM "Subscription" WHERE status = \'active\'', args: [] })
          : client.query('SELECT "customerId", price FROM "Subscription" WHERE status = \'active\'', []),
        { rows: [] as { customerId: string; price: number }[] }
      ),
    ])

    let mrrBdt = Math.round((paidPayments.rows || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0))
    if (mrrBdt === 0 && (activeSubs.rows || []).length) {
      mrrBdt = Math.round((activeSubs.rows || []).reduce((sum: number, s: any) => sum + (s.price || 0), 0))
    }

    const paying = new Set<string>()
    for (const p of paidPayments.rows || []) paying.add(p.customerId)
    for (const s of activeSubs.rows || []) paying.add(s.customerId)
    const payingCustomers = paying.size

    const [alertReports, alertEvents] = await Promise.all([
      safe(
        dbType === 'turso'
          ? client.execute({ sql: 'SELECT COUNT(*) as cnt FROM "FleetReport" WHERE "runAt" >= ? AND verdict = \'ALERT\'', args: [since24h.toISOString()] })
          : client.query('SELECT COUNT(*) as cnt FROM "FleetReport" WHERE "runAt" >= $1 AND verdict = \'ALERT\'', [since24h.toISOString()]),
        { rows: [{ cnt: 0 }] } as { rows: { cnt: number }[] }
      ),
      safe(
        dbType === 'turso'
          ? client.execute({ sql: 'SELECT COUNT(*) as cnt FROM "FleetEvent" WHERE "createdAt" >= ? AND severity = \'alert\'', args: [since24h.toISOString()] })
          : client.query('SELECT COUNT(*) as cnt FROM "FleetEvent" WHERE "createdAt" >= $1 AND severity = \'alert\'', [since24h.toISOString()]),
        { rows: [{ cnt: 0 }] } as { rows: { cnt: number }[] }
      ),
    ])
    const alerts24h = Number(alertReports.rows[0]?.cnt || 0) + Number(alertEvents.rows[0]?.cnt || 0)

    // ---- Lane grid --------------------------------------------------------
    const [controls, laneStatuses, recentReports] = await Promise.all([
      safe(
        dbType === 'turso'
          ? client.execute({ sql: 'SELECT * FROM "FleetControl"', args: [] })
          : client.query('SELECT * FROM "FleetControl"', []),
        { rows: [] as { employee: string; paused: boolean; autonomy: string }[] }
      ),
      safe(
        dbType === 'turso'
          ? client.execute({ sql: 'SELECT * FROM "FleetLaneStatus"', args: [] })
          : client.query('SELECT * FROM "FleetLaneStatus"', []),
        { rows: [] as { employee: string; role: string | null; schedule: string | null; lastRunAt: string | null; verdict: string | null; streak: number; lastSnippet: string | null }[] }
      ),
      safe(
        dbType === 'turso'
          ? client.execute({ sql: `SELECT * FROM "FleetReport" ORDER BY "runAt" DESC LIMIT ?`, args: [OPS_EMPLOYEES.length * 10] })
          : client.query(`SELECT * FROM "FleetReport" ORDER BY "runAt" DESC LIMIT $1`, [OPS_EMPLOYEES.length * 10]),
        { rows: [] as { employee: string; runAt: string; verdict: string | null; needsYou: string | null; finished: string | null }[] }
      ),
    ])

    const controlByEmp = new Map((controls.rows || []).map((c: any) => [c.employee, c]))
    const statusByEmp = new Map((laneStatuses.rows || []).map((l: any) => [l.employee, l]))
    const latestReport = new Map<string, (typeof recentReports.rows)[number]>()
    for (const r of recentReports.rows || []) {
      if (!latestReport.has(r.employee)) latestReport.set(r.employee, r)
    }

    const lanes = OPS_EMPLOYEES.map((emp) => {
      const st = statusByEmp.get(emp)
      const ctl = controlByEmp.get(emp)
      const rep = latestReport.get(emp)
      const meta = LANE_META[emp] || { role: null as any, schedule: null as any }
      const lastRunAt = st?.lastRunAt ?? rep?.runAt ?? null
      const snippet = st?.lastSnippet ?? rep?.needsYou ?? rep?.finished ?? null
      return {
        employee: emp,
        role: st?.role ?? meta.role ?? null,
        schedule: st?.schedule ?? meta.schedule ?? null,
        lastRunAt,
        ageMinutes: lastRunAt ? Math.max(0, Math.round((now.getTime() - new Date(lastRunAt).getTime()) / 60000)) : null,
        verdict: st?.verdict ?? rep?.verdict ?? null,
        streak: st?.streak ?? 0,
        paused: !!ctl?.paused,
        autonomy: ctl?.autonomy ?? 'autonomous',
        lastSnippet: snippet ? String(snippet).slice(0, 240) : null,
      }
    })

    const activeLanes = lanes.filter((l) => !l.paused && l.autonomy !== 'halted').length

    return {
      kpis: {
        signupsToday: Number(signupsToday.rows[0]?.cnt || 0),
        payingCustomers,
        targetCustomers: TARGET_CUSTOMERS,
        mrrBdt,
        activeLanes,
        alerts24h,
      },
      lanes,
      generatedAt: now.toISOString(),
    }
  })

  if (result) {
    return NextResponse.json({
      ...result.result,
      fallback: result.dbType,
    }, { headers: corsHeaders() })
  }

  // All DBs down - return zeros
  return NextResponse.json({
    kpis: {
      signupsToday: 0,
      payingCustomers: 0,
      targetCustomers: TARGET_CUSTOMERS,
      mrrBdt: 0,
      activeLanes: 16,
      alerts24h: 0,
    },
    lanes: OPS_EMPLOYEES.map((emp) => {
      const meta = LANE_META[emp] || { role: null, schedule: null }
      return {
        employee: emp,
        role: meta.role ?? null,
        schedule: meta.schedule ?? null,
        lastRunAt: null,
        ageMinutes: null,
        verdict: null,
        streak: 0,
        paused: false,
        autonomy: 'autonomous',
        lastSnippet: null,
      }
    }),
    generatedAt: now.toISOString(),
    fallback: 'error',
    warning: 'DB error - returned zeros',
  }, { headers: corsHeaders() })
}