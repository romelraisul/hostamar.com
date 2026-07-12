// ============================================================================
// measureMRR — real KPI measurement for the dynamic Goal loop.
// Computes MRR + paying-users (Business plan ৳3500) from the live DB, plus
// best-effort context signals (Qdrant points, content/reports counts).
// Every probe is wrapped so a missing table / unreachable service never throws
// — the goal loop must keep ticking even when a dependency is down.
// ============================================================================
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

export interface MrRMetrics {
  mrr: number
  payingUsers: number
  currency: string
  qdrantPoints: number
  contentCount: number
  reportsCount: number
  asOf: string
}

const QDRANT_URL = (process.env.QDRANT_PUBLIC_URL || 'http://localhost:8200').replace(/\/$/, '')
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || 'hostamar_kb'

export async function measureMRR(): Promise<MrRMetrics> {
  let mrr = 0
  let payingUsers = 0
  try {
    const agg = await prisma.subscription.aggregate({
      _sum: { price: true },
      where: { plan: 'business', status: 'active' },
    })
    mrr = Math.round(agg._sum.price || 0)
    payingUsers = await prisma.subscription.count({
      where: { plan: 'business', status: 'active' },
    })
  } catch {
    /* Subscription table missing or unreachable — return 0s */
  }

  // Fallback: if the Subscription table has no active business plans yet,
  // derive paying users from real Payments in the last 30 days. Payment.status
  // is 'paid' or 'completed' across the codebase; organizationId is nullable
  // (PR d backfill) so we intentionally do NOT scope by it here.
  if (payingUsers === 0) {
    try {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      payingUsers = await prisma.payment.count({
        where: { status: { in: ['paid', 'completed'] }, createdAt: { gte: since } },
      })
      if (mrr === 0 && payingUsers > 0) {
        const paidAgg = await prisma.payment.aggregate({
          _sum: { amount: true },
          where: { status: { in: ['paid', 'completed'] }, createdAt: { gte: since } },
        })
        mrr = Math.round(paidAgg._sum.amount || 0)
      }
    } catch {
      /* Payment table missing or unreachable — leave 0s */
    }
  }

  const qdrantPoints = await countQdrantPoints().catch(() => 0)
  const contentCount = countContentMdx()
  const reportsCount = countReports()

  return {
    mrr,
    payingUsers,
    currency: 'BDT',
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
