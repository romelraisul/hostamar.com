// In-memory Prisma stand-in for unit tests (no DB).
// Surface used by lib/tenancy/tenant.ts, measureMRR.ts, and the bKash tests.
const memberships = [
  { id: 'm1', customerId: 'cA', organizationId: 'orgA', isDefault: true },
  { id: 'm2', customerId: 'cA', organizationId: 'orgA2', isDefault: false },
  { id: 'm3', customerId: 'cB', organizationId: 'orgB', isDefault: true },
]

// Payment table (seeded by tests via __seedPayments).
let payments: any[] = []

export function __seedPayments(rows: any[]) {
  payments = rows
}
export function __resetPayments() {
  payments = []
}

export const prisma = {
  membership: {
    findFirst: async (q: any) => {
      const rows = memberships.filter((m) => m.customerId === q.where.customerId)
      if (!rows.length) return null
      if (q.where.isDefault === true) return rows.find((m) => m.isDefault) || null
      return [...rows].sort((a, b) => a.id.localeCompare(b.id))[0]
    },
  },
  payment: {
    create: async (q: any) => {
      const row = { id: 'p_' + payments.length, ...q.data }
      payments.push(row)
      return row
    },
    findFirst: async (q: any) => {
      const where = q?.where || {}
      return (
        payments.find((p) => {
          if (where.providerPaymentId && p.providerPaymentId !== where.providerPaymentId) return false
          if (where.invoiceNumber && p.invoiceNumber !== where.invoiceNumber) return false
          if (where.customerId && p.customerId !== where.customerId) return false
          if (where.status && p.status !== where.status) return false
          return true
        }) || null
      )
    },
    findMany: async (q: any) => {
      const where = q?.where || {}
      return payments.filter((p) => {
        if (where.status && p.status !== where.status) return false
        if (where.createdAt?.gte && new Date(p.createdAt) < where.createdAt.gte) return false
        return true
      })
    },
    update: async (q: any) => {
      const idx = payments.findIndex((p) => p.id === q.where.id)
      if (idx < 0) return null
      payments[idx] = { ...payments[idx], ...q.data }
      return payments[idx]
    },
  },
  subscription: {
    aggregate: async () => ({ _sum: { price: 0 } }),
    count: async () => 0,
    findMany: async () => [],
  },
}

export default prisma
