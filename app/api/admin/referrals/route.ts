export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') // pending|paid|all
    const where: any = {}
    if (status && status !== 'all') where.status = status
    const referrals = await prisma.referral.findMany({
      where,
      include: {
        referrer: { select: { name: true, email: true, referralCode: true } },
        referred: { select: { name: true, email: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    const total = await prisma.referral.count({ where })
    const pending = await prisma.referral.count({ where: { status: 'pending' } })
    const paid = await prisma.referral.count({ where: { status: 'paid' } })
    return NextResponse.json({
      referrals: referrals.map(r=>({
        id: r.id,
        status: r.status,
        bonusAmount: r.bonusAmount,
        createdAt: r.createdAt,
        referrerName: r.referrer.name,
        referrerEmail: r.referrer.email,
        referrerCode: r.referrer.referralCode,
        referredName: r.referred.name,
        referredEmail: r.referred.email,
        referredAt: r.referred.createdAt,
      })),
      total, pending, paid,
    })
  } catch (e: any) {
    const s = e?.cause?.status || 500
    if (s===401) return NextResponse.json({error:'Unauthorized'},{status:401})
    if (s===403) return NextResponse.json({error:'Forbidden'},{status:403})
    return NextResponse.json({error:'Internal'},{status:500})
  }
}
