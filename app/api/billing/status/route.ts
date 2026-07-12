// GET /api/billing/status?invoiceNumber=... — protected status poll for the
// frontend /billing/success page. Returns Payment status + amount + plan.
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-auth-user'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const runtime = 'nodejs'

const schema = z.object({ invoiceNumber: z.string().min(3).max(128) })

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const parsed = schema.safeParse({ invoiceNumber: searchParams.get('invoiceNumber') || '' })
  if (!parsed.success) return NextResponse.json({ error: 'invalid_invoice' }, { status: 400 })

  const payment = await prisma.payment.findFirst({
    where: { invoiceNumber: parsed.data.invoiceNumber, customerId: user.id },
    select: { status: true, amount: true, planName: true, currency: true, transactionId: true },
  })
  if (!payment) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  return NextResponse.json({ status: payment.status, amount: payment.amount, plan: payment.planName, currency: payment.currency, trxId: payment.transactionId })
}
