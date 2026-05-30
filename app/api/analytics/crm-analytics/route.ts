import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [leadSources, leadByStatus, revenueByMethod, recentPayments] = await Promise.all([
      prisma.lead.groupBy({
        by: ['source'],
        _count: true,
        // @ts-ignore - Prisma groupBy orderBy type mismatch
        orderBy: { _count: 'desc' },
      }),
      prisma.lead.groupBy({
        by: ['status'],
        _count: true,
      }),
      prisma.payment.groupBy({
        by: ['method'],
        _sum: { amount: true },
        where: { status: 'completed' },
      }),
      prisma.payment.findMany({
        where: { status: 'completed' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          customer: { select: { name: true, email: true } },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      leadSources,
      leadByStatus,
      revenueByMethod,
      recentPayments,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}