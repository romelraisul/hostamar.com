import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const since = new Date();
    since.setDate(since.getDate() - days);
    const snapshots = await prisma.pipelineSnapshot.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
    });
    const leads = await prisma.lead.findMany({ orderBy: { createdAt: 'desc' } });
    const totalCustomers = await prisma.customer.count();
    const activeSubs = await prisma.subscription.count({ where: { status: 'active' } });
    const totalRevenue = await prisma.payment.aggregate({
      where: { status: 'completed' },
      _sum: { amount: true },
    });
    return NextResponse.json({
      success: true,
      snapshots,
      current: {
        totalLeads: leads.length,
        contacted: leads.filter((l) => l.status === 'contacted').length,
        interested: leads.filter((l) => l.status === 'interested').length,
        converted: leads.filter((l) => l.status === 'converted').length,
        paying: activeSubs,
        totalCustomers,
        totalRevenue: totalRevenue._sum.amount || 0,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
