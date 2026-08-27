export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-auth-user'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const account = await prisma.creditAccount.findUnique({ where: { customerId: user.id } })
    if (!account) return NextResponse.json({ history: [], chart: [] })
    const history = await prisma.creditTransaction.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    // Build monthly recharge vs spend for chart (last 6 months)
    const now = new Date()
    const months: { label: string; recharge: number; spend: number }[] = []
    const bnMonths = ['জানু','ফেব্রু','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর']
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const start = new Date(d.getFullYear(), d.getMonth(), 1)
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1)
      const txs = history.filter(t => new Date(t.createdAt) >= start && new Date(t.createdAt) < end)
      const recharge = txs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
      const spend = Math.abs(txs.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0))
      months.push({ label: bnMonths[d.getMonth()], recharge, spend })
    }
    return NextResponse.json({ history, chart: months })
  } catch (e: any) {
    return NextResponse.json({ error: 'internal', message: e?.message }, { status: 500 })
  }
}
