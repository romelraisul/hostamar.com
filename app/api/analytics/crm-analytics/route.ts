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

    // allSettled, not all: one failing groupBy must not blank the whole dashboard.
    const settled = await Promise.allSettled([
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
    const [leadSources, leadByStatus, revenueByMethod, recentPayments] = settled.map((r) =>
      r.status === 'fulfilled' ? r.value : []
    );
    const errors = settled
      .map((r, i) => (r.status === 'rejected' ? `${['leadSources', 'leadByStatus', 'revenueByMethod', 'recentPayments'][i]}: ${String((r as PromiseRejectedResult).reason?.message ?? (r as PromiseRejectedResult).reason)}` : null))
      .filter(Boolean);

    return NextResponse.json({
      success: true,
      leadSources,
      leadByStatus,
      revenueByMethod,
      recentPayments,
      ...(errors.length ? { errors } : {}),
    });
  } catch (error: any) {
    // analytics is non-critical: report the failure in-band, never blank the tab with a 500
    return NextResponse.json({
      success: false,
      leadSources: [],
      leadByStatus: [],
      revenueByMethod: [],
      recentPayments: [],
      errors: [String(error?.message ?? error)],
    });
  }
}