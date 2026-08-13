export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/get-auth-user'

async function requireAdmin(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }), user: null }
  }
  return { error: null, user }
}

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin(request)
    if (error) return error

    const url = new URL(request.url)
    const customerId = url.searchParams.get('customerId')
    const product = url.searchParams.get('product')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100') || 100, 500)

    if (customerId) {
      const account = await prisma.creditAccount.findUnique({
        where: { customerId },
        include: {
          customer: {
            select: { id: true, email: true, name: true, role: true },
          },
        },
      })

      if (!account) {
        return NextResponse.json({ error: 'not_found' }, { status: 404 })
      }

      const transactions = await prisma.creditTransaction.findMany({
        where: {
          accountId: account.id,
          ...(product ? { product } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })

      return NextResponse.json({
        account,
        customer: account.customer,
        transactions,
      })
    }

    const accounts = await prisma.creditAccount.findMany({
      include: {
        customer: {
          select: { id: true, email: true, name: true, role: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    })

    const totalCustomers = await prisma.customer.count()
    const totalCredits = await prisma.creditAccount.aggregate({
      _sum: { credits: true, consumed: true },
    })

    const productBreakdown = await prisma.creditTransaction.groupBy({
      by: ['product'],
      _sum: { amount: true },
    })

    return NextResponse.json({
      accounts,
      stats: {
        totalCustomers,
        totalCreditsIssued: totalCredits._sum.credits || 0,
        totalCreditsConsumed: totalCredits._sum.consumed || 0,
        productBreakdown: productBreakdown.map((p) => ({
          product: p.product,
          netAmount: p._sum.amount || 0,
        })),
      },
    })
  } catch (error: any) {
    console.error('[AdminCredits] GET error:', error)
    return NextResponse.json({ error: 'internal_error', message: error?.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAdmin(request)
    if (error) return error

    const body = await request.json()
    const { customerId, amount, product = 'bonus', description = 'Admin credit adjustment' } = body || {}

    if (!customerId || amount === undefined || amount === null) {
      return NextResponse.json({ error: 'customerId and amount required' }, { status: 400 })
    }

    const numericAmount = Number(amount)
    if (!Number.isInteger(numericAmount)) {
      return NextResponse.json({ error: 'amount must be integer credits' }, { status: 400 })
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, email: true, name: true },
    })
    if (!customer) {
      return NextResponse.json({ error: 'customer_not_found' }, { status: 404 })
    }

    if (numericAmount > 0) {
      const account = await prisma.creditAccount.upsert({
        where: { customerId },
        create: {
          customerId,
          credits: numericAmount,
          consumed: 0,
          ...(product === 'video_wan_5s' || product === 'video_hunyuan_5s' ? { videoCredits: numericAmount } : {}),
          ...(product === 'image_sd' || product === 'image_flux' ? { imageCredits: numericAmount } : {}),
          ...(product === 'chat_message' ? { chatCredits: numericAmount } : {}),
          ...(product === 'browser_search' ? { browserCredits: numericAmount } : {}),
          ...(product === 'ide_task' ? { ideCredits: numericAmount } : {}),
          ...(product === 'game_spin' ? { gameCredits: numericAmount } : {}),
          ...(product === 'hosting_check' ? { hostingCredits: numericAmount } : {}),
        },
        update: {
          credits: { increment: numericAmount },
          ...(product === 'video_wan_5s' || product === 'video_hunyuan_5s' ? { videoCredits: { increment: numericAmount } } : {}),
          ...(product === 'image_sd' || product === 'image_flux' ? { imageCredits: { increment: numericAmount } } : {}),
          ...(product === 'chat_message' ? { chatCredits: { increment: numericAmount } } : {}),
          ...(product === 'browser_search' ? { browserCredits: { increment: numericAmount } } : {}),
          ...(product === 'ide_task' ? { ideCredits: { increment: numericAmount } } : {}),
          ...(product === 'game_spin' ? { gameCredits: { increment: numericAmount } } : {}),
          ...(product === 'hosting_check' ? { hostingCredits: { increment: numericAmount } } : {}),
        },
      })

      await prisma.creditTransaction.create({
        data: {
          accountId: account.id,
          amount: numericAmount,
          balanceAfter: account.credits,
          product,
          description: description || `Admin added ${numericAmount} credits (${product})`,
        },
      })

      return NextResponse.json({
        success: true,
        account,
        message: `Added ${numericAmount} credits`,
      })
    }

    const account = await prisma.creditAccount.findUnique({
      where: { customerId },
    })
    if (!account) {
      return NextResponse.json({ error: 'no_credit_account' }, { status: 404 })
    }

    if (account.credits < Math.abs(numericAmount)) {
      return NextResponse.json({ error: 'insufficient_credits' }, { status: 400 })
    }

    const updated = await prisma.creditAccount.update({
      where: { customerId },
      data: {
        credits: { decrement: Math.abs(numericAmount) },
        consumed: { increment: Math.abs(numericAmount) },
      },
    })

    await prisma.creditTransaction.create({
      data: {
        accountId: updated.id,
        amount: numericAmount,
        balanceAfter: updated.credits,
        product,
        description: description || `Admin deducted ${Math.abs(numericAmount)} credits (${product})`,
      },
    })

    return NextResponse.json({
      success: true,
      account: updated,
      message: `Deducted ${Math.abs(numericAmount)} credits`,
    })
  } catch (error: any) {
    console.error('[AdminCredits] POST error:', error)
    return NextResponse.json({ error: 'internal_error', message: error?.message }, { status: 500 })
  }
}
