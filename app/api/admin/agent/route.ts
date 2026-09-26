export const dynamic = 'force-dynamic'
export const maxDuration = 55

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Admin agent chat API — the /admin/chat (Chat OS) client calls this for
 * send/history/status. GET ?history=1 returns past messages; POST {messages}
 * persists the turn to AgentChat (Prisma sqlite / Turso) and replies with
 * { text } + { status } the client already understands.
 */

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const url = new URL(req.url)
  const take = Math.min(Number(url.searchParams.get('take') || 50), 100)
  try {
    const rows = await prisma.agentChat.findMany({
      where: { customerId: user.id },
      orderBy: { createdAt: 'desc' },
      take,
    })
    return NextResponse.json({ history: rows.reverse() })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'history failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json().catch(() => ({}))
    const msgs: { role: string; content: string }[] = Array.isArray(body.messages)
      ? body.messages
      : [{ role: 'user', content: String(body.message || '') }]
    const lastUser = [...msgs].reverse().find((m) => m.role === 'user')
    const text = lastUser?.content?.trim() || ''
    if (!text) return NextResponse.json({ error: 'empty message' }, { status: 400 })

    // ponytail: echo reply — no LLM call; wire OmniRoute (:20128) here when the
    // echo stub measurably falls short. Persist the turn so history works.
    await prisma.agentChat.createMany({
      data: msgs.slice(-10).map((m) => ({ customerId: user.id, role: m.role, content: m.content })),
    })
    return NextResponse.json({
      text: `🛠 Chat OS received: "${text.slice(0, 200)}" — agent echo (LLM wiring pending).`,
      status: { ok: true, received: 1, db: 'agentChat (sqlite/Turso)' },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'chat failed' }, { status: 500 })
  }
}
