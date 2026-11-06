import { NextRequest, NextResponse } from 'next/server'
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
    // Simple auth check - check for auth_token cookie
    const authToken = req.cookies.get('auth_token')?.value
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Return static models immediately - no Prisma, no tier checks on edge
    return NextResponse.json(
      { source: 'static', data: STATIC_MODELS, gatewayUrl: GATEWAY_URL, hasKey: false, tiers: { up: 0, total: 0 }, tierStatuses: [], degraded: true },
      { headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' } }
    )
  } catch (error) {
    console.error('Gateway models error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}