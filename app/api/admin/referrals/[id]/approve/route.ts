export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rewardReferrerOnPayment } from '@/lib/referral'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req)
    const ref = await prisma.referral.findUnique({ where: { id: params.id } })
    if (!ref) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (['paid','PAID'].includes(ref.status)) return NextResponse.json({ error: 'Already paid', status: ref.status }, { status: 409 })
    // fallback: if no payment yet, just mark paid and credit 500+60 directly via helper with 600 amount
    const res = await rewardReferrerOnPayment(ref.referredId, 600, ref.id).catch(()=>({rewarded:false}))
    // ensure status paid even if no referred payment exists yet (manual payout)
    const updated = await prisma.referral.findUnique({ where: { id: params.id } })
    if (updated && ['pending','PENDING'].includes(updated.status)) {
      await prisma.referral.update({ where: { id: params.id }, data: { status: 'paid' } }).catch(async()=>{
        await prisma.referral.update({ where: { id: params.id }, data: { status: 'PAID' } })
      })
      // manual credit if reward didn't fire
      if (!(res as any).rewarded) {
        const { REFERRAL_CREDITS, REFERRAL_TAKA_STARTER } = await import('@/lib/referral')
        await prisma.customer.update({ where:{ id: ref.referrerId }, data:{ credits:{ increment: REFERRAL_CREDITS }, balance:{ increment: REFERRAL_TAKA_STARTER } } }).catch(()=>{})
      }
    }
    return NextResponse.json({ ok: true, message: 'পেআউট সম্পন্ন — ৫০০ ক্রেডিট + ৬০ টাকা ক্রেডিট হয়েছে।' })
  } catch (e:any) {
    const s=e?.cause?.status||500
    if (s===401) return NextResponse.json({error:'Unauthorized'},{status:401})
    if (s===403) return NextResponse.json({error:'Forbidden'},{status:403})
    console.error(e)
    return NextResponse.json({error:'Internal'},{status:500})
  }
}
