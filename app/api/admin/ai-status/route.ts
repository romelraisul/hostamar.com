// /api/admin/ai-status — live AI infrastructure status for the admin panel.
//
// Reports the 24/7 cloud fallback chain (KiloCode -> NVIDIA -> TokenRouter ->
// OpenCode), the local gateway (ai.hostamar.com), and ComfyUI GPU status.
// Provider catalog probes are cached 60s in a module-level global (Vercel
// reuses function instances) so the admin UI can poll frequently without
// hammering free-tier APIs.
//
// SECURITY: /api/admin/* is middleware-whitelisted, so this route SELF-GUARDS
// via auth_token cookie + admin/superadmin role (same pattern as diagnostics).
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getFallbackStatus } from '@/lib/kilocode-client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function requireAdmin(req: NextRequest): { id: string; role?: string } | null {
  const token = req.cookies.get('auth_token')?.value
  if (!token) return null
  const payload = verifyToken(token)
  if (!payload) return null
  if (payload.role !== 'admin' && payload.role !== 'superadmin') return null
  return payload
}

const GATEWAY_URL = (process.env.AI_GATEWAY_URL || 'https://ai.hostamar.com').replace(/\/+$/, '')
const COMFY_URL = (process.env.COMFYUI_PUBLIC_URL || 'https://comfy.hostamar.com').replace(/\/+$/, '')

const PROVIDER_PROBES: Record<string, { base: string; envKey: string; modelsPath: string; freeFilter?: (id: string) => boolean }> = {
  kilocode: {
    base: process.env.KILOCODE_BASE_URL || 'https://api.kilo.ai/api/gateway',
    envKey: 'KILOCODE_API_KEY',
    modelsPath: '/v1/models',
    freeFilter: (id) => id.endsWith(':free') || id.includes('/free'),
  },
  nvidia: {
    base: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
    envKey: 'NVIDIA_API_KEY',
    modelsPath: '/models',
  },
  tokenrouter: {
    base: process.env.TOKENROUTER_BASE_URL || 'https://api.tokenrouter.com/v1',
    envKey: 'TOKENROUTER_API_KEY',
    modelsPath: '/models',
    freeFilter: (id) => id.includes('free'),
  },
  opencode: {
    base: process.env.OPENCODE_ZEN_BASE_URL || 'https://opencode.ai/zen/v1',
    envKey: 'OPENCODE_ZEN_API_KEY',
    modelsPath: '/models',
    freeFilter: (id) => id.endsWith('-free'),
  },
}

// Module-level cache (survives across warm invocations of the same instance).
type ProbeResult = { up: boolean; total: number; free: number; latencyMs: number; sample: string[]; error?: string; probedAt: number }
const g = globalThis as unknown as { __aiStatusCache?: Record<string, ProbeResult> }
const cache: Record<string, ProbeResult> = g.__aiStatusCache || (g.__aiStatusCache = {})
const CACHE_TTL_MS = 60_000

async function probeProvider(name: string): Promise<ProbeResult> {
  const now = Date.now()
  const hit = cache[name]
  if (hit && now - hit.probedAt < CACHE_TTL_MS) return hit

  const cfg = PROVIDER_PROBES[name]
  const key = (process.env[cfg.envKey] || '').trim()
  const result: ProbeResult = { up: false, total: 0, free: 0, latencyMs: 0, sample: [], probedAt: now }
  if (!key) {
    result.error = 'no key'
    cache[name] = result
    return result
  }
  const url = cfg.base.replace(/\/+$/, '') + cfg.modelsPath
  const t0 = Date.now()
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    })
    result.latencyMs = Date.now() - t0
    if (!res.ok) {
      result.error = `HTTP ${res.status}`
    } else {
      const data = await res.json()
      const models: Array<{ id?: string }> = data?.data || data?.models || []
      const ids = models.map((m) => m.id).filter(Boolean) as string[]
      result.total = ids.length
      result.free = cfg.freeFilter ? ids.filter(cfg.freeFilter).length : ids.length
      result.sample = ids.slice(0, 5)
      result.up = ids.length > 0
    }
  } catch (e: unknown) {
    result.latencyMs = Date.now() - t0
    result.error = e instanceof Error ? e.name : 'fetch error'
  }
  cache[name] = result
  return result
}

async function probeUrl(url: string, timeoutMs: number): Promise<{ up: boolean; latencyMs: number; status?: number; body?: any }> {
  const t0 = Date.now()
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), cache: 'no-store' })
    const latencyMs = Date.now() - t0
    let body: any = null
    try { body = await res.json() } catch { /* not json */ }
    return { up: res.ok, latencyMs, status: res.status, body }
  } catch {
    return { up: false, latencyMs: Date.now() - t0 }
  }
}

export async function GET(req: NextRequest) {
  const admin = requireAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const force = req.nextUrl.searchParams.get('force') === '1'
  if (force) {
    for (const k of Object.keys(cache)) delete cache[k]
  }

  // All probes in parallel.
  const [gateway, comfy, kilocode, nvidia, tokenrouter, opencode] = await Promise.all([
    probeUrl(`${GATEWAY_URL}/health`, 2500),
    probeUrl(`${COMFY_URL}/system_stats`, 3500),
    probeProvider('kilocode'),
    probeProvider('nvidia'),
    probeProvider('tokenrouter'),
    probeProvider('opencode'),
  ])

  const chain = getFallbackStatus()

  return NextResponse.json({
    ts: new Date().toISOString(),
    chain,
    gateway: {
      url: GATEWAY_URL,
      up: gateway.up,
      latencyMs: gateway.latencyMs,
      status: gateway.status ?? null,
    },
    comfyui: {
      url: COMFY_URL,
      up: comfy.up,
      latencyMs: comfy.latencyMs,
      gpu: comfy.body?.devices?.[0]
        ? {
            name: comfy.body.devices[0].name,
            vramTotalMB: Math.round((comfy.body.devices[0].vram_total || 0) / 1048576),
            vramFreeMB: Math.round((comfy.body.devices[0].vram_free || 0) / 1048576),
          }
        : null,
      version: comfy.body?.system?.comfyui_version || null,
    },
    providers: { kilocode, nvidia, tokenrouter, opencode },
    cacheTtlSec: CACHE_TTL_MS / 1000,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
