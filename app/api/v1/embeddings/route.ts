import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { deductCredits } from '@/lib/credits'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  const master = process.env.LITELLM_MASTER_KEY || ''
  const base = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'
  const key = process.env.OPENROUTER_API_KEY
  let chargedTo: string | null = null
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
    chargedTo = authUser.id
  }
  let body: any
  try { body = await req.json() } catch { return Response.json({ error: { message: 'Invalid JSON' } }, { status: 400 }) }
  // Local-first: our own Ollama embedding router (4 models, auto-routed by
  // language/length, all free). The tunnel exposes it at embeddings.hostamar.com.
  // When the PC is off the fetch fails and we fall through to OpenRouter below.
  const localUrl = process.env.EMBEDDINGS_URL || 'https://embeddings.hostamar.com/v1/embeddings'
  let res: Response | null = null
  try {
    const local = await fetch(localUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45_000),
    })
    if (local.ok) res = local
  } catch {
    res = null
  }
  if (res) {
    return new Response(await res.text(), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
  // Local router unreachable (PC off / tunnel down) -> OpenRouter.
  // Config check AFTER the credit gate: insufficient credits must always be 402,
  // and an unconfigured upstream must never charge anyone.
  if (!key) {
    // Unconfigured upstream: hand the credit back, then 500 (never bill for a 5xx).
    if (chargedTo) await deductCredits(chargedTo, 1, 'refund', 'embeddings unconfigured').catch(() => null)
    return Response.json({ error: { message: 'No OPENROUTER key' } }, { status: 500 })
  }
  const callEmbed = (payload: any) =>
    fetch(`${base}/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(payload),
    })
  res = await callEmbed(body)
  // $0 budget: this OpenRouter account has never purchased credits, so a paid
  // embedding model answers 402. Retry once on the free model instead of
  // failing the customer — the vector is real either way, and the debit stands
  // only for the 2xx we are about to return.
  const fallbackModel = process.env.OPENROUTER_EMBED_FALLBACK || 'nvidia/llama-nemotron-embed-vl-1b-v2:free'
  if (res.status === 402 && body?.model !== fallbackModel) {
    res = await callEmbed({ ...body, model: fallbackModel })
  }
  const text = await res.text()
  // Refund on upstream failure — never bill a customer for a 5xx.
  if (!res.ok && chargedTo) await deductCredits(chargedTo, 1, 'refund', 'embeddings upstream failed').catch(() => null)
  return new Response(text, { status: res.status, headers: { 'Content-Type': 'application/json' } })
}

