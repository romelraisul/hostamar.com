import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const customer = await prisma.customer.findUnique({
      where: { email: session.user.email },
      include: {
        referralsMade: {
          include: { referred: { select: { name: true, email: true, createdAt: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!customer) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Generate referral code if not exists
    let referralCode = customer.referralCode
    if (!referralCode) {
      const code = customer.name
        ? customer.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8) +
          Math.random().toString(36).slice(2, 6).toUpperCase()
        : 'REF' + Math.random().toString(36).slice(2, 10).toUpperCase()

      await prisma.customer.update({
        where: { id: customer.id },
        data: { referralCode: code },
      })
      referralCode = code
    }

    const completedCount = customer.referralsMade.filter(r => r.status === 'completed').length
    const pendingCount = customer.referralsMade.filter(r => r.status === 'pending').length

    // Referral tiers
    const referralRewards = [
      { tier: 'Starter', reward: 100, referredCount: 0, threshold: 1, label: 'Starter — ৳100 per referral', bonus: 100 },
      { tier: 'Bronze', reward: 200, referredCount: 1, threshold: 5, label: 'Bronze — ৳200 per referral', bonus: 200 },
      { tier: 'Silver', reward: 300, referredCount: 5, threshold: 10, label: 'Silver — ৳300 per referral', bonus: 300 },
      { tier: 'Gold', reward: 500, referredCount: 10, threshold: 25, label: 'Gold — ৳500 per referral', bonus: 500 },
      { tier: 'Platinum', reward: 750, referredCount: 25, threshold: 100, label: 'Platinum — ৳750 per referral', bonus: 750 },
    ]

    const baseUrl = process.env.NEXTAUTH_URL || 'https://hostamar.com'
    const referralLink = `${baseUrl}/signup?ref=${referralCode}`

    return NextResponse.json({
      success: true,
      data: {
        referralCode,
        referralLink,
        referralRewards,
        referredCount: customer.referralsMade.length,
        completedCount,
        pendingCount,
        totalBonus: completedCount * 500,
        referrals: customer.referralsMade.map(r => ({
          id: r.id,
          name: r.referred?.name || 'Anonymous',
          email: r.referred?.email || '',
          status: r.status,
          createdAt: r.createdAt,
        })),
      },
    })
  } catch (error) {
    console.error('Referral stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
