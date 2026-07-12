// ============================================================================
// measureMRR — REAL KPI measurement for the dynamic Goal loop.
// MRR + paying orgs + paying users are derived from real bKash Payments
// (status='paid'), linked to tenants via Payment.organizationId (isolation
// pays off — money is attributable to the org). Subscription table is a
// fallback only. Content/qdrant signals kept as best-effort context.
// Every probe is wrapped so a missing table / unreachable service never throws.
// ============================================================================
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

export interface MrRMetrics {
  mrr: number
  payingUsers: number
  payingOrgs: number
  currency: string
  paidCount: number
  qdrantPoints: number
  contentCount: number
  reportsCount: number
  asOf: string
}

const QDRANT_URL = (process.env.QDRANT_PUBLIC_URL || 'http://localhost:8200').replace(/\/$/, '')
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || 'hostamar_kb'

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000

export async function measureMRR(): Promise<MrRMetrics> {
  // ---- REAL MRR from bKash Payments (status='paid') ----
  let mrr = 0
  let payingUsers = 0
  let payingOrgs = 0
  let paidCount = 0
  try {
    const since = new Date(Date.now() - THIRTY_DAYS)
    const paidPayments = await prisma.payment.findMany({
      where: { status: 'paid', createdAt: { gte: since } },
      select: { amount: true, organizationId: true, customerId: true },
    })
    mrr = Math.round(paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0))
    paidCount = paidPayments.length
    payingUsers = new Set(paidPayments.map((p) => p.customerId)).size
    // isolation pays off: orgId linkage makes MRR per-tenant measurable
    payingOrgs = new Set(paidPayments.map((p) => p.organizationId).filter(Boolean) as string[]).size
  } catch {
    /* Payment table missing or unreachable — fall through to Subscription */
  }

  // ---- Fallback: Subscription (active business plans) ----
  if (payingUsers === 0) {
    try {
      const agg = await prisma.subscription.aggregate({
        _sum: { price: true },
        where: { plan: 'business', status: 'active' },
      })
      mrr = mrr || Math.round(agg._sum.price || 0)
      payingUsers = await prisma.subscription.count({ where: { plan: 'business', status: 'active' } })
    } catch {
      /* Subscription table missing or unreachable — leave 0s */
    }
  }

  const qdrantPoints = await countQdrantPoints().catch(() => 0)
  const contentCount = countContentMdx()
  const reportsCount = countReports()

  return {
    mrr,
    payingUsers,
    payingOrgs,
    currency: 'BDT',
    paidCount,
    qdrantPoints,
    contentCount,
    reportsCount,
    asOf: new Date().toISOString(),
  }
}

async function countQdrantPoints(): Promise<number> {
  const res = await fetch(`${QDRANT_URL}/collections/${QDRANT_COLLECTION}`, {
    method: 'GET',
    signal: AbortSignal.timeout(4000),
  })
  if (!res.ok) return 0
  const data = (await res.json()) as { result?: { points_count?: number } }
  return data.result?.points_count ?? 0
}

function countContentMdx(): number {
  const dir = path.join(process.cwd(), 'content', 'blog')
  try {
    return fs.readdirSync(dir).filter((f) => f.endsWith('.mdx')).length
  } catch {
    return 0
  }
}

function countReports(): number {
  const dir = path.join(process.cwd(), 'working', 'reports')
  try {
    return fs.readdirSync(dir).filter((f) => f.endsWith('.md') || f.endsWith('.json')).length
  } catch {
    return 0
  }
}
