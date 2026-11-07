import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/lib/env'

export const dynamic = 'force-dynamic'

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

type Tier = 'local-wsl' | 'kaggle' | 'edge' | 'zoo'

interface TierStatus {
  tier: Tier
  model: string
  url: string
  creditCost: number
  status: 'up' | 'down' | 'booting' | 'planned'
  note?: string
  healthy?: boolean
}

const TIER_CONFIG: TierStatus[] = [
  {
    tier: 'local-wsl',
    model: 'qwen3.8-flash-next-125b-a6b',
    url: 'http://localhost:1919/v1',
    creditCost: 0,
    status: 'booting',
    note: 'Local GPU — 0 credit',
  },
  {
    tier: 'kaggle',
    model: 'qwen3.8-27b',
    url: env.KAGGLE_QWEN27B_URL || 'http://127.0.0.1:8020/v1',
    creditCost: 0,
    status: 'planned',
    note: 'Kaggle TPU v5e-8 — 9h sessions',
  },
  {
    tier: 'kaggle',
    model: 'bonsai-27b-q1_0',
    url: env.KAGGLE_BONSAI_URL || 'http://127.0.0.1:1919/v1',
    creditCost: 0,
    status: 'planned',
    note: 'Kaggle T4x2 — GGUF 3.54GB',
  },
  {
    tier: 'kaggle',
    model: 'hunyuanvideo-1.5-8b',
    url: env.KAGGLE_HUNYUAN_URL || 'comfy+kaggle://gpu-t4x2',
    creditCost: 0,
    status: 'planned',
    note: 'Kaggle T4x2 — video factory',
  },
  {
    tier: 'edge',
    model: 'bonsai-27b-q1_0',
    url: 'http://localhost:11446/v1',
    creditCost: 0,
    status: 'planned',
    note: 'Edge GGUF — speculative decoding',
  },
  {
    tier: 'zoo',
    model: 'kilo-auto/free → nvidia → tokenrouter → opencode',
    url: 'gateway:/api/gateway/models',
    creditCost: 1,
    status: 'up',
    note: '24/7 cloud fallback chain',
  },
]

async function checkTierHealth(tier: TierStatus): Promise<TierStatus> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 2000)
  try {
    const baseUrl = tier.url.replace('/v1', '').replace('comfy+kaggle://gpu-t4x2', 'http://localhost:8188')
    if (baseUrl.startsWith('gateway:')) {
      return { ...tier, status: 'up', healthy: true }
    }
    const res = await fetch(`${baseUrl}/models`, { signal: controller.signal })
    clearTimeout(timeout)
    return { ...tier, status: res.ok ? 'up' : 'down', healthy: res.ok }
  } catch {
    clearTimeout(timeout)
    return { ...tier, status: 'down', healthy: false }
  }
}

// GET /api/gateway/models — list Hostamar AI models from the gateway.
export async function GET(req: NextRequest) {
  try {
    // Simple auth check - check for auth_token cookie
    const authToken = req.cookies.get('auth_token')?.value
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check all tiers with 2s timeout each
    const tierStatuses = await Promise.all(TIER_CONFIG.map(checkTierHealth))
    const upTiers = tierStatuses.filter(t => t.healthy).length
    const totalTiers = tierStatuses.length

    // Return static models immediately - no Prisma, no tier checks on edge
    return NextResponse.json(
      {
        source: 'static',
        data: STATIC_MODELS,
        gatewayUrl: (env.AI_GATEWAY_URL || 'https://ai.hostamar.com').replace(/\/+$/, ''),
        hasKey: false,
        tiers: { up: upTiers, total: totalTiers },
        tierStatuses,
        degraded: upTiers < totalTiers,
      },
      { headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' } }
    )
  } catch (error) {
    console.error('Gateway models error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}