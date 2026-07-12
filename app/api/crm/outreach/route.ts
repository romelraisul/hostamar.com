export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';

// Log an outreach attempt
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      leadId,
      customerId,
      channel,
      direction,
      subject,
      message,
      status,
      response,
      outcome,
    } = body;

    if (!channel || !status) {
      return NextResponse.json(
        { error: 'channel and status are required' },
        { status: 400 }
      );
    }

    const log = await prisma.outreachLog.create({
      data: {
        leadId: leadId || null,
        customerId: customerId || null,
        channel,
        direction: direction || 'outbound',
        subject: subject || null,
        message: message || null,
        status,
        response: response || null,
        outcome: outcome || null,
      },
      include: {
        lead: { select: { id: true, name: true, email: true } },
      },
    });

    // Auto-update lead status on contact
    if (leadId && status === 'contacted') {
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          status: 'contacted',
          contactedAt: new Date(),
          attemptCount: { increment: 1 },
          lastContactAt: new Date(),
        },
      });
    }

    return NextResponse.json({ success: true, log }, { status: 201 });
  } catch (error: any) {
    console.error('CRM Outreach POST error:', error);
    return NextResponse.json(
      { error: 'Failed to log outreach' },
      { status: 500 }
    );
  }
}

// GET outreach logs with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');
    const customerId = searchParams.get('customerId');
    const channel = searchParams.get('channel');
    const since = searchParams.get('since');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (leadId) where.leadId = leadId;
    if (customerId) where.customerId = customerId;
    if (channel) where.channel = channel;
    if (since) where.createdAt = { gte: new Date(since) };

    const [logs, total] = await Promise.all([
      prisma.outreachLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          lead: { select: { id: true, name: true } },
        },
      }),
      prisma.outreachLog.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('CRM Outreach GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE an outreach log
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Log ID required' }, { status: 400 });
    }

    await prisma.outreachLog.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Log deleted' });
  } catch (error: any) {
    console.error('CRM Outreach DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete log' }, { status: 500 });
  }
}