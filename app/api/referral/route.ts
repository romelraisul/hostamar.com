import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function trackReferral(code: string, email: string, name?: string) {
  try {
    const referrer = await prisma.customer.findFirst({
      where: { referralCode: code }
    });

    if (!referrer) {
      return { success: false, message: 'Invalid referral code', reward: '', count: 0 };
    }

    const referralCount = await prisma.referral.count({
      where: { referrerId: referrer.id }
    });

    return {
      success: true,
      reward: referralCount < 3 ? 'free_month' : 'bonus_500',
      message: `You have ${Math.max(0, 3 - referralCount)}/3 referrals remaining for free month`,
      count: referralCount
    };
  } catch (e) {
    console.error('trackReferral error:', e);
    return { success: false, message: 'Referral tracking unavailable', reward: '', count: 0 };
  }
}

async function getReferralStatsByCode(code: string) {
  try {
    const referrer = await prisma.customer.findFirst({
      where: { referralCode: code }
    });

    if (!referrer) {
      return { error: 'Invalid referral code' };
    }

    const referrals = await prisma.referral.findMany({
      where: { referrerId: referrer.id },
      include: { referred: true }
    });

    const completedCount = referrals.filter(r => r.status === 'completed').length;
    const pendingCount = referrals.filter(r => r.status === 'pending').length;

    return {
      code: referrer.referralCode,
      totalReferrals: referrals.length,
      completedCount,
      pendingCount,
      bonus: completedCount * 500
    };
  } catch (e) {
    console.error('getReferralStats error:', e);
    return { error: 'Failed to fetch stats' };
  }
}

export async function POST(request: Request) {
  try {
    const { code, email, name } = await request.json();
    const result = await trackReferral(code, email, name);

    return NextResponse.json({
      success: result.success,
      reward: result.reward,
      message: result.message || `You have ${result.count}/3 referrals`
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) return NextResponse.json({ error: 'No code provided' }, { status: 400 });

  const stats = await getReferralStatsByCode(code);
  return NextResponse.json(stats);
}
