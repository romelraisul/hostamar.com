import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import prisma from '@/lib/prisma'

const planDetails: Record<string, { price: number; videosPerMonth: number; storageGB: number }> = {
  starter: { price: 2000, videosPerMonth: 10, storageGB: 5 },
  business: { price: 3500, videosPerMonth: 30, storageGB: 20 },
  enterprise: { price: 6000, videosPerMonth: 999999, storageGB: 100 },
}

// Discount codes — the ONLY place the marketing kit's promised discounts live.
// Add new codes here; the signup page reads them via the same map (lib/promo.ts).
//   EARLY50 : 50% off lifetime (per the "প্রথম ১০০ জনের জন্য ৫০% ডিসকাউন্ট" CTA)
//   ROMEL50 : same, used in WhatsApp broadcast
const PROMO_CODES: Record<string, { percent: number; lifetime: boolean; label: string }> = {
  EARLY50: { percent: 50, lifetime: true,  label: 'Early Adopter 50%' },
  ROMEL50: { percent: 50, lifetime: true,  label: 'WhatsApp 50%' },
  LAUNCH25: { percent: 25, lifetime: false, label: 'Launch 25%' },
}

export function applyPromo(plan: string, code: string | undefined) {
  const info = planDetails[plan]
  if (!info) return null
  if (!code) return { price: info.price, discountPct: 0, label: null }
  const promo = PROMO_CODES[code.trim().toUpperCase()]
  if (!promo) return { price: info.price, discountPct: 0, label: null }
  const discounted = Math.round(info.price * (100 - promo.percent) / 100)
  return { price: discounted, discountPct: promo.percent, label: promo.label }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const customer = await prisma.customer.findUnique({
      where: { email: session.user.email },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const body = await request.json()
    const { plan, promoCode } = body

    if (!plan || !planDetails[plan]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const planInfo = planDetails[plan]
    const promo = applyPromo(plan, promoCode)
    if (!promo) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }
    const finalPrice = promo.price
    const discountLabel = promo.label

    // Calculate next billing date (1 month from now)
    const nextBillingDate = new Date()
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)

    // Deactivate existing subscriptions
    await prisma.subscription.updateMany({
      where: { customerId: customer.id, status: 'active' },
      data: { status: 'cancelled' },
    })

    // Create new subscription — store discounted price; originalPrice lets
    // bKash invoices show crossed-out smart number, and we don't drift schema.
    const subscription = await prisma.subscription.create({
      data: {
        customerId: customer.id,
        plan: promoCode ? `${plan}_${(promoCode || '').toUpperCase()}` : plan,
        status: 'active',
        price: finalPrice,
        videosPerMonth: planInfo.videosPerMonth,
        storageGB: planInfo.storageGB,
        billingCycle: 'monthly',
        nextBillingDate,
      },
    })

    // Log activity (with promo in metadata if used)
    await prisma.activityLog.create({
      data: {
        customerId: customer.id,
        action: 'subscription_upgraded',
        description: `Upgraded to ${plan} plan - ৳${finalPrice}/month${discountLabel ? ` (${discountLabel})` : ''}`,
        metadata: JSON.stringify({
          plan,
          originalPrice: planInfo.price,
          finalPrice,
          promoCode: promoCode || null,
          discountPercent: promo.discountPct,
          discountLabel,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        price: subscription.price,
        originalPrice: planInfo.price,
        discountPercent: promo.discountPct,
        discountLabel,
      }
    })
  } catch (error) {
    console.error('Payment upgrade error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}