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

// V30 — videoQueue + video tables (seeded via __seedVideoQueue/__seedVideos).
let queueRows: any[] = []
let videoRows: any[] = []

export function __seedVideoQueue(rows: any[]) {
  queueRows = rows
}
export function __seedVideos(rows: any[]) {
  videoRows = rows
}
export function __resetVideoQueue() {
  queueRows = []
  videoRows = []
}
export function __getQueueRows() {
  return queueRows
}
export function __getVideoRows() {
  return videoRows
}

function matchQueueWhere(r: any, where: any): boolean {
  if (!where) return true
  for (const entry of Object.entries(where) as [string, any][]) {
    const k = entry[0]
    const v = entry[1]
    if (k === 'OR') {
      if (!v.some((cond: any) => matchQueueWhere(r, cond))) return false
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      const fv = v as Record<string, unknown>
      // Prisma object filters: {in: [...]}, {lt: date}, {gte: ...}
      if ('in' in fv) {
        const list = fv.in as any[]
        if (!list.includes((r as any)[k]) && !((r as any)[k] === undefined && list.includes(null))) return false
      } else if ('lt' in fv) {
        const cur = (r as any)[k]
        if (!cur || !(new Date(cur) < new Date(fv.lt as any))) return false
      } else if ('gte' in fv) {
        const cur = (r as any)[k]
        if (!cur || !(new Date(cur) >= new Date(fv.gte as any))) return false
      } else {
        return false
      }
    } else if (Array.isArray(v)) {
      if (!v.includes((r as any)[k])) return false
    } else if ((r as any)[k] !== v) {
      return false
    }
  }
  return true
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
  // V30 — VideoQueue surface (queue/next, queue/fail, upload/complete).
  videoQueue: {
    findFirst: async (q: any) => {
      const cands = queueRows
        .filter((r) => matchQueueWhere(r, q?.where))
        .sort(
          (a, b) =>
            (a.priority - b.priority) || (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
        )
      return cands[0] || null
    },
    updateMany: async (q: any) => {
      let count = 0
      for (const r of queueRows) {
        if (!matchQueueWhere(r, q?.where)) continue
        if (q.data.attempts?.increment) r.attempts = (r.attempts || 0) + q.data.attempts.increment
        const { attempts, ...rest } = q.data
        Object.assign(r, rest)
        count++
      }
      return { count }
    },
    update: async (q: any) => {
      const r = queueRows.find((x) => x.id === q.where.id)
      if (r) Object.assign(r, q.data)
      return r || null
    },
  },
  video: {
    findUnique: async (q: any) => videoRows.find((r) => r.id === q.where.id) || null,
    findFirst: async (q: any) => {
      const w = q?.where || {}
      return (
        videoRows.find((r) => {
          if (w.id && r.id !== w.id) return false
          if (w.customerId && r.customerId !== w.customerId) return false
          return true
        }) || null
      )
    },
    findMany: async (q: any) => {
      const w = q?.where || {}
      return videoRows.filter((r) => {
        if (w.customerId && r.customerId !== w.customerId) return false
        if (w.status && r.status !== w.status) return false
        if (w.updatedAt?.lt && new Date(r.updatedAt) >= new Date(w.updatedAt.lt)) return false
        return true
      })
    },
    update: async (q: any) => {
      const r = videoRows.find((x) => x.id === q.where.id)
      if (r) Object.assign(r, q.data)
      return r || null
    },
  },
}

export default prisma
