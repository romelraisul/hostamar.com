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
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { OPS_EMPLOYEES, LANE_META } from '@/lib/ops-lanes'

export const dynamic = 'force-dynamic'

const TARGET_CUSTOMERS = 10

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
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const now = new Date()
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const since30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // ---- KPIs -------------------------------------------------------------
  const [signupsToday, paidPayments, activeSubs] = await Promise.all([
    safe(prisma.customer.count({ where: { createdAt: { gte: startOfToday } } }), 0),
    safe(
      prisma.payment.findMany({
        where: { status: 'paid', createdAt: { gte: since30d } },
        select: { customerId: true, amount: true },
      }),
      [] as { customerId: string; amount: number }[]
    ),
    safe(
      prisma.subscription.findMany({
        where: { status: 'active' },
        select: { customerId: true, price: true },
      }),
      [] as { customerId: string; price: number }[]
    ),
  ])

  let mrrBdt = Math.round(paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0))
  if (mrrBdt === 0 && activeSubs.length) {
    mrrBdt = Math.round(activeSubs.reduce((sum, s) => sum + (s.price || 0), 0))
  }

  const paying = new Set<string>()
  for (const p of paidPayments) paying.add(p.customerId)
  for (const s of activeSubs) paying.add(s.customerId)
  const payingCustomers = paying.size

  const [alertReports, alertEvents] = await Promise.all([
    safe(
      prisma.fleetReport.count({
        where: { runAt: { gte: since24h }, verdict: { equals: 'ALERT' } },
      }),
      0
    ),
    safe(prisma.fleetEvent.count({ where: { createdAt: { gte: since24h }, severity: 'alert' } }), 0),
  ])
  const alerts24h = alertReports + alertEvents

  // ---- Lane grid --------------------------------------------------------
  const [controls, laneStatuses, recentReports] = await Promise.all([
    safe(prisma.fleetControl.findMany(), [] as { employee: string; paused: boolean; autonomy: string }[]),
    safe(
      prisma.fleetLaneStatus.findMany(),
      [] as {
        employee: string
        role: string | null
        schedule: string | null
        lastRunAt: Date | null
        verdict: string | null
        streak: number
        lastSnippet: string | null
      }[]
    ),
    safe(
      prisma.fleetReport.findMany({ orderBy: { runAt: 'desc' }, take: OPS_EMPLOYEES.length * 10 }),
      [] as { employee: string; runAt: Date; verdict: string | null; needsYou: string | null; finished: string | null }[]
    ),
  ])

  const controlByEmp = new Map(controls.map((c) => [c.employee, c]))
  const statusByEmp = new Map(laneStatuses.map((l) => [l.employee, l]))
  const latestReport = new Map<string, (typeof recentReports)[number]>()
  for (const r of recentReports) {
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

  return NextResponse.json({
    kpis: {
      signupsToday,
      payingCustomers,
      targetCustomers: TARGET_CUSTOMERS,
      mrrBdt,
      activeLanes,
      alerts24h,
    },
    lanes,
    generatedAt: now.toISOString(),
  })
}
