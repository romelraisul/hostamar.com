export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
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