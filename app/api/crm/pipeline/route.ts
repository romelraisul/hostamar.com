import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';

// GET pipeline dashboard stats
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get all leads grouped by status
    const allLeads = await prisma.lead.findMany({
      select: {
        id: true,
        status: true,
        source: true,
        createdAt: true,
        customerId: true,
      },
    });

    const stats = {
      // Lead counts by status
      new: allLeads.filter((l) => l.status === 'new').length,
      contacted: allLeads.filter((l) => l.status === 'contacted').length,
      interested: allLeads.filter((l) => l.status === 'interested').length,
      demoScheduled: allLeads.filter((l) => l.status === 'demo').length,
      converted: allLeads.filter((l) => l.status === 'converted').length,
      dead: allLeads.filter((l) => l.status === 'dead').length,

      // Customer counts
      totalCustomers: await prisma.customer.count(),
      activeCustomers: await prisma.customer.count({
        where: { stage: { in: ['trial', 'paid'] } },
      }),
      payingCustomers: await prisma.subscription.count({
        where: { status: 'active' },
      }),
      churnedCustomers: await prisma.customer.count({
        where: { stage: 'churned' },
      }),

      // Revenue
      totalRevenue: await prisma.payment.aggregate({
        where: { status: 'completed' },
        _sum: { amount: true },
      }),
      monthlyRevenue: await prisma.payment.aggregate({
        where: {
          status: 'completed',
          createdAt: { gte: thirtyDaysAgo },
        },
        _sum: { amount: true },
      }),

      // Payments
      pendingPayments: await prisma.payment.count({
        where: { status: 'pending' },
      }),
      completedPayments: await prisma.payment.count({
        where: { status: 'completed' },
      }),

      // Videos
      totalVideos: await prisma.video.count(),
      processingVideos: await prisma.video.count({
        where: { status: 'processing' },
      }),

      // Outreach
      totalOutreach: await prisma.outreachLog.count(),
      outreachToday: await prisma.outreachLog.count({
        where: { createdAt: { gte: today } },
      }),

      // Follow-ups
      pendingFollowUps: await prisma.followUp.count({
        where: {
          status: 'pending',
          scheduledFor: { gte: today },
        },
      }),
      overdueFollowUps: await prisma.followUp.count({
        where: {
          status: 'pending',
          scheduledFor: { lt: today },
        },
      }),

      // Recent activity
      recentLeads: allLeads
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 10)
        .map((l) => ({
          id: l.id,
          name: l.id.substring(0, 8) + '...',
          status: l.status,
          source: l.source,
          hasCustomer: !!l.customerId,
        })),

      // Conversion rates
      contactedToInterested: 0,
      interestedToDemo: 0,
      demoToConverted: 0,
      overallConversionRate: 0,
    };

    // Calculate conversion rates
    const contacted = stats.contacted;
    const interested = stats.interested;
    const demo = stats.demoScheduled;
    const converted = stats.converted;

    stats.contactedToInterested =
      contacted > 0 ? Math.round((interested / contacted) * 100) : 0;
    stats.interestedToDemo =
      interested > 0 ? Math.round((demo / interested) * 100) : 0;
    stats.demoToConverted =
      demo > 0 ? Math.round((converted / demo) * 100) : 0;
    stats.overallConversionRate =
      allLeads.length > 0
        ? Math.round((converted / allLeads.length) * 100)
        : 0;

    return NextResponse.json({ success: true, stats });
  } catch (error: any) {
    console.error('Pipeline stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Convert a lead to customer
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { leadId, plan, price, method } = body;

    if (!leadId) {
      return NextResponse.json(
        { error: 'leadId is required' },
        { status: 400 }
      );
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Create or find customer
    let customer;
    if (lead.customerId) {
      customer = await prisma.customer.findUnique({
        where: { id: lead.customerId },
      });
    }

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          email: lead.email || `${lead.id}@lead.hostamar.com`,
          name: lead.name,
          password: '',
          phone: lead.phone || null,
          source: lead.source,
          stage: 'trial',
          score: lead.score,
          notes: `Converted from lead on ${new Date().toISOString()}`,
        },
      });
    }

    // Update lead
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: 'converted',
        customerId: customer.id,
        convertedAt: new Date(),
      },
    });

    // Create subscription if plan specified
    if (plan && price) {
      await prisma.subscription.create({
        data: {
          customerId: customer.id,
          plan,
          status: 'active',
          price: parseFloat(price),
          nextBillingDate: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ),
        },
      });
    }

    // Create payment record if method specified
    if (method && price) {
      await prisma.payment.create({
        data: {
          customerId: customer.id,
          method,
          amount: parseFloat(price),
          currency: 'BDT',
          status: 'completed',
          planName: plan || null,
        },
      });
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        customerId: customer.id,
        action: 'lead_converted',
        description: `Lead ${leadId} converted to customer. Plan: ${plan || 'none'}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Lead converted to customer',
      customer,
    });
  } catch (error: any) {
    console.error('Pipeline convert error:', error);
    return NextResponse.json(
      { error: 'Failed to convert lead' },
      { status: 500 }
    );
  }
}

// Save pipeline snapshot
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const leads = await prisma.lead.findMany();
    const activeSubs = await prisma.subscription.count({
      where: { status: 'active' },
    });
    const totalRevenue = await prisma.payment.aggregate({
      where: { status: 'completed' },
      _sum: { amount: true },
    });

    const snapshot = await prisma.pipelineSnapshot.create({
      data: {
        totalLeads: leads.length,
        contacted: leads.filter((l) => l.status === 'contacted').length,
        interested: leads.filter((l) => l.status === 'interested').length,
        converted: leads.filter((l) => l.status === 'converted').length,
        paying: activeSubs,
        totalRevenue: totalRevenue._sum.amount || 0,
      },
    });

    return NextResponse.json({ success: true, snapshot });
  } catch (error: any) {
    console.error('Pipeline snapshot error:', error);
    return NextResponse.json(
      { error: 'Failed to save snapshot' },
      { status: 500 }
    );
  }
}