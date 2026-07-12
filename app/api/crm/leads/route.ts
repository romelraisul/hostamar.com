export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';

// GET all leads with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const source = searchParams.get('source');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (source) where.source = source;

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, email: true } },
          _count: { select: { logs: true, followUps: true } },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      leads,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('CRM Leads GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// CREATE a new lead
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, company, source, status, tags, notes } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const lead = await prisma.lead.create({
      data: {
        name,
        email: email || null,
        phone: phone || null,
        company: company || null,
        source: source || 'manual',
        status: status || 'new',
        tags: tags || null,
        notes: notes || null,
      },
    });

    return NextResponse.json({ success: true, lead }, { status: 201 });
  } catch (error: any) {
    console.error('CRM Leads POST error:', error);
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
  }
}

// BULK create leads
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { leads } = body;

    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ error: 'leads array is required' }, { status: 400 });
    }

    if (leads.length > 100) {
      return NextResponse.json({ error: 'Max 100 leads per batch' }, { status: 400 });
    }

    const created = await prisma.lead.createMany({
      data: leads.map((l: any) => ({
        name: l.name,
        email: l.email || null,
        phone: l.phone || null,
        company: l.company || null,
        source: l.source || 'bulk',
        status: l.status || 'new',
        tags: l.tags || null,
        notes: l.notes || null,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({
      success: true,
      count: created.count,
      message: `${created.count} leads imported`,
    });
  } catch (error: any) {
    console.error('CRM Leads PUT error:', error);
    return NextResponse.json({ error: 'Failed to import leads' }, { status: 500 });
  }
}

// DELETE a lead
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
    }

    await prisma.lead.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Lead deleted' });
  } catch (error: any) {
    console.error('CRM Leads DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 });
  }
}