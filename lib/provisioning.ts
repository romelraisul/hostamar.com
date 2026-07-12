// ============================================================================
// Provisioning ledger data layer (B) — DB-testable, no gateway/cPanel calls.
// All access goes through Prisma (the repo's existing client).
// ============================================================================
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export type PlanKey = 'free' | 'starter' | 'business'
export type LedgerStatus = 'pending' | 'paid' | 'provisioned' | 'failed'

export interface UpsertPaymentInput {
  tranId: string
  customerEmail: string
  plan: PlanKey
  amount?: number | null
  gateway?: string
  status?: LedgerStatus
  rawPayload?: unknown
}

export interface ProvisionResult {
  success: boolean
  accountId?: string
  loginUrl?: string
}

const VALID_PLANS: PlanKey[] = ['free', 'starter', 'business']

function assertPlan(plan: string): PlanKey {
  if (!VALID_PLANS.includes(plan as PlanKey)) {
    throw new Error(`invalid plan: ${plan}`)
  }
  return plan as PlanKey
}

export function isValidPlan(plan: string): plan is PlanKey {
  return VALID_PLANS.includes(plan as PlanKey)
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/** Idempotent upsert of a provisioning-ledger row keyed by tranId. */
export async function upsertPayment(input: UpsertPaymentInput) {
  const plan = assertPlan(input.plan)
  const status: LedgerStatus = input.status ?? 'paid'
  return prisma.provisioningLedger.upsert({
    where: { tranId: input.tranId },
    update: {
      status,
      customerEmail: input.customerEmail,
      plan,
      amount: input.amount ?? undefined,
      gateway: input.gateway ?? 'mock',
      rawPayload: (input.rawPayload ?? undefined) as unknown as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
    create: {
      tranId: input.tranId,
      customerEmail: input.customerEmail,
      plan,
      amount: input.amount ?? undefined,
      gateway: input.gateway ?? 'mock',
      status,
      rawPayload: (input.rawPayload ?? undefined) as unknown as Prisma.InputJsonValue,
    },
  })
}

export async function getPaymentByTranId(tranId: string) {
  return prisma.provisioningLedger.findUnique({ where: { tranId } })
}

/** Mark a ledger row as provisioned and store the account handle. */
export async function markProvisioned(
  tranId: string,
  result: ProvisionResult,
) {
  return prisma.provisioningLedger.update({
    where: { tranId },
    data: {
      status: 'provisioned',
      accountId: result.accountId ?? null,
      loginUrl: result.loginUrl ?? null,
      provisionedAt: new Date(),
      updatedAt: new Date(),
    },
  })
}

export async function markFailed(tranId: string, _reason: string) {
  return prisma.provisioningLedger.update({
    where: { tranId },
    data: { status: 'failed', updatedAt: new Date() },
  })
}

// ----------------------------------------------------------------------------
// Mock provisioning — creates/finds the Customer + Subscription in the DB.
// No real cPanel/Docker calls yet. Replace `provisionAccount` internals with
// gateway calls later; the ledger + idempotency stay the same.
// ----------------------------------------------------------------------------
const PLAN_INFO: Record<PlanKey, { plan: string; videos: number; storage: number; price: number }> = {
  free: { plan: 'FREE', videos: 5, storage: 2, price: 0 },
  starter: { plan: 'STARTER', videos: 20, storage: 10, price: 2000 },
  business: { plan: 'BUSINESS', videos: 999, storage: 500, price: 3500 },
}

export async function provisionAccount(
  customerEmail: string,
  plan: PlanKey,
  tranId: string,
): Promise<ProvisionResult> {
  const info = PLAN_INFO[plan]
  // Find-or-create customer (mock: name derived from email local-part).
  const customer = await prisma.customer.upsert({
    where: { email: customerEmail },
    update: {},
    create: {
      email: customerEmail,
      name: customerEmail.split('@')[0] || 'Customer',
      password: 'provisioned-via-bridge',
      role: 'customer',
    },
  })

  // Upsert the subscription row (idempotent per customer).
  await prisma.subscription.upsert({
    where: { customerId: customer.id },
    update: {
      plan: info.plan,
      status: 'active',
      videosPerMonth: info.videos,
      storageGB: info.storage,
      price: info.price,
      billingCycle: 'monthly',
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    },
    create: {
      customerId: customer.id,
      plan: info.plan,
      status: 'active',
      videosPerMonth: info.videos,
      storageGB: info.storage,
      price: info.price,
      billingCycle: 'monthly',
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })

  return {
    success: true,
    accountId: customer.id,
    loginUrl: `https://hostamar.com/login?provisioned=${encodeURIComponent(tranId)}`,
  }
}
