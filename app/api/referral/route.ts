import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

function getTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(/auth_token=([^;]+)/);
  return match ? match[1] : null;
}

export async function GET(request: Request) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const customer = await prisma.customer.findUnique({
      where: { id: payload.id },
      include: {
        referralsMade: {
          include: { referred: { select: { name: true, email: true, createdAt: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    if (!customer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Generate referral code if missing
    if (!customer.referralCode) {
      const code = 'HST' + customer.id.slice(-6).toUpperCase();
      await prisma.customer.update({ where: { id: customer.id }, data: { referralCode: code } });
      customer.referralCode = code;
    }

    const referrals = customer.referralsMade;
    const completedCount = referrals.filter(r => r.status === 'COMPLETED').length;
    const pendingCount   = referrals.filter(r => r.status === 'PENDING').length;

    const REWARD_TIERS = [
      { threshold: 3,  bonus: 500,   label: 'Starter' },
      { threshold: 10, bonus: 2000,  label: 'Bronze'  },
      { threshold: 25, bonus: 5000,  label: 'Silver'  },
      { threshold: 50, bonus: 10000, label: 'Gold'    },
      { threshold: 100,bonus: 25000, label: 'Diamond' },
    ];

    const totalBonus = REWARD_TIERS
      .filter(t => completedCount >= t.threshold)
      .reduce((sum, t) => sum + t.bonus, 0);

    const appUrl = process.env.NEXTAUTH_URL || 'https://hostamar.com';
    const referralLink = `${appUrl}/signup?ref=${customer.referralCode}`;

    return NextResponse.json({
      success: true,
      data: {
        referralCode: customer.referralCode,
        referralLink,
        referredCount: referrals.length,
        completedCount,
        pendingCount,
        totalBonus,
        referralRewards: REWARD_TIERS,
        referrals: referrals.map(r => ({
          name: r.referred.name,
          email: r.referred.email,
          status: r.status,
          joinedAt: r.createdAt,
        }))
      }
    });
  } catch (e) {
    console.error('getReferralStats error:', e);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { refCode, newUserId } = await request.json();
    if (!refCode || !newUserId) {
      return NextResponse.json({ success: false, error: 'Missing params' }, { status: 400 });
    }

    const referrer = await prisma.customer.findFirst({ where: { referralCode: refCode } });
    if (!referrer) return NextResponse.json({ success: false, message: 'Invalid referral code' });

    // Prevent self-referral
    if (referrer.id === newUserId) return NextResponse.json({ success: false, message: 'Cannot refer yourself' });

    // Prevent duplicate
    const existing = await prisma.referral.findFirst({
      where: { referrerId: referrer.id, referredId: newUserId }
    });
    if (existing) return NextResponse.json({ success: true, message: 'Already tracked' });

    const referral = await prisma.referral.create({
      data: {
        referrerId: referrer.id,
        referredId: newUserId,
        status: 'PENDING',
        bonusAmount: 500,
      }
    });

    return NextResponse.json({ success: true, referralId: referral.id });
  } catch (e) {
    console.error('trackReferral error:', e);
    return NextResponse.json({ success: false, error: 'Tracking failed' }, { status: 500 });
  }
}
