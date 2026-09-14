// ============================================================================
// lib/ops-events.ts — Employee Ops Center event bus (write side).
//
// recordOpsEvent() writes ONE FleetEvent row (the live feed). Contract:
//   * best-effort — NEVER throws, never blocks the request path;
//   * returns the row id, or null when the write failed;
//   * self-heals the table on first use (same pattern as lib/ensure-schema.ts)
//     so a fresh environment without the DDL still works.
//
// Event types: RUN | REPORT | LEAD | PAYMENT | ORDER | SIGNUP | ALERT | CONTROL
// Severities:  info | success | warn | alert
// ============================================================================
import { prisma } from '@/lib/prisma'

export type OpsEventType =
  | 'RUN' | 'REPORT' | 'LEAD' | 'PAYMENT' | 'ORDER' | 'SIGNUP' | 'ALERT' | 'CONTROL'

export type OpsSeverity = 'info' | 'success' | 'warn' | 'alert'

/**
 * Canonical feed lanes for non-employee (product) events. Deliberately use
 * employee names so the feed's lane chips stay meaningful; FleetLaneStatus for
 * these lanes is only touched by real shift reports (POST /api/admin/fleet).
 */
export const OPS_LANES = {
  leads: 'Leads',      // CRM / contact-form leads
  payments: 'Ledger',  // money in (TrxID submitted / approved)
  orders: 'Bazaar',    // service + product orders
  signups: 'Nova',     // new customer signups
} as const

export interface OpsEventInput {
  lane: string
  type: OpsEventType | string
  severity?: OpsSeverity | string
  title: string
  body?: string | null
  meta?: unknown
}

function cut(v: unknown, max: number): string | null {
  if (v === null || v === undefined) return null
  const t = String(v).replace(/\u0000/g, '').trim()
  return t ? t.slice(0, max) : null
}

/** Map a FleetReport verdict to a feed severity (no severity='alert' here, so
 *  KPI alerts24h never double-counts a report that already has a FleetEvent). */
export function verdictSeverity(verdict?: string | null): OpsSeverity {
  const v = (verdict || '').toUpperCase()
  if (v.includes('HEALTHY') || v === 'OK' || v === 'SUCCESS') return 'success'
  if (v.includes('ALERT') || v.includes('WARN') || v.includes('FAIL') || v.includes('ERROR')) return 'warn'
  return 'info'
}

// One statement per entry — never concatenate (pooled DDL needs single commands).
const DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS "FleetEvent" (
  "id" TEXT NOT NULL,
  "lane" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'info',
  "title" TEXT NOT NULL,
  "body" TEXT,
  "meta" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FleetEvent_pkey" PRIMARY KEY ("id")
)`,
  `CREATE INDEX IF NOT EXISTS "FleetEvent_createdAt_idx" ON "FleetEvent"("createdAt" DESC)`,
  `CREATE INDEX IF NOT EXISTS "FleetEvent_lane_createdAt_idx" ON "FleetEvent"("lane","createdAt" DESC)`,
  `CREATE TABLE IF NOT EXISTS "FleetControl" (
  "id" TEXT NOT NULL,
  "employee" TEXT NOT NULL,
  "paused" BOOLEAN NOT NULL DEFAULT false,
  "autonomy" TEXT NOT NULL DEFAULT 'autonomous',
  "note" TEXT,
  "updatedBy" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FleetControl_pkey" PRIMARY KEY ("id")
)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "FleetControl_employee_key" ON "FleetControl"("employee")`,
  `CREATE TABLE IF NOT EXISTS "FleetLaneStatus" (
  "id" TEXT NOT NULL,
  "employee" TEXT NOT NULL,
  "role" TEXT,
  "schedule" TEXT,
  "lastRunAt" TIMESTAMP(3),
  "verdict" TEXT,
  "streak" INTEGER NOT NULL DEFAULT 0,
  "lastSnippet" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FleetLaneStatus_pkey" PRIMARY KEY ("id")
)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "FleetLaneStatus_employee_key" ON "FleetLaneStatus"("employee")`,
]

let ensured: Promise<void> | null = null

/** Create the Ops Center tables once per process (idempotent, cached). */
export function ensureOpsSchema(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      for (const sql of DDL) await prisma.$executeRawUnsafe(sql)
    })().catch((e) => {
      ensured = null // allow a retry on the next call
      throw e
    })
  }
  return ensured
}

/**
 * Append one Ops Center event. Best-effort: swallows all errors and returns
 * null so callers can fire-and-forget with `void recordOpsEvent({...})`.
 */
export async function recordOpsEvent(input: OpsEventInput): Promise<string | null> {
  try {
    const data = {
      lane: cut(input.lane, 64) || 'Ops',
      type: cut(input.type, 32) || 'RUN',
      severity: cut(input.severity, 16) || 'info',
      title: cut(input.title, 300) || 'event',
      body: cut(input.body, 4000),
      meta:
        input.meta === undefined
          ? null
          : cut(typeof input.meta === 'string' ? input.meta : JSON.stringify(input.meta), 4000),
    }
    try {
      const row = await prisma.fleetEvent.create({ data })
      return row.id
    } catch (err) {
      // Table likely missing (fresh env) — self-heal once, then retry.
      await ensureOpsSchema()
      const row = await prisma.fleetEvent.create({ data })
      return row.id
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[ops-events] non-fatal:', err instanceof Error ? err.message : err)
    return null
  }
}
