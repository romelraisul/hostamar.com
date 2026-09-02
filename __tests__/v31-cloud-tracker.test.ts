// ============================================================================
// __tests__/v31-cloud-tracker.test.ts
//
// V31 PC-as-Cloud — tests the serverless side: heartbeat auth + upsert,
// status honest-offline logic, toggle forwarding. The local tracker itself
// (scripts/cloud-tracker.mjs) is a plain Node process — its probes are
// live-verified against the running PC, not unit-tested here.
// ============================================================================
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  __seedCloudState,
  __getCloudState,
  __resetCloudState,
} from './prisma-mock'

import { POST as heartbeat } from '@/app/api/cloud/heartbeat/route'
import { GET as cloudStatus } from '@/app/api/cloud/status/route'
import { POST as cloudToggle } from '@/app/api/cloud/toggle/route'
import { getAuthUser as getAuthUserDefault } from '@/lib/get-auth-user'

function req(url: string, init: any = {}) {
  return new Request(url, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers || {}) },
  }) as any
}

beforeEach(() => {
  __resetCloudState()
  delete process.env.COMFYUI_WORKER_SECRET
  delete process.env.PC_CLOUD_URL
  vi.restoreAllMocks()
  // restoreAllMocks clears the committed getAuthUser vi.fn implementation —
  // re-seed the default (authed) so every test starts from a known state.
  vi.mocked(getAuthUserDefault).mockResolvedValue({ id: 'u1', email: 'x@x.com' } as any)
})

describe('V31 heartbeat — tracker → DB (fail-closed auth)', () => {
  it('401 without COMFYUI_WORKER_SECRET in deployment env', async () => {
    const r = await heartbeat(req('http://x/api/cloud/heartbeat', {
      method: 'POST',
      headers: { 'x-worker-secret': 'anything' },
      body: JSON.stringify({ pcUptimeSec: 100 }),
    }))
    expect(r.status).toBe(401)
  })
  it('401 with wrong secret', async () => {
    process.env.COMFYUI_WORKER_SECRET = 's3cret'
    const r = await heartbeat(req('http://x/api/cloud/heartbeat', {
      method: 'POST',
      headers: { 'x-worker-secret': 'wrong' },
      body: JSON.stringify({ pcUptimeSec: 100 }),
    }))
    expect(r.status).toBe(401)
    expect(__getCloudState()).toBe(null) // nothing written
  })
  it('upserts the singleton row with live service state on correct secret', async () => {
    process.env.COMFYUI_WORKER_SECRET = 's3cret'
    const r = await heartbeat(req('http://x/api/cloud/heartbeat', {
      method: 'POST',
      headers: { 'x-worker-secret': 's3cret' },
      body: JSON.stringify({
        pcUptimeSec: 3600,
        gpu: { usedMB: 7300, totalMB: 8151, utilPct: 100, tempC: 51 },
        tailscaleIp: '100.68.12.15',
        services: [{ name: 'comfyui-8b', profile: 'core', status: 'up', port: 8188, autoStart: true }],
      }),
    }))
    expect(r.status).toBe(200)
    const j = await r.json()
    expect(j.ok).toBe(true)
    const row = __getCloudState()
    expect(row.pcOn).toBe(true)
    expect(row.tailscaleIp).toBe('100.68.12.15')
    expect((row.services as any[]).length).toBe(1)
    expect((row.gpu as any).utilPct).toBe(100)
  })
})

describe('V31 status — honest offline when PC unreachable', () => {
  it('no heartbeat row + no PC_CLOUD_URL → pcOn:false with honest message + queue count', async () => {
    // dashboard auth: the route imports getAuthUser dynamically — mock it via
    // the committed alias pattern: the real route calls @/lib/get-auth-user.
    const { getAuthUser } = await import('@/lib/get-auth-user')
    vi.mocked(getAuthUser).mockResolvedValue({ id: 'u1', email: 'x@x.com' } as any)
    const r = await cloudStatus(req('http://x/api/cloud/status'))
    expect(r.status).toBe(200)
    const j = await r.json()
    expect(j.pcOn).toBe(false)
    expect(j.queuedVideos).toBeGreaterThanOrEqual(0)
    expect(String(j.message)).toContain('PC offline')
    expect(j.source).toBe('db')
  })
  it('recent heartbeat (PC just on) + unreachable live probe → pcOn:true from db-recent', async () => {
    process.env.COMFYUI_WORKER_SECRET = 's3cret'
    await heartbeat(req('http://x/api/cloud/heartbeat', {
      method: 'POST',
      headers: { 'x-worker-secret': 's3cret' },
      body: JSON.stringify({ pcUptimeSec: 10, services: [{ name: 'postgres', status: 'up' }] }),
    }))
    const { getAuthUser } = await import('@/lib/get-auth-user')
    vi.mocked(getAuthUser).mockResolvedValue({ id: 'u1' } as any)
    const r = await cloudStatus(req('http://x/api/cloud/status'))
    const j = await r.json()
    expect(j.pcOn).toBe(true)
    expect(j.source).toBe('db-recent')
    expect(j.services.length).toBe(1)
  })
  it('stale heartbeat (older than 5 min) → honest pcOn:false with lastSeen', async () => {
    __seedCloudState({
      id: 'pc', pcOn: true,
      lastSeen: new Date(Date.now() - 30 * 60_000), // 30 min ago
      pcUptimeSec: 1000, gpu: null, tailscaleIp: '100.68.12.15', services: [],
    })
    const { getAuthUser } = await import('@/lib/get-auth-user')
    vi.mocked(getAuthUser).mockResolvedValue({ id: 'u1' } as any)
    const r = await cloudStatus(req('http://x/api/cloud/status'))
    const j = await r.json()
    expect(j.pcOn).toBe(false)
    expect(j.lastSeenAgoSec).toBeGreaterThanOrEqual(1795)
    expect(j.tailscaleIp).toBe('100.68.12.15')
    expect(String(j.message)).toContain('queue')
  })
  it('live probe wins when PC answers', async () => {
    // Mock global fetch for the PC_CLOUD_URL probe to return a live state.
    process.env.PC_CLOUD_URL = 'http://100.68.12.15:3006'
    const realFetch = globalThis.fetch
    vi.stubGlobal('fetch', (async (url: any) => {
      if (String(url).includes('100.68.12.15')) {
        return new Response(JSON.stringify({
          pcOn: true, timestamp: new Date().toISOString(),
          gpu: { usedMB: 7000, totalMB: 8151, utilPct: 99, tempC: 50 },
          services: [{ name: 'comfyui-8b', profile: 'core', status: 'up', port: 8188, autoStart: true }],
        }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      return realFetch(url)
    }) as any)
    const { getAuthUser } = await import('@/lib/get-auth-user')
    vi.mocked(getAuthUser).mockResolvedValue({ id: 'u1' } as any)
    const r = await cloudStatus(req('http://x/api/cloud/status'))
    const j = await r.json()
    expect(j.source).toBe('live')
    expect(j.pcOn).toBe(true)
    expect(j.services[0].name).toBe('comfyui-8b')
    vi.unstubAllGlobals()
  })
})

describe('V31 toggle — forwards to the PC tracker', () => {
  it('400 on missing/bad action', async () => {
    const { getAuthUser } = await import('@/lib/get-auth-user')
    vi.mocked(getAuthUser).mockResolvedValue({ id: 'u1' } as any)
    const r = await cloudToggle(req('http://x/api/cloud/toggle', {
      method: 'POST', body: JSON.stringify({ service: 'coolify', action: 'sideways' }),
    }))
    expect(r.status).toBe(400)
  })
  it('503 honest when PC_CLOUD_URL not configured', async () => {
    const { getAuthUser } = await import('@/lib/get-auth-user')
    vi.mocked(getAuthUser).mockResolvedValue({ id: 'u1' } as any)
    const r = await cloudToggle(req('http://x/api/cloud/toggle', {
      method: 'POST', body: JSON.stringify({ service: 'coolify', action: 'up' }),
    }))
    expect(r.status).toBe(503)
    const j = await r.json()
    expect(String(j.error)).toContain('PC_CLOUD_URL')
  })
  it('503 honest when the PC is unreachable (fetch rejects)', async () => {
    // Hermetic: a guaranteed-dead address (test must never hit the real
    // tracker that happens to be running on this dev box).
    process.env.PC_CLOUD_URL = 'http://127.0.0.1:59999'
    const { getAuthUser } = await import('@/lib/get-auth-user')
    vi.mocked(getAuthUser).mockResolvedValue({ id: 'u1' } as any)
    const r = await cloudToggle(req('http://x/api/cloud/toggle', {
      method: 'POST', body: JSON.stringify({ service: 'coolify', action: 'up' }),
    }))
    expect(r.status).toBe(503)
    const j = await r.json()
    expect(String(j.error)).toContain('PC offline')
  })
})
