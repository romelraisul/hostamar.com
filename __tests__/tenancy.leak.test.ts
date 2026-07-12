// =============================================================================
// __tests__/tenancy.leak.test.ts
//
// Tenant isolation leak tests (PR d). Exercises the real primitives
// (getCurrentOrg, withTenant, getOrgFromRequest) with an in-memory mock of the
// Prisma client — no DB required, fully deterministic, 6/6.
//
// TASK 6 cases:
//  1) withTenant throws TENANT_REQUIRED when orgId missing
//  2) getOrgFromRequest with expectedOrgId mismatch -> TENANT_MISMATCH
//  3) withTenant merges organizationId alongside existing where keys
//  4) GLOBAL models carry NO organizationId (schema-level assertion)
//  5) getCurrentOrg returns isDefault=true membership first
//  6) backfill invariant — every membership-backed customer resolves an org
// =============================================================================
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// NOTE: the Prisma client is replaced by __tests__/prisma-mock.ts via the
// '@/lib/prisma' alias in vitest.config.ts, so getCurrentOrg runs DB-free
// against a fixed in-memory membership set:
//   cA -> [m1 orgA (isDefault), m2 orgA2], cB -> [m3 orgB (isDefault)]

import { getCurrentOrg, withTenant, getOrgFromRequest, TenantError } from '@/lib/tenancy/tenant'

describe('TASK 6 — tenant isolation leak tests', () => {
  it('1) withTenant throws TENANT_REQUIRED when orgId is empty', () => {
    expect(() => withTenant('', { where: { customerId: 'cA' } })).toThrow(TenantError)
    try {
      withTenant('', { where: {} })
    } catch (e) {
      expect((e as InstanceType<typeof TenantError>).code).toBe('TENANT_REQUIRED')
    }
  })

  it('2) getOrgFromRequest mismatch -> TENANT_MISMATCH', async () => {
    const req = new Request('https://x/api/videos?org=orgB', {
      headers: { 'x-org-id': 'orgA' },
    })
    await expect(getOrgFromRequest(req, { expectedOrgId: 'orgB' })).rejects.toMatchObject({
      code: 'TENANT_MISMATCH',
    })
  })

  it('3) withTenant merges organizationId alongside existing where keys', () => {
    const out = withTenant('orgA', { where: { customerId: 'cA' }, take: 10 })
    expect(out.where).toEqual({ customerId: 'cA', organizationId: 'orgA' })
    expect((out as any).take).toBe(10) // query shape preserved
  })

  it('4) GLOBAL models carry no organizationId (schema-level assertion)', () => {
    const schema = fs.readFileSync(path.resolve(__dirname, '../prisma/schema.prisma'), 'utf8')
    for (const model of ['Goal', 'AutonomousTask', 'TaskRunLog']) {
      // Anchor to a line that is exactly "model <Name> {" so prefix collisions
      // (e.g. GoalXxx) don't break the slice.
      const re = new RegExp(`^model ${model} \\{[\\s\\S]*?\\n\\}`, 'm')
      const block = schema.match(re)?.[0] ?? ''
      expect(block.length).toBeGreaterThan(0)
      expect(block).not.toMatch(/organizationId/)
      expect(block).toMatch(/GLOBAL \(Decision B\)/)
    }
  })

  it('5) isDefault backfill: customer with 2 memberships returns isDefault=true org', async () => {
    const org = await getCurrentOrg('cA')
    expect(org).toBe('orgA') // m1 isDefault=true, not orgA2
  })

  it('6) backfill invariant: every membership-backed customer resolves an org', async () => {
    for (const c of ['cA', 'cB']) {
      expect(await getCurrentOrg(c)).toBeTruthy()
    }
    // a customer with NO membership throws (would be an orphan video)
    await expect(getCurrentOrg('ghost')).rejects.toMatchObject({ code: 'NO_ORG_MEMBERSHIP' })
  })
})
