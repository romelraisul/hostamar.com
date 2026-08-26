
import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  const c = await p.customer.findFirst({ where: { email: { startsWith: 'qa-final3' } }, select: { id: true, credits: true } })
  console.log('customer:', c)
  try {
    const res = await p.$transaction(async (tx) => {
      const r = await tx.customer.updateMany({
        where: { id: c.id, credits: { gte: 28 } },
        data: { credits: { decrement: 28 } },
      })
      console.log('updateMany count:', r.count)
      if (r.count === 0) return null
      const updated = await tx.customer.findUnique({ where: { id: c.id }, select: { credits: true } })
      await tx.creditTransaction.create({
        data: { customerId: c.id, amount: -28, type: 'hosting_create', description: 'test-tx', balanceAfter: updated.credits },
      })
      return updated
    })
    console.log('tx result:', res)
  } catch (e) {
    console.error('TX ERROR:', e.message.slice(0, 300))
  }
}
main().finally(() => p.$disconnect())
