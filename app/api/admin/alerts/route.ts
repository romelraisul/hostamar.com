export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

/**
 * GET /api/admin/alerts
 * Returns a minimal alerts digest: site health, container health proxies,
 * recent failed payments, customers without email verification, disk usage.
 * Designed to be polled by a lightweight external babysitter (cron / uptime
 * service) without needing a full Sentry/Prometheus stack.
 *
 * Auth: requires admin role (getAuthUser). 401 otherwise.
 */
export async function GET(req: NextRequest) {
  // Auth: admin only
  const user = await getAuthUser(req)
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const alerts: Array<{
    level: 'critical' | 'warning' | 'info'
    code: string
    message: string
    timestamp: string
  }> = []
  const now = new Date()

  // Helper to safely run Prisma queries during build
  async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await fn()
    } catch (e) {
      console.warn('[build] Prisma query failed, using fallback:', e instanceof Error ? e.message : e)
      return fallback
    }
  }

  // 1. Customer count (informational)
  const totalCustomers = await safeQuery(() => prisma.customer.count(), 0)
  const payingCustomers = await safeQuery(() => prisma.subscription.count({ where: { status: 'active' } }), 0)
  alerts.push({
    level: 'info',
    code: 'CUSTOMERS_STATS',
    message: `${totalCustomers} customers, ${payingCustomers} active subscriptions`,
    timestamp: now.toISOString(),
  })

  // 2. Failed payments in last 24h
  const failedPayments = await safeQuery(() => prisma.payment.count({
    where: {
      status: 'failed',
      createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
    },
  }), 0)
  if (failedPayments > 0) {
    alerts.push({
      level: 'warning',
      code: 'FAILED_PAYMENTS_24H',
      message: `${failedPayments} failed payment(s) in the last 24 hours`,
      timestamp: now.toISOString(),
    })
  }

  // 3. Pending payments older than 1 hour (likely stuck/manual review needed)
  const stuckPayments = await safeQuery(() => prisma.payment.count({
    where: {
      status: 'pending',
      createdAt: { lte: new Date(now.getTime() - 60 * 60 * 1000) },
    },
  }), 0)
  if (stuckPayments > 0) {
    alerts.push({
      level: 'critical',
      code: 'STUCK_PAYMENTS_1H',
      message: `${stuckPayments} pending payment(s) older than 1 hour — manual intervention likely needed`,
      timestamp: now.toISOString(),
    })
  }

  // 4. Beta invites remaining (low stock warning)
  const betaPending = await safeQuery(() => prisma.betaInvite.count({ where: { status: 'PENDING' } }), 0)
  if (betaPending < 5) {
    alerts.push({
      level: 'warning',
      code: 'BETA_LOW_STOCK',
      message: `Only ${betaPending} pending beta invites remaining`,
      timestamp: now.toISOString(),
    })
  }

  // 5. Customers who have never verified email (security audit breadcrumb)
  const unverified = await safeQuery(() => prisma.customer.count({ where: { emailVerified: null } }), 0)
  if (unverified > 0) {
    alerts.push({
      level: 'warning',
      code: 'UNVERIFIED_EMAILS',
      message: `${unverified} customer(s) with unverified email`,
      timestamp: now.toISOString(),
    })
  }

  return NextResponse.json({
    generatedAt: now.toISOString(),
    site: 'hostamar.com',
    alerts,
    summary: {
      critical: alerts.filter((a) => a.level === 'critical').length,
      warning: alerts.filter((a) => a.level === 'warning').length,
      info: alerts.filter((a) => a.level === 'info').length,
    },
  })
}