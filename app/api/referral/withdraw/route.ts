export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(()=>({}))
  const method = (body.method || 'bKash').toString()
  // just create a log; real payout is manual via admin
  const paid = await prisma.referral.count({ where: { referrerId: user.id, status: 'paid' } })
  const pendingTk = paid * 60
  if (pendingTk < 100) return NextResponse.json({ error: 'ন্যূনতম ১০০ টাকা হলে উত্তোলন সম্ভব।' }, { status: 400 })
  await prisma.activityLog.create({ data: { customerId: user.id, action: 'referral_withdraw_request', description: `Withdraw request via ${method} — ${pendingTk} Tk` } }).catch(()=>{})
  return NextResponse.json({ ok: true, message: 'রিকোয়েস্ট জমা হয়েছে — ২৪ ঘণ্টায় bKash এ পাবেন।' })
}
