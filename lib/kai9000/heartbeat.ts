/**
 * heartbeat.ts — V8 Phase B. Finds stuck ServiceOrders and notifies owners.
 * Correction to the spec: ServiceOrder has NO updatedAt column — stuck means
 * status=collecting_material AND createdAt older than 2h. Dedupe: one
 * HEARTBEAT notification per customer per 24h (no spam).
 */
import prisma from '@/lib/prisma'
import { isOverBudget } from './budget-governor'

export type StuckOrder = { id: string; userId: string; serviceId: string; serviceName: string; createdAt: Date }

export async function findStuckOrders(olderThanHours = 2): Promise<StuckOrder[]> {
  try {
    const rows: any[] = await prisma.$queryRaw`
      SELECT o.id, o."userId", o."serviceId", o."createdAt", COALESCE(s.name, o."serviceId") AS "serviceName"
      FROM "ServiceOrder" o LEFT JOIN "ServiceCatalog" s ON s.id = o."serviceId"
      WHERE o.status = 'collecting_material'
        AND o."createdAt" < now() - (${olderThanHours} || ' hours')::interval
      ORDER BY o."createdAt" ASC LIMIT 50`
    return (Array.isArray(rows) ? rows : []).map(r => ({
      id: String(r.id), userId: String(r.userId), serviceId: String(r.serviceId),
      serviceName: String(r.serviceName || r.serviceId), createdAt: new Date(r.createdAt),
    }))
  } catch { return [] }
}

async function notifiedRecently(customerId: string): Promise<boolean> {
  try {
    const rows: any[] = await prisma.$queryRaw`
      SELECT id FROM "Notification" WHERE "customerId" = ${customerId} AND type = 'HEARTBEAT'
        AND "createdAt" > now() - interval '24 hours' LIMIT 1`
    return Array.isArray(rows) && rows.length > 0
  } catch { return true } // fail closed: don't spam on error
}

/** Notify owners of stuck orders. Skips over-budget users (governor) + 24h dedupe. */
export async function heartbeatTick(): Promise<{ stuck: number; notified: number; skippedBudget: number; skippedDedupe: number }> {
  const stuck = await findStuckOrders()
  let notified = 0, skippedBudget = 0, skippedDedupe = 0
  for (const o of stuck) {
    const cust = await prisma.customer.findUnique({ where: { id: o.userId }, select: { id: true } }).catch(() => null)
    if (!cust) continue
    const { over } = await isOverBudget(cust.id)
    if (over) { skippedBudget++; continue }
    if (await notifiedRecently(cust.id)) { skippedDedupe++; continue }
    try {
      await prisma.notification.create({
        data: {
          customerId: cust.id, type: 'HEARTBEAT',
          title: `আপনার ${o.serviceName} এর জন্য তথ্য বাকি আছে`,
          message: `অর্ডারটি ২ ঘণ্টার বেশি সময় ধরে তথ্যের অপেক্ষায় আছে। ড্যাশবোর্ড থেকে বাকি তথ্য দিন।`,
          actionUrl: '/dashboard',
        },
      })
      notified++
    } catch {}
  }
  return { stuck: stuck.length, notified, skippedBudget, skippedDedupe }
}
