// ============================================================================
// Internal provision endpoint (B) — called by /api/payment/verify and by the
// support-agent tool bridge. Protected by INTERNAL_API_KEY header.
// DB-testable mock: provisions a Customer + Subscription row, no real cPanel.
// ============================================================================
import { NextRequest, NextResponse } from 'next/server'
import {
  isValidEmail,
  isValidPlan,
  getPaymentByTranId,
  upsertPayment,
  markProvisioned,
  markFailed,
  provisionAccount,
  type PlanKey,
} from '@/lib/provisioning'
import { ensureSchema } from '@/lib/ensure-schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function checkAuth(request: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false // misconfigured server refuses internal calls
  return request.headers.get('x-internal-api-key') === key
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // (B) ensure ledger table exists (self-healing on first use / after restart).
  try {
    await ensureSchema()
  } catch {
    return NextResponse.json({ error: 'schema init failed' }, { status: 503 })
  }

  let body: { email?: string; plan?: string; tran_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const { email, plan, tran_id } = body
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: 'invalid email' }, { status: 400 })
  }
  if (!plan || !isValidPlan(plan)) {
    return NextResponse.json({ error: 'invalid plan' }, { status: 400 })
  }
  if (!tran_id) {
    return NextResponse.json({ error: 'missing tran_id' }, { status: 400 })
  }

  // Ensure the ledger row exists (idempotent). This makes the endpoint
  // self-sufficient whether called directly or via /api/payment/verify, so
  // markProvisioned() always has a row to update.
  await upsertPayment({
    tranId: tran_id,
    customerEmail: email,
    plan: plan as PlanKey,
    status: 'paid',
  })

  // Idempotency: if already provisioned for this tran_id, return existing.
  const existing = await getPaymentByTranId(tran_id)
  if (existing && existing.status === 'provisioned') {
    return NextResponse.json({
      success: true,
      provisioned: true,
      idempotent: true,
      accountId: existing.accountId,
      loginUrl: existing.loginUrl,
    })
  }

  try {
    const result = await provisionAccount(email, plan as PlanKey, tran_id)
    await markProvisioned(tran_id, result)
    return NextResponse.json({
      success: true,
      provisioned: true,
      accountId: result.accountId,
      loginUrl: result.loginUrl,
    })
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'unknown'
    await markFailed(tran_id, reason).catch(() => undefined)
    return NextResponse.json({ error: 'provision failed', detail: reason }, { status: 500 })
  }
}
