// ============================================================================
// __tests__/v1-base-route.test.ts
//
// V36.49: GET /api/v1 (the OpenAI-compatible BASE endpoint) must be a public,
// self-describing surface — and ?debug=1 must return the provider trace from
// the live fallback chain. Before V36.49 the path 401'd in middleware
// (only /api/v1/models + /api/v1/chat/completions were allow-listed) and no
// route existed for it, so hostamar.com/api/v1?debug=1 failed verification.
//
// callBestModel is mocked — no real LLM calls in CI.
// ============================================================================
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/ai-fallback', () => ({
  callBestModel: vi.fn(async () => ({
    text: 'ok',
    model: 'hostamar-1m-a',
    provider: 'cf-edge-worker',
    trace: [{ provider: 'cf-edge-worker', status: 'ok', elapsedMs: 123 }],
  })),
}))

import { GET } from '@/app/api/v1/route'
import { callBestModel } from '@/lib/ai-fallback'

const BASE = 'https://hostamar.com/api/v1'

describe('GET /api/v1 base endpoint (V36.49)', () => {
  it('1) plain GET returns endpoint info, no LLM probe', async () => {
    const res = await GET(new Request(BASE) as any)
    expect(res.status).toBe(200)
    const j: any = await res.json()
    expect(j.ok).toBe(true)
    expect(j.endpoint).toBe('/api/v1')
    expect(j.openai_compatible.models).toBe('/api/v1/models')
    expect(j.openai_compatible.chat_completions).toBe('/api/v1/chat/completions')
    expect(callBestModel).not.toHaveBeenCalled()
  })

  it('2) ?debug=1 probes the live chain and returns the full trace', async () => {
    const res = await GET(new Request(`${BASE}?debug=1`) as any)
    expect(res.status).toBe(200)
    const j: any = await res.json()
    expect(j.debug).toBe(true)
    expect(j.ok).toBe(true)
    // the exact verify expectation: a trace array with provider/status ok
    expect(Array.isArray(j.trace)).toBe(true)
    expect(j.trace.length).toBeGreaterThan(0)
    expect(j.trace[0].provider).toBe('cf-edge-worker')
    expect(j.trace[0].status).toBe('ok')
    expect(j.probe.model).toBe('hostamar-1m-a')
    expect(callBestModel).toHaveBeenCalledTimes(1)
    // debug response must never be cached
    expect(res.headers.get('cache-control')).toBe('no-store')
  })
})
