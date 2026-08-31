export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-auth-user'
import { prisma } from '@/lib/prisma'
import { planCredits } from '@/lib/pricing'
import { isAdminUser } from '@/lib/auth/admin'
import { slidingWindow, getClientIpEdge } from '@/lib/rate-limit-edge'

// ---------------------------------------------------------------------------
// POST /api/payment/bkash/verify — user submits bKash TrxID + sender number
// after sending money to 01822417463. Creates a pending_verification
// transaction for admin review (credits granted on approval, never here).
// V17: credits come from lib/pricing.ts planCredits() — the old hardcoded
// {starter:10, growth:30, pro:100} video-package map is GONE.
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rl = slidingWindow(`bkashverify:${getClientIpEdge(req)}`, 20, 60_000)
    if (!rl.ok) {
      return NextResponse.json({ error: 'Too many requests — try again in a minute' }, { status: 429 })
    }

    const { package: pkg, amount, bkashNumber, trxId, senderNumber } = await req.json()

    if (!pkg || !amount || !trxId) {
      return NextResponse.json({ error: 'পেমেন্ট তথ্য অসম্পূর্ণ' }, { status: 400 })
    }

    const credits = planCredits(String(pkg).toLowerCase())
    if (credits <= 0) {
      return NextResponse.json(
        { error: 'Invalid plan. Choose: starter, pro, business' },
        { status: 400 },
      )
    }

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
        videoPackage: String(pkg).toLowerCase(),
        creditsAdded: credits,
        cardType: senderNumber || null,   // stores the sender's bKash number
        cardBrand: bkashNumber || null,   // stores the merchant number (01822417463)
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
// GET /api/payment/bkash/verify — list pending bKash payments.
// V17 IDOR FIX: admins see all pending payments; NON-admin users see ONLY
// their own submissions (previously any logged-in user could read every
// customer's amount/TrxID/name/email/phone).
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rl = slidingWindow(`bkashverifylist:${getClientIpEdge(req)}`, 20, 60_000)
    if (!rl.ok) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    // Role check via lib/auth/admin.ts (DB re-check — JWT role claim is not trusted)
    const isAdmin = await isAdminUser(authUser.id)

    const pending = await prisma.transaction.findMany({
      where: {
        status: 'pending_verification',
        gateway: 'bkash_personal',
        // non-admin sees ONLY their own rows — IDOR fixed
        ...(isAdmin ? {} : { customerId: authUser.id }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
      },
    })

    return NextResponse.json({ transactions: pending, scope: isAdmin ? 'all' : 'own' })
  } catch (error: any) {
    console.error('Pending bKash payments error:', error?.message || error)
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 })
  }
}
