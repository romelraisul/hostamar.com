export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { verifyBkashTransaction, BKASH_AMOUNTS, BKASH_TRX_REGEX } from '@/lib/bkash'

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({} as any))
    const { trxId, amount, phone } = body as { trxId?: string; amount?: number; phone?: string }

    // Basic presence
    if (!trxId || amount === undefined || amount === null) {
      return NextResponse.json(
        { error: 'Missing trxId or amount', required: { trxId: 'string 10 chars A-Z0-9', amount: BKASH_AMOUNTS }, hint: 'POST {trxId, amount, phone?}' },
        { status: 400 }
      )
    }

    // Quick regex check without DB (allows curl verify without DB)
    const normalized = String(trxId).trim().toUpperCase()
    if (!BKASH_TRX_REGEX.test(normalized)) {
      return NextResponse.json(
        { error: 'INVALID_TRXID', message: 'TrxID must match ^[A-Z0-9]{10}$ (10 uppercase alphanum)', got: trxId },
        { status: 400 }
      )
    }
    const amt = Number(amount)
    if (!BKASH_AMOUNTS.includes(amt)) {
      return NextResponse.json(
        { error: 'INVALID_AMOUNT', message: `amount must be one of ${BKASH_AMOUNTS.join(', ')}`, got: amount },
        { status: 400 }
      )
    }

    // Optional phone validation (BD mobile, but not required)
    if (phone && !/^01[3-9]\d{8}$/.test(String(phone).replace(/\s/g, ''))) {
      // warn but don't block — phone is optional for bKash auto-verify
      // allow with 01 prefix or +880
      const cleaned = String(phone).replace(/\s/g, '').replace(/^\+88/, '')
      if (!/^01[3-9]\d{8}$/.test(cleaned)) {
        return NextResponse.json({ error: 'INVALID_PHONE', message: 'phone must be 01XXXXXXXXX (BD mobile)' }, { status: 400 })
      }
    }

    const result = await verifyBkashTransaction({
      trxId: normalized,
      amount: amt,
      phone: phone ? String(phone).trim() : undefined,
      userId: authUser.id,
      userEmail: authUser.email,
      userName: authUser.name,
    })

    // Success: {status: approved, credits, invoiceUrl}
    return NextResponse.json({
      status: result.status,
      credits: result.credits,
      plan: result.plan,
      invoiceUrl: result.invoiceUrl || null,
      transactionId: result.transactionId,
      trxId: normalized,
    })
  } catch (err: any) {
    const code = err?.code || ''
    const status = err?.status || 500
    if (code === 'INVALID_TRXID' || code === 'INVALID_AMOUNT') {
      return NextResponse.json({ error: code, message: err.message }, { status: 400 })
    }
    if (code === 'DUPLICATE_TRXID') {
      return NextResponse.json({ error: code, message: err.message, status: 'duplicate' }, { status: 409 })
    }
    if (code === 'CUSTOMER_NOT_FOUND') {
      return NextResponse.json({ error: code, message: err.message }, { status: 404 })
    }
    console.error('[bkash/verify] error:', err?.message || err)
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: err?.message || 'Verification failed' }, { status })
  }
}

// GET for health / curl probe without DB (regex-only)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const trxId = searchParams.get('trxId') || ''
  const amount = searchParams.get('amount')
  const amtNum = amount ? Number(amount) : null

  // If no params, return spec (allows curl without DB to discover contract)
  if (!trxId && !amount) {
    return NextResponse.json({
      ok: true,
      endpoint: 'POST /api/payments/bkash/verify',
      body: { trxId: 'string ^[A-Z0-9]{10}$', amount: BKASH_AMOUNTS, phone: 'optional 01XXXXXXXXX' },
      returns: { status: 'approved', credits: '6000|13000|30000', invoiceUrl: 'string | null' },
      validation: { regex: BKASH_TRX_REGEX.source, amounts: BKASH_AMOUNTS, buttonColor: '#E2136E', zeroCardFallback: true },
    })
  }

  const id = trxId.trim().toUpperCase()
  const regexOk = !trxId || BKASH_TRX_REGEX.test(id)
  const amountOk = amtNum === null ? null : BKASH_AMOUNTS.includes(amtNum)
  return NextResponse.json({
    trxId: id || null,
    amount: amtNum,
    regexOk,
    amountOk,
    valid: regexOk && amountOk,
    amounts: BKASH_AMOUNTS,
    regex: BKASH_TRX_REGEX.source,
  })
}
