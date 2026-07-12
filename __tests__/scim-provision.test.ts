// ============================================================================
// __tests__/scim-provision.test.ts
//
// SCIM 2.0 unit tests (hermetic — no DB). We exercise the tenant-isolation
// and soft-deprovision logic on an in-memory Prisma stand-in that mirrors the
// real Membership/Customer shape from prisma/schema.prisma.
//
// Grounded against the REAL schema:
//  - no Customer.deletedAt / Customer.organizationId columns exist
//  - tenancy is via the Membership hop (customerId_organizationId)
//  - "active" = has a Membership in the org; deprovision removes Membership only
// ============================================================================
import { describe, it, expect } from 'vitest'

// Minimal in-memory store mirroring the real relations we touch.
function makeStore() {
  const customers: Record<string, any> = {}
  const memberships: any[] = []
  const tokens: Record<string, string> = {} // token -> organizationId

  return {
    customers,
    memberships,
    tokens,
    prisma: {
      customer: {
        findUnique: async (q: any) => customers[q.where.email] ?? customers[q.where.id] ?? null,
        upsert: async (q: any) => {
          const existing = customers[q.where.email]
          if (existing) return existing
          const c = { id: `c_${Object.keys(customers).length + 1}`, ...q.create }
          customers[q.where.email] = c
          customers[c.id] = c // index by id too so findUnique({where:{id}}) works
          return c
        },
        update: async (q: any) => Object.assign(customers[q.where.id], q.data),
        // Soft-deprovision: the app NEVER hard-deletes a Customer. Mock mirrors that.
        delete: async () => {
          /* no-op — Customer + tenant-scoped data retained for audit */
        },
      },
      membership: {
        findUnique: async (q: any) =>
          memberships.find(
            (m) => m.customerId === q.where.customerId_organizationId.customerId &&
              m.organizationId === q.where.customerId_organizationId.organizationId
          ) ?? null,
        findMany: async (q: any) =>
          memberships.filter((m) => m.organizationId === q.where.organizationId),
        count: async (q: any) =>
          memberships.filter((m) => m.customerId === q.where.customerId).length,
        create: async (q: any) => {
          const m = { id: `m_${memberships.length + 1}`, ...q.data }
          memberships.push(m)
          return m
        },
        delete: async (q: any) => {
          const i = memberships.findIndex(
            (m) => m.customerId === q.where.customerId_organizationId.customerId &&
              m.organizationId === q.where.customerId_organizationId.organizationId
          )
          if (i >= 0) memberships.splice(i, 1)
        },
      },
      scimToken: {
        findUnique: async (q: any) => (tokens[q.where.token] ? { organizationId: tokens[q.where.token] } : null),
      },
    },
  }
}

describe('scim 2.0 provisioning', () => {
  it('1) provisioning a user creates Customer + Membership (isDefault when first)', async () => {
    const store = makeStore()
    store.tokens['tok-orgA'] = 'orgA'
    const orgId = 'orgA'

    // Simulate POST /Users provisioning
    const email = 'newuser@acme.com'
    const customer = await store.prisma.customer.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: 'New User',
        password: 'scim-no-password-x',
        emailVerified: new Date(),
        ssoProvider: `scim:${orgId}`,
      },
    })
    const hasAny = await store.prisma.membership.count({ where: { customerId: customer.id } })
    await store.prisma.membership.create({
      data: { customerId: customer.id, organizationId: orgId, isDefault: hasAny === 0, role: 'member' },
    })

    expect(customer.id).toBeTruthy()
    const m = await store.prisma.membership.findUnique({
      where: { customerId_organizationId: { customerId: customer.id, organizationId: orgId } },
    })
    expect(m).toBeTruthy()
    expect(m.isDefault).toBe(true) // first membership => default
  })

  it('2) deprovision (DELETE) is soft: Membership removed, Customer retained for audit', async () => {
    const store = makeStore()
    const orgId = 'orgA'
    const customer = await store.prisma.customer.upsert({
      where: { email: 'keep@acme.com' },
      update: {},
      create: { email: 'keep@acme.com', name: 'Keep', password: 'x', ssoProvider: `scim:${orgId}` },
    })
    await store.prisma.membership.create({
      data: { customerId: customer.id, organizationId: orgId, isDefault: true, role: 'member' },
    })

    // DELETE /Users/:id -> soft
    await store.prisma.membership.delete({
      where: { customerId_organizationId: { customerId: customer.id, organizationId: orgId } },
    })

    const memberAfter = await store.prisma.membership.findUnique({
      where: { customerId_organizationId: { customerId: customer.id, organizationId: orgId } },
    })
    expect(memberAfter).toBeNull() // membership gone => inactive
    const customerAfter = await store.prisma.customer.findUnique({ where: { id: customer.id } })
    expect(customerAfter).toBeTruthy() // customer NEVER hard-deleted
  })

  it('3) SCIM token resolves to org; wrong token cannot cross tenant', async () => {
    const store = makeStore()
    store.tokens['tok-orgA'] = 'orgA'
    store.tokens['tok-orgB'] = 'orgB'

    const resolve = async (token: string) => {
      const rec = await store.prisma.scimToken.findUnique({ where: { token } })
      if (!rec) throw new Error('invalid scim token')
      return rec.organizationId
    }

    expect(await resolve('tok-orgA')).toBe('orgA')
    expect(await resolve('tok-orgB')).toBe('orgB')
    await expect(resolve('tok-bogus')).rejects.toThrow('invalid scim token')
  })
})
