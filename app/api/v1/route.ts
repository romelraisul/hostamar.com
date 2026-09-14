import { NextRequest, NextResponse } from 'next/server'
import { callBestModel } from '@/lib/ai-fallback'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 55

/**
 * GET /api/v1 — public OpenAI-compatible BASE endpoint (V36.49).
 *
 * Before V36.49 this exact path 401'd: middleware only allow-listed
 * /api/v1/models + /api/v1/chat/completions, and no route.ts existed for the
 * base path — so the documented verify URL hostamar.com/api/v1?debug=1
 * returned {"error":"Not authenticated"}.
 *
 * Plain GET returns endpoint discovery info (models/chat/embeddings paths).
 * ?debug=1 runs a tiny live probe through the real fallback chain and returns
 * the full provider trace — same shape as /api/v1/chat/completions?debug=1 —
 * so the gateway can be verified end-to-end from a browser.
 */
export async function GET(req: NextRequest) {
  const started = Date.now()
  const base = {
    ok: true,
    endpoint: '/api/v1',
    openai_compatible: {
      models: '/api/v1/models',
      chat_completions: '/api/v1/chat/completions',
      embeddings: '/api/v1/embeddings (Bearer LITELLM_MASTER_KEY)',
    },
    usage: 'Point CLIs at OPENAI_BASE_URL=https://hostamar.com/api/v1',
  }

  const debug = new URL(req.url).searchParams.get('debug') === '1'
  if (!debug) {
    return NextResponse.json(base)
  }

  const result = await callBestModel(
    [{ role: 'user', content: 'Reply with exactly: ok' }],
    'You are the Hostamar gateway health probe. Reply with exactly: ok',
    undefined,
    true,
  )

  return NextResponse.json(
    {
      ...base,
      debug: true,
      probe: {
        model: result.model,
        provider: result.provider,
        latencyMs: Date.now() - started,
        text: (result.text || '').slice(0, 200),
      },
      trace: result.trace ?? [],
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
