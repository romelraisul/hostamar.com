import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-auth-user'
import { prisma } from '@/lib/prisma'

// ---------------------------------------------------------------------------
// POST /api/payment/bkash/verify
// User submits bKash TrxID + sender number after sending money to 01822417463.
// Creates a pending_verification transaction for manual admin review.
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
        cardType: senderNumber || null,   // stores the sender's bKash number
        cardBrand: bkashNumber || null,    // stores the merchant number (01822417463)
      },
    })

    // Create notification for admin
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
    console.error('bKash verify error:', error?.message || error)
    return NextResponse.json({ error: 'পেমেন্ট যাচাই করতে সমস্যা হয়েছে' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// GET /api/payment/bkash/verify — list pending bKash payments (admin)
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const pending = await prisma.transaction.findMany({
      where: {
        status: 'pending_verification',
        gateway: 'bkash_personal',
      },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
      },
    })

    return NextResponse.json({ transactions: pending })
  } catch (error: any) {
    console.error('Pending bKash payments error:', error?.message || error)
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 })
  }
}
