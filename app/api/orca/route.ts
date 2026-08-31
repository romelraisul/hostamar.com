export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 55

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { listWorktrees, createWorktree, fanPrompt, CLIENTS } from '@/lib/orca/worktrees'
import { priceLabel } from '@/lib/pricing/market-pricing'

/**
 * POST /api/orca — Orca ADE worktree actions (PAID V12):
 *  list_worktrees (free) · create_worktree (5cr) · fan_prompt (5cr × N) ·
 *  clients (free)
 * GET /api/orca?price-model=X — model price label (free)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const pm = searchParams.get('price-model')
  if (pm) return NextResponse.json({ model: pm, label: priceLabel(pm) })
  return NextResponse.json({ clients: CLIENTS })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const action = String(body.action || '')
  const userId = user.id

  async function bill(cost: number): Promise<{ ok: true; remaining: number } | { ok: false; needed: number; balance: number }> {
    if (cost === 0) return { ok: true, remaining: -1 }
    const { prisma } = await import('@/lib/prisma')
    const c = await prisma.customer.findUnique({ where: { id: userId }, select: { credits: true } }).catch(() => null)
    const balance = Number(c?.credits ?? 0)
    if (balance < cost) return { ok: false, needed: cost, balance }
    const dec: any = await prisma.$executeRaw`UPDATE "Customer" SET credits = credits - ${cost} WHERE id = ${userId} AND credits >= ${cost}`
    if (Number(dec) === 0) return { ok: false, needed: cost, balance }
    const after = await prisma.$queryRaw<any[]>`SELECT credits FROM "Customer" WHERE id = ${userId} LIMIT 1`
    const remaining = Number(after?.[0]?.credits ?? 0)
    await prisma.$executeRaw`
      INSERT INTO "CreditTransaction" (id, "customerId", amount, type, description, "balanceAfter")
      VALUES (${'orx_' + Date.now().toString(36)}, ${userId}, ${-cost}, 'orca', ${`orca ${action}`}, ${Math.round(remaining)})
    `.catch(() => null)
    return { ok: true, remaining }
  }

  switch (action) {
    case 'list_worktrees': {
      const worktrees = await listWorktrees(userId)
      return NextResponse.json({ success: true, result: { worktrees } })
    }
    case 'create_worktree': {
      const b = await bill(5)
      if (!b.ok) return NextResponse.json({ error: 'INSUFFICIENT_CREDITS', needed: b.needed, balance: b.balance, bkash: '01822417463', plans: { Starter: '599TK → 6000cr', Pro: '1299TK → 13000cr', Business: '2999TK → 30000cr' } }, { status: 402 })
      const worktree = await createWorktree(userId, String(body.args?.name || ''), String(body.args?.agent || 'hostamar'))
      return NextResponse.json({ success: true, result: { worktree }, remaining: b.remaining })
    }
    case 'fan_prompt': {
      const ids: string[] = (body.args?.worktreeIds || []).slice(0, 5)
      // V18 (defense-in-depth): only fan across worktrees OWNED by the caller.
      // The B2 write path is caller-prefixed (safe), but a foreign id must be
      // rejected BEFORE billing so users can't pay to fan into ids that
      // aren't theirs (and future refactors can't reintroduce cross-tenant writes).
      const owned = new Set((await listWorktrees(userId)).map(w => w.id))
      const foreign = ids.filter(id => !owned.has(id))
      if (foreign.length) {
        return NextResponse.json({ error: 'FORBIDDEN', message: 'Not your worktree', foreign }, { status: 403 })
      }
      const b = await bill(5 * Math.max(1, ids.length))
      if (!b.ok) return NextResponse.json({ error: 'INSUFFICIENT_CREDITS', needed: b.needed, balance: b.balance, bkash: '01822417463', plans: { Starter: '599TK → 6000cr', Pro: '1299TK → 13000cr', Business: '2999TK → 30000cr' } }, { status: 402 })
      const results = await fanPrompt(userId, String(body.args?.prompt || ''), ids, body.args?.model)
      return NextResponse.json({ success: true, result: { results }, remaining: b.remaining })
    }
    case 'clients': {
      return NextResponse.json({ success: true, result: { clients: CLIENTS } })
    }
    default:
      return NextResponse.json({ error: 'UNKNOWN_ACTION', available: ['list_worktrees', 'create_worktree', 'fan_prompt', 'clients'] }, { status: 400 })
  }
}
