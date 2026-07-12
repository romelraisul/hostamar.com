export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/admin/bootstrap-trial
 *
 * Server-only, secret-gated bootstrap that mints a 7-day Pro trial for any
 * existing Customer. This is the "Day 1" paying path while real payment API
 * keys are pending. Mirrors the existing `app/api/_bootstrap/admin/route.ts`
 * pattern (admin auth gate + Prisma).
 *
 * Body:
 *   { customerEmail: string, plan?: 'STARTER'|'GROWTH'|'PRO', days?: number }
 *
 * Behaviour:
 *   - requireAdmin(req) → 401 JSON if not signed in as admin
 *   - Locate Customer by email (lowercased). 404 if missing.
 *   - Upsert Subscription row:
 *       plan, status='trialing', videosPerMonth, storageGB, price,
 *       nextBillingDate = now + days*24h
 *   - Set Customer.credits += planVideos (idempotent? — admin-driven, so we
 *     add unconditionally; admin can re-run if they want extra credits)
 *   - Audit log entry
 *   - 200 JSON { success, trial: { id, plan, status, endsAt, creditsAdded } }
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)

    const body = await req.json().catch(() => ({}))
    const customerEmail = String(body?.customerEmail || '').trim().toLowerCase()
    const plan = String(body?.plan || 'PRO').toUpperCase()
    const days = Math.max(1, Math.min(60, Number(body?.days || 7)))

    if (!customerEmail) {
      return NextResponse.json({ error: 'customerEmail required' }, { status: 400 })
    }
    if (!['STARTER', 'GROWTH', 'PRO', 'BUSINESS'].includes(plan)) {
      return NextResponse.json({ error: 'unknown plan' }, { status: 400 })
    }

    const customer = await prisma.customer.findUnique({
      where: { email: customerEmail },
      select: { id: true, email: true, name: true },
    })
    if (!customer) {
      return NextResponse.json({ error: 'customer not found', customerEmail }, { status: 404 })
    }

    const planMap: Record<string, { videos: number; storage: number; price: number }> = {
      STARTER: { videos: 20, storage: 10, price: 500 },
      GROWTH: { videos: 30, storage: 50, price: 2000 },
      PRO: { videos: 999, storage: 100, price: 3500 },
      BUSINESS: { videos: 999, storage: 500, price: 5000 },
    }
    const info = planMap[plan] || planMap['PRO']

    const endsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

    const sub = await prisma.subscription.upsert({
      where: { customerId: customer.id },
      update: {
        plan,
        status: 'trialing',
        videosPerMonth: info.videos,
        storageGB: info.storage,
        price: info.price,
        currency: 'BDT',
        billingCycle: 'monthly',
        nextBillingDate: endsAt,
      },
      create: {
        customerId: customer.id,
        plan,
        status: 'trialing',
        videosPerMonth: info.videos,
        storageGB: info.storage,
        price: info.price,
        currency: 'BDT',
        billingCycle: 'monthly',
        nextBillingDate: endsAt,
      },
    })

    await prisma.customer.update({
      where: { id: customer.id },
      data: { credits: { increment: info.videos } },
    })

    try {
      await prisma.activityLog.create({
        data: {
          customerId: customer.id,
          action: 'trial_activated',
          description: `Admin-minted ${plan} trial (${days} days) ending ${endsAt.toISOString()}; +${info.videos} credits`,
        },
      })
    } catch {
      // activityLog may not exist on all schemas; non-fatal
    }

    try {
      await prisma.notification.create({
        data: {
          customerId: customer.id,
          type: 'trial_activated',
          title: `${plan} trial activated 🎉`,
          message: `Your ${days}-day ${plan} trial is live until ${endsAt.toUTCString()}. Enjoy!`,
          actionUrl: '/dashboard',
        },
      })
    } catch {
      // notification may be missing on schema drift; non-fatal
    }

    return NextResponse.json({
      success: true,
      trial: {
        id: sub.id,
        customerId: customer.id,
        email: customer.email,
        plan,
        status: 'trialing',
        endsAt: endsAt.toISOString(),
        creditsAdded: info.videos,
      },
    })
  } catch (error: any) {
    const status = error?.cause?.status || 500
    return NextResponse.json(
      { success: false, error: error?.message || 'bootstrap trial failed' },
      { status },
    )
  }
}