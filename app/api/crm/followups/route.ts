export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';

// Manage follow-ups
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');
    const status = searchParams.get('status');
    const pendingOnly = searchParams.get('pending');

    const where: any = {};
    if (leadId) where.leadId = leadId;
    if (status) where.status = status;
    if (pendingOnly) {
      where.status = 'pending';
      where.scheduledFor = { gte: new Date() };
    }

    const followUps = await prisma.followUp.findMany({
      where,
      orderBy: { scheduledFor: 'asc' },
      include: {
        lead: { select: { id: true, name: true, phone: true } },
      },
    });

    return NextResponse.json({ success: true, followUps });
  } catch (error: any) {
    console.error('Follow-ups GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { leadId, customerId, followUpType, scheduledFor, notes, priority } =
      body;

    if (!leadId && !customerId) {
      return NextResponse.json(
        { error: 'leadId or customerId required' },
        { status: 400 }
      );
    }
    if (!followUpType || !scheduledFor) {
      return NextResponse.json(
        { error: 'followUpType and scheduledFor required' },
        { status: 400 }
      );
    }

    const followUp = await prisma.followUp.create({
      data: {
        leadId: leadId || null,
        customerId: customerId || null,
        followUpType,
        scheduledFor: new Date(scheduledFor),
        notes: notes || null,
        priority: priority || 'medium',
      },
      include: {
        lead: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(
      { success: true, followUp },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Follow-ups POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create follow-up' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Follow-up ID required' }, { status: 400 });
    }

    const data: any = {};
    if (status) data.status = status;
    if (notes) data.notes = notes;
    if (status === 'completed') data.completedAt = new Date();

    const followUp = await prisma.followUp.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, followUp });
  } catch (error: any) {
    console.error('Follow-ups PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update follow-up' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Follow-up ID required' },
        { status: 400 }
      );
    }

    await prisma.followUp.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Follow-up deleted' });
  } catch (error: any) {
    console.error('Follow-ups DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete follow-up' },
      { status: 500 }
    );
  }
}