// /api/admin/support/events — Tier2 inbox: SupportEvents needing triage
// (tier=2 escalations) plus recent tier=1 auto-resolutions for context.
//
// SECURITY: self-guards admin/superadmin via auth_token cookie.
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { triageEvent } from '@/lib/support/triageAgent'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function requireAdmin(req: NextRequest): { id: string; role?: string } | null {
  const token = req.cookies.get('auth_token')?.value
  if (!token) return null
  const payload = verifyToken(token)
  if (!payload) return null
  if (payload.role !== 'admin' && payload.role !== 'superadmin') return null
  return payload
}

export async function GET(req: NextRequest) {
  const admin = requireAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const escalations = await prisma.supportEvent.findMany({
    where: { tier: 2 },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  // Attach a triage decision to each escalation.
  const inbox = await Promise.all(
    escalations.map(async (e) => {
      const triage = await triageEvent({
        id: e.id,
        service: e.service,
        check: e.check,
        detail: e.detail,
      }).catch(() => null)
      return { ...e, triage }
    }),
  )

  const recentAuto = await prisma.supportEvent.findMany({
    where: { tier: 1 },
    orderBy: { createdAt: 'desc' },
    take: 25,
  })

  return NextResponse.json({ inbox, recentAuto })
}
