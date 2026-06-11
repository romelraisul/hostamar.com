import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))

    const {
      trx_id,
      tran_id,
      merchant_invoice,
      payment_amount,
      payment_gateway,
      currency,
      status,
      customer_name,
      customer_phone,
      customer_email,
    } = body

    // Find customer by email or phone
    let customer: any = null
    if (customer_email) {
      customer = await prisma.customer.findUnique({ where: { email: customer_email as string } })
    }
    if (!customer && customer_phone) {
      customer = await prisma.customer.findFirst({
        where: { phone: customer_phone as string }
      })
    }

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const txId = tran_id || trx_id || ''
    const gateway = (payment_gateway || '').toLowerCase()
    const method = gateway.includes('bkash') ? 'bkash'
                 : gateway.includes('nagad') ? 'nagad'
                 : gateway.includes('rocket') ? 'rocket'
                 : 'bkash'

    // Create or update payment record
    const payment = await prisma.payment.upsert({
      where: { transactionId: txId },
      update: {
        status: (status || 'completed').toLowerCase(),
        webhookSent: true,
      },
      create: {
        customerId: customer.id,
        method,
        amount: parseFloat(payment_amount) || 0,
        currency: currency || 'BDT',
        status: (status || 'completed').toLowerCase(),
        transactionId: txId,
        planName: merchant_invoice || null,
        billingPeriod: 'monthly',
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })

    // Update subscription if payment completed
    const isSuccess = (status || '').toLowerCase() === 'success' || (status || '').toLowerCase() === 'completed'
    if (isSuccess) {
      const planKey = (merchant_invoice || 'starter').toLowerCase()
      const planMap: Record<string, { plan: string; videos: number; storage: number; price: number }> = {
        'starter': { plan: 'STARTER', videos: 20, storage: 10, price: 500 },
        'pro': { plan: 'PRO', videos: 999, storage: 100, price: 2000 },
        'business': { plan: 'BUSINESS', videos: 999, storage: 500, price: 5000 },
      }
      const planInfo = planMap[planKey] || planMap['starter']

      await prisma.subscription.upsert({
        where: { customerId: customer.id },
        update: {
          plan: planInfo.plan,
          status: 'active',
          videosPerMonth: planInfo.videos,
          storageGB: planInfo.storage,
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          price: planInfo.price,
          currency: 'BDT',
          billingCycle: 'monthly',
        },
        create: {
          customerId: customer.id,
          plan: planInfo.plan,
          status: 'active',
          videosPerMonth: planInfo.videos,
          storageGB: planInfo.storage,
          price: planInfo.price,
          currency: 'BDT',
          billingCycle: 'monthly',
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      await prisma.activityLog.create({
        data: {
          customerId: customer.id,
          action: 'payment_completed',
          description: `Payment of ৳${payment_amount} via ${payment_gateway} for ${planKey} plan`,
        },
      })
    }

    return NextResponse.json({ success: true, message: 'Webhook received' })
  } catch (error: any) {
    console.error('Payment webhook error:', error.message)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}