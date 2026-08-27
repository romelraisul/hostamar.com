export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-auth-user'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const sub = await prisma.subscription.findUnique({ where: { customerId: user.id } })
    if (!sub) return NextResponse.json({ error: 'No subscription' }, { status: 404 })
    const updated = await prisma.subscription.update({
      where: { id: sub.id },
      data: { autoRenew: false, status: 'cancelled' },
    })
    return NextResponse.json({ success: true, message: 'সাবস্ক্রিপশন বাতিল করা হয়েছে', subscription: updated })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}
