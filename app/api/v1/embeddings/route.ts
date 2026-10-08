import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { deductCredits } from '@/lib/credits'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  const master = process.env.LITELLM_MASTER_KEY || ''
  // Two callers: the internal gateway (LITELLM_MASTER_KEY, free) and paying
  // customers (hk_live_ key → 1cr/call, 402 on insufficient — v12).
  const isMaster = master && auth === `Bearer ${master}`
  if (!isMaster) {
    const authUser = await getAuthUser(req).catch(() => null)
    if (!authUser) {
      return Response.json({ error: { message: 'Missing API key', code: 401 } }, { status: 401 })
    }
    const spend = await deductCredits(authUser.id, -1, 'embeddings', 'v1 embeddings')
    if (!spend.ok) {
      return Response.json(
        {
          error: { message: 'Insufficient credits — bKash 01822417463 (1cr = 1টাকা)', code: 402 },
          balance: spend.balance ?? 0,
          bkash: '01822417463',
        },
        { status: 402 },
      )
    }
  }
  let body: any
  try { body = await req.json() } catch { return Response.json({ error: { message: 'Invalid JSON' } }, { status: 400 }) }
  // proxy to openrouter for embeddings
  const base = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'
  const key = process.env.OPENROUTER_API_KEY
  if (!key) return Response.json({ error: { message: 'No OPENROUTER key' } }, { status: 500 })
  const res = await fetch(`${base}/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  return new Response(text, { status: res.status, headers: { 'Content-Type': 'application/json' } })
}

