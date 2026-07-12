// ============================================================================
// Unit tests for SSO policy (JIT provisioning, attribute mapping, enforcement).
// Pure functions need no DB; JIT needs a live postgres (run against disposable).
// Run: DATABASE_URL=postgresql://hostamar:***@localhost:5434/hostamar npx tsx lib/sso/saml.policy.test.ts
// ============================================================================
import assert from 'node:assert/strict'
import { mapProfile, isSsoEnforcedSession, jitProvision, DEFAULT_ATTRIBUTE_MAP } from './policy'

let passed = 0
function ok(name: string) {
  passed++
  console.log(`  ✓ ${name}`)
}

// --- pure: attribute mapping -------------------------------------------------
{
  const claims = {
    [DEFAULT_ATTRIBUTE_MAP.email]: 'jane@acme.com',
    [DEFAULT_ATTRIBUTE_MAP.firstName]: 'Jane',
    [DEFAULT_ATTRIBUTE_MAP.lastName]: 'Doe',
    nameID: 'jane@acme.com',
  }
  const p = mapProfile(claims)
  assert.equal(p.email, 'jane@acme.com')
  assert.equal(p.firstName, 'Jane')
  assert.equal(p.lastName, 'Doe')
  ok('mapProfile maps standard claims')
}

// --- pure: missing email throws ---------------------------------------------
{
  let threw = false
  try { mapProfile({ [DEFAULT_ATTRIBUTE_MAP.firstName]: 'No' }) } catch { threw = true }
  assert.equal(threw, true)
  ok('mapProfile throws when email claim missing')
}

// --- pure: enforcement flag --------------------------------------------------
{
  assert.equal(isSsoEnforcedSession({ slug: 'acme', ssoEnforced: false }, 'saml:acme'), false)
  assert.equal(isSsoEnforcedSession({ slug: 'acme', ssoEnforced: true }, 'saml:acme'), true)
  // enforced but wrong provider => blocked
  assert.equal(isSsoEnforcedSession({ slug: 'acme', ssoEnforced: true }, 'password'), false)
  // enforced but no provider => blocked
  assert.equal(isSsoEnforcedSession({ slug: 'acme', ssoEnforced: true }, null), false)
  ok('isSsoEnforcedSession gates by provider')
}

// --- DB-backed: JIT provisioning (only runs if DATABASE_URL provided) --------
const DATABASE_URL = process.env.DATABASE_URL
;(async () => {
if (DATABASE_URL) {
  const { prisma } = await import('@/lib/prisma')

  // seed org (uses raw SQL so it works regardless of prior state)
  await prisma.$executeRawUnsafe(`
    INSERT INTO "Organization" ("id","slug","name","domain","ssoEnforced","createdAt","updatedAt")
    VALUES ('org-test','acme','Acme','acme.com',true,now(),now())
    ON CONFLICT ("slug") DO NOTHING;
  `)

  // first login -> creates customer + membership
  const r1 = await jitProvision(
    { email: 'newbie@acme.com', firstName: 'New', lastName: 'Bie', nameId: 'newbie@acme.com' },
    'acme'
  )
  assert.equal(r1.isNew, true)
  assert.equal(r1.membershipCreated, true)
  assert.equal(r1.customer.ssoProvider, 'saml:acme')
  ok('jitProvision creates new customer + membership')

  // second login -> finds existing, no new membership
  const r2 = await jitProvision(
    { email: 'newbie@acme.com', nameId: 'newbie@acme.com' },
    'acme'
  )
  assert.equal(r2.isNew, false)
  assert.equal(r2.membershipCreated, false)
  ok('jitProvision is idempotent (find-or-create)')

  // unknown tenant -> throws
  let threw = false
  try { await jitProvision({ email: 'x@y.com', nameId: 'x@y.com' }, 'nope') } catch { threw = true }
  assert.equal(threw, true)
  ok('jitProvision rejects unknown tenant')

  await prisma.$disconnect()
} else {
  console.log('  (skipping DB-backed JIT tests — set DATABASE_URL to run)')
}
})().then(() => {
  console.log(`\nPASS ${passed} assertions`)
}).catch((e) => {
  console.error('TEST FAILED:', e)
  process.exit(1)
})
