export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { bkashConfig, createCheckout } from '@/lib/payment/bkash';

// bKash payment for OSSU Academy premium — real gateway, never a fake URL.
export async function POST(req: NextRequest) {
  const authUser = await getAuthUser(req)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = authUser.id
  const { amount, courseId } = await req.json();

  if (!courseId || !amount || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    return NextResponse.json({ error: 'courseId and a positive amount are required' }, { status: 400 })
  }

  const cfg = bkashConfig();
  if (!cfg.configured) {
    return NextResponse.json(
      {
        success: false,
        error: 'PAYMENT_NOT_CONFIGURED',
        message: 'Add real bKash credentials (BKASH_APP_KEY, BKASH_APP_SECRET, BKASH_USERNAME, BKASH_PASSWORD) from developer.bka.sh to enable OSSU premium payments.',
      },
      { status: 503 }
    );
  }

  const invoice = `OSSU-${courseId}-${Date.now()}`;
  const callbackUrl = `${process.env.NEXTAUTH_URL || 'https://hostamar.com'}/api/payments/webhook`;

  const result = await createCheckout({
    amount: Number(amount),
    orderId: invoice,
    intent: 'sale',
    callbackUrl,
  });

  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error || 'bKash create failed' }, { status: 502 });
  }

  // Persist the pending payment (real DB record)
  await prisma.payment.create({
    data: {
      customerId: userId,
      method: 'bkash',
      amount: Number(amount),
      currency: 'BDT',
      status: 'pending',
      transactionId: result.paymentId || invoice,
      providerPaymentId: result.paymentId || null,
      invoiceNumber: invoice,
      planName: `ossu-${courseId}`,
    },
  });

  return NextResponse.json({
    success: true,
    payment: {
      id: invoice,
      userId,
      courseId,
      amount: Number(amount),
      currency: 'BDT',
      status: 'pending',
      paymentUrl: result.bkashUrl,
      providerPaymentId: result.paymentId,
    },
  });
}

export async function GET(req: NextRequest) {
  const authUser = await getAuthUser(req)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { searchParams } = req.nextUrl;
  const paymentId = searchParams.get("paymentId");

  if (!paymentId) {
    return NextResponse.json({ error: 'paymentId required' }, { status: 400 })
  }

  // Real status from DB — never a hardcoded "completed".
  const payment = await prisma.payment.findFirst({
    where: {
      customerId: authUser.id,
      OR: [
        { id: paymentId },
        { transactionId: paymentId },
        { providerPaymentId: paymentId },
        { invoiceNumber: paymentId },
      ],
    },
  });

  if (!payment) {
    return NextResponse.json({ paymentId, status: 'not_found', message: 'Payment not found' }, { status: 404 });
  }

  return NextResponse.json({
    paymentId,
    status: payment.status,
    amount: payment.amount,
    message: payment.status === 'paid' || payment.status === 'completed'
      ? 'Payment successful'
      : payment.status === 'pending'
        ? 'Payment pending — complete it on bKash'
        : 'Payment not completed',
  });
}
