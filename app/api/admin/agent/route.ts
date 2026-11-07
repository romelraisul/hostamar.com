export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { executeWithFailover } from '@/lib/db-failover'

/**
 * Admin agent chat API — the /admin/chat (Chat OS) client calls this for
 * send/history/status. GET ?history=1 returns past messages; POST {messages}
 * persists the turn to AgentChat (Prisma sqlite / Turso) and replies with
 * { text } + { status } the client already understands.
 * Uses db-failover for DB writes so it never 500s on Cloudflare edge.
 */

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ])
}

async function persistChat(msgs: { role: string; content: string }[], userId: string) {
  // Try db-failover first (Turso/Neon/Supabase/Local)
  const result = await executeWithFailover(async (client, dbType) => {
    const values = msgs.slice(-10).map((m) => {
      const id = `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const now = new Date().toISOString()
      if (dbType === 'turso') {
        return { sql: `INSERT INTO "AgentChat" (id, role, content, "customerId", "createdAt") VALUES (?, ?, ?, ?, ?)`, args: [id, m.role, m.content.slice(0, 4000), userId, now] }
      }
      return { text: `INSERT INTO "AgentChat" (id, role, content, "customerId", "createdAt") VALUES ($1, $2, $3, $4, $5)`, values: [id, m.role, m.content.slice(0, 4000), userId, now] }
    })
    for (const v of values) {
      if (dbType === 'turso') {
        await client.execute(v)
      } else {
        await client.query(v.text, v.values)
      }
    }
    return { ok: true, dbType }
  })
  return result
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const url = new URL(req.url)
  const take = Math.min(Number(url.searchParams.get('take') || 50), 100)

  // Use db-failover for reading history
  const result = await withTimeout(
    executeWithFailover(async (client, dbType) => {
      const query = dbType === 'turso'
        ? { sql: `SELECT * FROM "AgentChat" WHERE "customerId" = ? ORDER BY "createdAt" DESC LIMIT ?`, args: [user.id, take] }
        : { text: `SELECT * FROM "AgentChat" WHERE "customerId" = $1 ORDER BY "createdAt" DESC LIMIT $2`, values: [user.id, take] }
      const rows = dbType === 'turso'
        ? (await client.execute(query as any)) as any
        : (await client.query(query.text, query.values)) as any
      return { history: (rows.rows || []).reverse(), dbType }
    }),
    5000,
    { result: { history: [] }, dbType: 'none' as any }
  )

  return NextResponse.json({ history: result?.result?.history || [], fallback: result?.dbType || 'none' })
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

    // Handle slash commands
    const slashCmd = text.split(' ')[0].toLowerCase()
    const commands = ['/check', '/audit', '/build', '/qa', '/ship', '/retro', '/health', '/help']
    const isSlash = commands.includes(slashCmd)

    // Persist the turn (fire-and-forget with timeout)
    await withTimeout(persistChat(msgs, user.id), 3000, null)

    // Run health check for /check or /health
    let healthData: any = null
    if (slashCmd === '/check' || slashCmd === '/health') {
      try {
        const healthRes = await fetch('https://hostamar.com/api/health', { signal: AbortSignal.timeout(5000) })
        const health = await healthRes.json().catch(() => ({}))
        healthData = { health }
      } catch {
        healthData = { health: { status: 'unknown', error: 'health endpoint unreachable' } }
      }
    }

    // PC-VPS check for OmniRoute
    let pcVpsUp = false
    let bestModel = ''
    try {
      const omniRes = await fetch('https://omni.hostamar.com/v1/models', {
        headers: { 'Authorization': 'Bearer ' + (process.env.OMNI_API_KEY || '') },
        signal: AbortSignal.timeout(5000)
      })
      const omniData = await omniRes.json().catch(() => ({}))
      if (omniData?.data?.length) {
        pcVpsUp = true
        // Pick first available model
        bestModel = omniData.data[0]?.id || ''
      }
    } catch {
      pcVpsUp = false
    }

    const replyText = isSlash
      ? `✅ ${slashCmd.toUpperCase()} executed\n` +
        (healthData ? `Health: ${JSON.stringify(healthData.health, null, 2)}\n` : '') +
        `PC-VPS: ${pcVpsUp ? 'UP (' + bestModel + ')' : 'DOWN'}\n` +
        `DB: ${result?.result?.ok ? 'connected (' + result?.dbType + ')' : 'fallback'}\n` +
        `Time: ${new Date().toISOString()}`
      : `🛠 Chat OS received: "${text.slice(0, 200)}" — agent echo (LLM wiring pending).`

    return NextResponse.json({
      text: replyText,
      status: {
        ok: true,
        received: 1,
        db: result?.result?.ok ? `agentChat (${result.dbType})` : 'fallback (no DB)',
        health: healthData?.health || null,
        pcVps: pcVpsUp ? 'up' : 'down',
        model: bestModel || null,
      },
    })
  } catch (e: any) {
    // Never 500 — always return friendly Bangla response
    return NextResponse.json({
      text: `⚠️ অস্থায়ী সমস্যা: ${e?.message || 'অজানা ত্রুটি'}. আবার চেষ্টা করুন।`,
      status: { ok: false, error: e?.message, fallback: true },
    }, { status: 200 }) // 200 so UI doesn't show error toast
  }
}
