// ============================================================================
// __tests__/v30-hunyuan-queue.test.ts
//
// V30 local HunyuanVideo worker queue — unit tests for the claim/complete/fail
// state machine in app/api/videos/queue/next, upload/complete, queue/fail.
//
// Prisma is the committed in-memory stand-in (__tests__/prisma-mock.ts) wired
// via the vitest.config.ts '@/' alias — seeded per-test below. Auth contract
// is fail-closed (COMFYUI_WORKER_SECRET unset/empty/wrong → 401; V18 rule).
// ============================================================================
import { describe, it, expect, beforeEach } from 'vitest'
// Seed helpers come from the committed in-memory mock (vitest.config.ts maps
// '@/lib/prisma' onto it at RUNTIME; for tsc we import the mock file directly).
import {
  __seedVideoQueue,
  __seedVideos,
  __getQueueRows,
  __getVideoRows,
} from './prisma-mock'

import { GET as queueNext } from '@/app/api/videos/queue/next/route'
import { POST as uploadComplete } from '@/app/api/videos/upload/complete/route'
import { POST as queueFail } from '@/app/api/videos/queue/fail/route'

function req(url: string, init: any = {}) {
  return new Request(url, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers || {}) },
  }) as any
}

function seed() {
  __seedVideoQueue([
    { id: 'q1', customerId: 'c1', topic: 'বগুড়া থেকে কক্সবাজার স্পেশাল প্যাকেজ', priority: 5,
      status: 'pending', attempts: 0, maxAttempts: 3, videoId: 'v1', createdAt: new Date('2026-09-01'), processedAt: null },
    { id: 'q2', customerId: 'c1', topic: 'second job', priority: 5,
      status: 'pending', attempts: 0, maxAttempts: 3, videoId: 'v2', createdAt: new Date('2026-09-02'), processedAt: null },
  ])
  __seedVideos([
    { id: 'v1', customerId: 'c1', title: 'ছুটির আনন্দ দ্বিগুণ', description: 'বগুড়া → কক্সবাজার', prompt: null, language: 'bn', status: 'processing', url: '', format: 'webm', updatedAt: new Date() },
    { id: 'v2', customerId: 'c1', title: 'second video', prompt: null, description: null, language: 'bn', status: 'processing', url: '', format: 'webm', updatedAt: new Date() },
  ])
}

beforeEach(() => {
  seed()
  delete process.env.COMFYUI_WORKER_SECRET
})

describe('V30 queue/next — auth fail-closed (V18 rule)', () => {
  it('401 when COMFYUI_WORKER_SECRET is NOT set in the deployment env', async () => {
    const r = await queueNext(req('http://x/api/videos/queue/next?secret=whatever'))
    expect(r.status).toBe(401)
  })
  it('401 when secret is missing from the request', async () => {
    process.env.COMFYUI_WORKER_SECRET = 's3cret'
    const r = await queueNext(req('http://x/api/videos/queue/next'))
    expect(r.status).toBe(401)
  })
  it('401 on wrong secret', async () => {
    process.env.COMFYUI_WORKER_SECRET = 's3cret'
    const r = await queueNext(req('http://x/api/videos/queue/next?secret=wrong'))
    expect(r.status).toBe(401)
  })
})

describe('V30 queue/next — FIFO claim', () => {
  it('claims the oldest pending row, marks processing, returns the full prompt', async () => {
    process.env.COMFYUI_WORKER_SECRET = 's3cret'
    const r = await queueNext(req('http://x/api/videos/queue/next', { headers: { 'x-worker-secret': 's3cret' } }))
    expect(r.status).toBe(200)
    const j = await r.json()
    expect(j.ok).toBe(true)
    expect(j.queueId).toBe('q1')
    expect(j.videoId).toBe('v1')
    expect(j.topic).toContain('কক্সবাজার')
    expect(j.prompt).toContain('ছুটির আনন্দ দ্বিগুণ')
    expect(j.language).toBe('bn')
    expect(j.engine).toBe('hunyuanvideo-1.5-8b-fp8-comfyui-local')
    const q1 = __getQueueRows()[0]
    expect(q1.status).toBe('processing')
    expect(q1.attempts).toBe(1)
    expect(q1.processedAt).toBeTruthy()
    // customer-facing row set to processing (dashboard pulse)
    expect(__getVideoRows()[0].status).toBe('processing')
  })
  it('empty:true when nothing pending', async () => {
    process.env.COMFYUI_WORKER_SECRET = 's3cret'
    __seedVideoQueue([])
    const r = await queueNext(req('http://x/api/videos/queue/next', { headers: { 'x-worker-secret': 's3cret' } }))
    const j = await r.json()
    expect(j.ok).toBe(true)
    expect(j.empty).toBe(true)
  })
  it('does NOT reclaim a fresh processing row (20-min stale guard)', async () => {
    process.env.COMFYUI_WORKER_SECRET = 's3cret'
    const rows = __getQueueRows()
    rows[0].status = 'processing'
    rows[0].processedAt = new Date() // fresh claim
    const r = await queueNext(req('http://x/api/videos/queue/next', { headers: { 'x-worker-secret': 's3cret' } }))
    const j = await r.json()
    expect(j.videoId).toBe('v2') // skips q1, claims q2
  })
  it('RECLAIMS a processing row older than 20 min (worker crashed)', async () => {
    process.env.COMFYUI_WORKER_SECRET = 's3cret'
    __seedVideoQueue([
      { id: 'q1', customerId: 'c1', topic: 'stale job', priority: 5, status: 'processing',
        attempts: 1, maxAttempts: 3, videoId: 'v1', createdAt: new Date('2026-09-01'),
        processedAt: new Date(Date.now() - 30 * 60_000) },
    ])
    const r = await queueNext(req('http://x/api/videos/queue/next', { headers: { 'x-worker-secret': 's3cret' } }))
    const j = await r.json()
    expect(j.videoId).toBe('v1')
    expect(__getQueueRows()[0].attempts).toBe(2)
  })
})

describe('V30 upload/complete — worker success path', () => {
  it('401 without matching secret', async () => {
    const r = await uploadComplete(req('http://x/api/videos/upload/complete', {
      method: 'POST', body: JSON.stringify({ videoId: 'v1', b2Key: 'videos/v1/final.mp4', secret: 'nope' }),
    }))
    expect(r.status).toBe(401)
  })
  it('flips Video + VideoQueue to completed with the real mp4 url (JSON b2Key path)', async () => {
    process.env.COMFYUI_WORKER_SECRET = 's3cret'
    const r = await uploadComplete(req('http://x/api/videos/upload/complete', {
      method: 'POST', body: JSON.stringify({ videoId: 'v1', b2Key: 'videos/v1/final.mp4', secret: 's3cret' }),
    }))
    expect(r.status).toBe(200)
    const j = await r.json()
    expect(j.ok).toBe(true)
    expect(j.url).toContain('videos/v1/final.mp4')
    const v1 = __getVideoRows()[0]
    expect(v1.status).toBe('completed')
    expect(v1.url).toContain('final.mp4')
    expect(v1.format).toBe('mp4')
    const q1 = __getQueueRows()[0]
    expect(q1.status).toBe('completed')
    expect(q1.renderStatus).toBe('success')
    expect(q1.videoUrl).toContain('final.mp4')
  })
  it('400 when neither file nor b2Key provided', async () => {
    process.env.COMFYUI_WORKER_SECRET = 's3cret'
    const r = await uploadComplete(req('http://x/api/videos/upload/complete', {
      method: 'POST', body: JSON.stringify({ videoId: 'v1', secret: 's3cret' }),
    }))
    expect(r.status).toBe(400)
  })
  it('404 when the video row does not exist', async () => {
    process.env.COMFYUI_WORKER_SECRET = 's3cret'
    const r = await uploadComplete(req('http://x/api/videos/upload/complete', {
      method: 'POST', body: JSON.stringify({ videoId: 'ghost', b2Key: 'videos/ghost/final.mp4', secret: 's3cret' }),
    }))
    expect(r.status).toBe(404)
  })
})

describe('V30 queue/fail — honest failure transition (V28 rule)', () => {
  it('marks the claimed row failed with the render error — never strands', async () => {
    process.env.COMFYUI_WORKER_SECRET = 's3cret'
    const r = await queueFail(req('http://x/api/videos/queue/fail', {
      method: 'POST', body: JSON.stringify({ videoId: 'v1', queueId: 'q1', error: 'CUDA OOM', secret: 's3cret' }),
    }))
    expect(r.status).toBe(200)
    const q1 = __getQueueRows()[0]
    expect(q1.status).toBe('failed')
    expect(q1.renderError).toBe('CUDA OOM')
    expect(__getVideoRows()[0].status).toBe('failed')
  })
  it('401 without the secret', async () => {
    const r = await queueFail(req('http://x/api/videos/queue/fail', {
      method: 'POST', body: JSON.stringify({ videoId: 'v1' }),
    }))
    expect(r.status).toBe(401)
  })
})
