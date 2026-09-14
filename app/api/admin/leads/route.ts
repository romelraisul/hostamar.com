export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// ============================================================================
// GET /api/admin/leads?take=50&source=contact-form
// Admin-only view of captured leads (contact form, CRM, imports). This is the
// durable owner surface for the funnel: even if every notification channel is
// down, leads are visible here.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)

    const { searchParams } = new URL(req.url)
    const take = Math.min(Number(searchParams.get('take')) || 50, 200)
    const source = searchParams.get('source')

    const where = source ? { source } : undefined

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({ where, orderBy: { createdAt: 'desc' }, take }),
      prisma.lead.count({ where }),
    ])

    return NextResponse.json({
      ok: true,
      total,
      count: leads.length,
      leads: leads.map((l) => ({
        id: l.id,
        name: l.name,
        email: l.email,
        phone: l.phone,
        source: l.source,
        status: l.status,
        tags: l.tags,
        notes: l.notes,
        createdAt: l.createdAt,
      })),
    })
  } catch (err: any) {
    const status = err?.cause?.status || 500
    if (status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    // eslint-disable-next-line no-console
    console.error('[admin leads] error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
