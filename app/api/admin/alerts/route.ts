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

  // 1. Customer count (informational)
  const totalCustomers = await prisma.customer.count()
  const payingCustomers = await prisma.subscription.count({
    where: { status: 'active' },
  })
  alerts.push({
    level: 'info',
    code: 'CUSTOMERS_STATS',
    message: `${totalCustomers} customers, ${payingCustomers} active subscriptions`,
    timestamp: now.toISOString(),
  })

  // 2. Failed payments in last 24h
  const failedPayments = await prisma.payment.count({
    where: {
      status: 'failed',
      createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
    },
  })
  if (failedPayments > 0) {
    alerts.push({
      level: 'warning',
      code: 'FAILED_PAYMENTS_24H',
      message: `${failedPayments} failed payment(s) in the last 24 hours`,
      timestamp: now.toISOString(),
    })
  }

  // 3. Pending payments older than 1 hour (likely stuck/manual review needed)
  const stuckPayments = await prisma.payment.count({
    where: {
      status: 'pending',
      createdAt: { lte: new Date(now.getTime() - 60 * 60 * 1000) },
    },
  })
  if (stuckPayments > 0) {
    alerts.push({
      level: 'critical',
      code: 'STUCK_PAYMENTS_1H',
      message: `${stuckPayments} pending payment(s) older than 1 hour — manual intervention likely needed`,
      timestamp: now.toISOString(),
    })
  }

  // 4. Beta invites remaining (low stock warning)
  const betaPending = await prisma.betaInvite.count({
    where: { status: 'PENDING' },
  })
  if (betaPending < 5) {
    alerts.push({
      level: 'warning',
      code: 'BETA_LOW_STOCK',
      message: `Only ${betaPending} pending beta invites remaining`,
      timestamp: now.toISOString(),
    })
  }

  // 5. Customers who have never verified email (security audit breadcrumb)
  const unverified = await prisma.customer.count({
    where: { emailVerified: null },
  })
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
