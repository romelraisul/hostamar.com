export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'

async function getTursoClient() {
  const url = (process.env.TURSO_DATABASE_URL || '').replace(/^libsql:\/\//, 'https://')
  const authToken = process.env.TURSO_AUTH_TOKEN || ''
  const { createClient } = await import('@libsql/client/web')
  return createClient({ url, authToken })
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const db = await getTursoClient()
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [
      totalCustomers,
      newCustomersThisMonth,
      totalVideos,
      videosThisMonth,
      activeServices,
      activeSubscriptions,
      totalOrders,
      completedOrders,
      totalPayments,
      completedPayments,
      monthlyOrders,
    ] = await Promise.all([
      db.execute({ sql: 'SELECT COUNT(*) as cnt FROM Customer', args: [] }).then(r => Number(r.rows[0]?.cnt || 0)),
      db.execute({ sql: 'SELECT COUNT(*) as cnt FROM Customer WHERE createdAt >= ?', args: [startOfMonth] }).then(r => Number(r.rows[0]?.cnt || 0)),
      db.execute({ sql: 'SELECT COUNT(*) as cnt FROM Video', args: [] }).then(r => Number(r.rows[0]?.cnt || 0)),
      db.execute({ sql: 'SELECT COUNT(*) as cnt FROM Video WHERE createdAt >= ?', args: [startOfMonth] }).then(r => Number(r.rows[0]?.cnt || 0)),
      db.execute({ sql: 'SELECT COUNT(*) as cnt FROM Service WHERE status = "active"', args: [] }).then(r => Number(r.rows[0]?.cnt || 0)),
      db.execute({ sql: 'SELECT COUNT(*) as cnt FROM Subscription WHERE status = "active"', args: [] }).then(r => Number(r.rows[0]?.cnt || 0)),
      db.execute({ sql: 'SELECT COUNT(*) as cnt FROM "Order"', args: [] }).then(r => Number(r.rows[0]?.cnt || 0)),
      db.execute({ sql: 'SELECT COUNT(*) as cnt FROM "Order" WHERE status = "completed"', args: [] }).then(r => Number(r.rows[0]?.cnt || 0)),
      db.execute({ sql: 'SELECT COUNT(*) as cnt FROM Payment', args: [] }).then(r => Number(r.rows[0]?.cnt || 0)),
      db.execute({ sql: 'SELECT COUNT(*) as cnt FROM Payment WHERE status = "completed"', args: [] }).then(r => Number(r.rows[0]?.cnt || 0)),
      db.execute({ sql: 'SELECT COUNT(*) as cnt FROM "Order" WHERE createdAt >= ?', args: [startOfMonth] }).then(r => Number(r.rows[0]?.cnt || 0)),
    ])

    const subs = await db.execute({ sql: 'SELECT price, "nextBillingDate" FROM Subscription WHERE status = "active"', args: [] })
    const totalRevenue = subs.rows.reduce((sum: number, row: any) => sum + (Number(row.price) || 0), 0)
    const revenueThisMonth = subs.rows
      .filter((row: any) => new Date(row.nextBillingDate) >= new Date(startOfMonth))
      .reduce((sum: number, row: any) => sum + (Number(row.price) || 0), 0)

    const recentActivity = await db.execute({ sql: 'SELECT id, action, description, "customerId", "createdAt" FROM "ActivityLog" ORDER BY "createdAt" DESC LIMIT 20', args: [] })

    const stats = {
      totalCustomers,
      newCustomersThisMonth,
      totalVideos,
      videosThisMonth,
      activeServices,
      activeSubscriptions,
      totalOrders,
      completedOrders,
      totalRevenue,
      revenueThisMonth,
      totalPayments,
      completedPayments,
      monthlyOrders,
    }

    const formattedActivity = recentActivity.rows.map((activity: any) => ({
      id: activity.id,
      action: activity.action,
      description: activity.description,
      customerEmail: activity.customerId ? 'Customer' : 'System',
      createdAt: new Date(activity.createdAt).toISOString(),
    }))

    return NextResponse.json({ stats, recentActivity: formattedActivity })
  } catch (e: any) {
    const msg = e?.message || 'error'
    const status = msg.includes('UNAUTHORIZED') ? 401 : msg.includes('FORBIDDEN') ? 403 : 500
    return NextResponse.json({ stats: {}, recentActivity: [], error: msg }, { status })
  }
}