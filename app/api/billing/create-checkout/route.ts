// POST /api/billing/create-checkout — protected. Creates a pending Payment and
// returns a bKash tokenized-checkout URL. Tenant resolved via getCurrentOrg
// (Decision A) when orgId is omitted. Amounts in BDT (Float) per Payment model.
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-auth-user'
import { prisma } from '@/lib/prisma'
import { getCurrentOrg } from '@/lib/tenancy/tenant'
import { createPayment, makeOrderId } from '@/lib/payment/bkash'
import { validateBody, toErrorResponse } from '@/lib/api/validator'
import { z } from 'zod'

export const runtime = 'nodejs'

const PLAN_AMOUNT: Record<string, number> = { business: 3500, agency: 7000 }

const schema = z.object({
  plan: z.enum(['business', 'agency']),
  orgId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: z.infer<typeof schema>
  try {
    body = await validateBody(req, schema, 4096)
  } catch (e) {
    return toErrorResponse(e)
  }

  // Decision A: default org = the customer's isDefault Membership.
  const orgId = body.orgId || (await getCurrentOrg(user.id))
  if (!orgId) {
    return NextResponse.json({ error: 'no_organization', message: 'Create an organization first.' }, { status: 400 })
  }

  const amount = PLAN_AMOUNT[body.plan]
  const orderId = makeOrderId()
  const invoiceNumber = `${orgId}-${orderId}-${Date.now()}`

  const payment = await prisma.payment.create({
    data: {
      customerId: user.id,
      organizationId: orgId,
      method: 'bkash',
      amount, // BDT (Float)
      currency: 'BDT',
      status: 'pending',
      planName: body.plan,
      invoiceNumber,
    },
  })

  try {
    const { bkashURL, paymentID } = await createPayment({ amount, orderId, orgId, customerId: user.id })
    await prisma.payment.update({
      where: { id: payment.id },
      data: { providerPaymentId: paymentID },
    })
    return NextResponse.json({ bkashURL, paymentId: paymentID, invoiceNumber, paymentIdDb: payment.id })
  } catch (e: any) {
    // mark failed so it doesn't dangle as pending forever
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'failed' } }).catch(() => undefined)
    return NextResponse.json({ error: 'bkash_create_failed', message: e?.message || 'bKash checkout failed' }, { status: 502 })
  }
}
