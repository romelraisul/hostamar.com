export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 55

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { runAction, ACTION_COSTS } from '@/lib/chat-os/core'
import { slidingWindow, getClientIpEdge } from '@/lib/rate-limit-edge'

/**
 * Chat OS API (Orca-style) — every action bills credits BEFORE execution:
 * chat 1cr(+1cr/1k tokens) · terminal 1cr · file_save 1cr · git_commit 1cr ·
 * design_click 1cr · plugin_install 5cr · task_create 2cr · preview 5cr ·
 * mcp_call = tool cost · viewing (file_list/read, git_status/diff, mcp_list,
 * plugin_list, task_list) FREE. Insufficient → 402 + bKash 01822417463.
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({
    actions: Object.entries(ACTION_COSTS).map(([a, c]) => ({ action: a, costCr: c })),
    note: 'every billable action deducts credits first — viewing is free',
  })
}

export async function POST(req: NextRequest) {
  const rl = slipperyWindow(req)
  if (!rl.ok) return NextResponse.json({ error: 'Rate limit' }, { status: 429 })

  const user = await getAuthUser(req)
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const action = String(body.action || '')
  if (!action) return NextResponse.json({ error: 'action required' }, { status: 400 })

  const r = await runAction(user.id, action, body.args || body)
  if (!r.ok && r.error === 'INSUFFICIENT_CREDITS') {
    const i = r as any
    return NextResponse.json({ error: 'INSUFFICIENT_CREDITS', needed: i.needed, balance: i.balance, bkash: r.bkash, topUp: '/dashboard/payment', plans: r.plans }, { status: 402 })
  }
  if (!r.ok) return NextResponse.json({ error: r.error || 'failed' }, { status: 400 })
  return NextResponse.json({ success: true, action, ...r })
}

function slipperyWindow(req: NextRequest) {
  return slidingWindow(`chatos:${getClientIpEdge(req)}`, 60, 60_000) // 60 actions/min
}
