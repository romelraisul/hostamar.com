import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/get-auth-user'
import { env } from '@/lib/env'

export const dynamic = "force-dynamic";
// Static fallback catalog mirroring the gateway's default model list. Used when the
// live gateway is unreachable OR the user has no API key yet, so the Models tab
// always renders something useful. Keep in sync with gateway.py MODELS.
const STATIC_MODELS = [
  { id: 'rafan', object: 'model', owned_by: 'hostamar', description: 'Rafan (Bonsai 27B) — FAST, runs on GPU, 128K context, recommended default' },
  { id: 'rushan', object: 'model', owned_by: 'hostamar', description: 'Rushan (Qwen3.8-27B) — LARGE premium model, slower on CPU' },
  { id: 'borna', object: 'model', owned_by: 'hostamar', description: 'Borna (Gemma 4 31B) — LARGE premium model, slower on CPU' },
  { id: 'hostamar', object: 'model', owned_by: 'hostamar', description: 'Hostamar (Muse Glimmer 30B) — LARGE premium model, slower on CPU' },
  { id: 'image', object: 'model', owned_by: 'hostamar', description: 'Image generation (ComfyUI)' },
  { id: 'video', object: 'model', owned_by: 'hostamar', description: 'Video generation (ComfyUI)' },
  { id: 'romelraisul', object: 'model', owned_by: 'hostamar', description: 'RomelRaisul (LongCat, 1M context)' },
]

// Gateway base URL. ai.hostamar.com is the public tunnel entry (Cloudflare -> local
// gateway). For local dev, point this at http://127.0.0.1:11442.
const GATEWAY_URL = (env.AI_GATEWAY_URL || 'https://ai.hostamar.com').replace(/\/+$/, '')

// GET /api/gateway/models — list Hostamar AI models from the gateway.
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use the user's first active API key to authenticate to the gateway.
    const key = await prisma.apiKey.findFirst({
      where: { customerId: user.id, isActive: true },
      orderBy: { createdAt: 'desc' },
    })
    let live: any[] | null = null
    if (key) {
      try {
        const res = await fetch(`${GATEWAY_URL}/v1/models`, {
          headers: { Authorization: `Bearer ${key.key}` },
          cache: 'no-store',
          signal: AbortSignal.timeout(3000),
        })
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data?.data)) live = data.data
        }
      } catch {
        live = null
      }
    }

    const source = live ? 'live' : 'static'
    let data = live ?? STATIC_MODELS
    // Enrich with context window info from the always-on 95 list so customers
    // can choose big-context vs small-context models in the dashboard picker.
    try {
      const { CONTEXT_MAP, formatContext } = await import('@/lib/gateway/95-models')
      data = data.map((m: any) => {
        const cl = CONTEXT_MAP[m.id]
        return cl
          ? { ...m, display_name: `${m.id} [${formatContext(cl)}]`, context_length: cl, context: formatContext(cl) }
          : m
      })
    } catch { /* enrichment is best-effort */ }
    return NextResponse.json(
      { source, data, gatewayUrl: GATEWAY_URL, hasKey: !!key },
      { headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' } }
    )
  } catch (error) {
    console.error('Gateway models error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
