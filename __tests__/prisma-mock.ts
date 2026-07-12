// In-memory Prisma stand-in for unit tests (no DB).
// Only the surface lib/tenancy/tenant.ts touches is implemented.
const memberships = [
  { id: 'm1', customerId: 'cA', organizationId: 'orgA', isDefault: true },
  { id: 'm2', customerId: 'cA', organizationId: 'orgA2', isDefault: false },
  { id: 'm3', customerId: 'cB', organizationId: 'orgB', isDefault: true },
]

export const prisma = {
  membership: {
    findFirst: async (q: any) => {
      const rows = memberships.filter((m) => m.customerId === q.where.customerId)
      if (!rows.length) return null
      if (q.where.isDefault === true) return rows.find((m) => m.isDefault) || null
      return [...rows].sort((a, b) => a.id.localeCompare(b.id))[0]
    },
  },
}

export default prisma
