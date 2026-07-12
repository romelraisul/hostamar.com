export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/get-auth-user'

const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

// ---------------------------------------------------------------------------
// GET  — Legacy redirect handler (formerly SSLCommerz IPN callbacks).
//       bKash personal has no real IPN, so we just redirect.
//       This also handles any bookmarkable success/fail/cancel links.
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'success'

  try {
    if (type === 'success') {
      return NextResponse.redirect(`${APP_URL}/payment/success`)
    }
    if (type === 'fail') {
      return NextResponse.redirect(`${APP_URL}/payment/fail`)
    }
    if (type === 'cancel') {
      return NextResponse.redirect(`${APP_URL}/payment/cancel`)
    }
    return NextResponse.redirect(`${APP_URL}/payment/fail`)
  } catch (error) {
    console.error('IPN redirect error:', error)
    return NextResponse.redirect(`${APP_URL}/payment/fail`)
  }
}

// ---------------------------------------------------------------------------
// POST — bKash personal payment verification.
//        User sends money to 01822417463 via bKash app, then submits TrxID.
//        Transaction is kept as pending_verification for manual admin review.
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { package: pkg, amount, bkashNumber, trxId, senderNumber } = await req.json()

    if (!pkg || !amount || !trxId) {
      return NextResponse.json({ error: 'পেমেন্ট তথ্য অসম্পূর্ণ' }, { status: 400 })
    }

    const creditsMap: Record<string, number> = { starter: 10, growth: 30, pro: 100 }
    const credits = creditsMap[pkg] || 0

    // Check for duplicate TrxID
    const existing = await prisma.transaction.findFirst({
      where: { gatewayTrxId: trxId }
    })
    if (existing) {
      return NextResponse.json({ error: 'এই TrxID আগেই ব্যবহার করা হয়েছে' }, { status: 409 })
    }

    // Create transaction as pending_verification — admin will verify manually
    await prisma.transaction.create({
      data: {
        customerId: authUser.id,
        amount,
        currency: 'BDT',
        status: 'pending_verification',
        gateway: 'bkash_personal',
        gatewayTrxId: trxId,
        videoPackage: pkg,
        creditsAdded: credits,
        cardType: senderNumber || null,
        cardBrand: bkashNumber || null,
      },
    })

    // Notify admin about new pending payment
    await prisma.notification.create({
      data: {
        customerId: authUser.id,
        type: 'payment_pending',
        title: 'নতুন bKash পেমেন্ট',
        message: `${authUser.name || authUser.email} — ${pkg} প্যাকেজ ৳${amount} — TrxID: ${trxId}`,
        actionUrl: '/dashboard/admin/payments',
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('bKash IPN error:', error?.message || error)
    return NextResponse.json({ error: 'পেমেন্ট যাচাই করতে সমস্যা হয়েছে' }, { status: 500 })
  }
}