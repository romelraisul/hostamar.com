/**
 * lib/kaggle-on-demand.ts — Vercel-style serverless Kaggle control plane.
 *
 * Grounded Sep 9 2026 by live RPC test (api.kaggle.com/v1 JSON-RPC, Bearer KGAT_ token):
 *   GetKernelSessionStatus -> {"status":"COMPLETE"|"RUNNING"|"ERROR"|"QUEUED"|...}
 *   GetAcceleratorQuotaStatistics -> gpuQuota/tpuQuota {timeUsed,timeReserved,totalTimeAllowed}
 *   CancelKernelSession -> STOP (real cancel, not wait-for-complete)
 *   CreateKernelSession -> START a saved notebook (no re-push needed)
 *
 * On-Demand strategy (account-safe, Vercel-like):
 *   IDLE = kernel in COMPLETE state = 0 GPU hours. START on demand, STOP after
 *   idle, quota gate at 25/30h, secrets stay in Kaggle Secrets, loop brake on abuse logs.
 */

const KAGGLE_API = 'https://api.kaggle.com/v1/kernels.KernelsApiService'

export const KAGGLE_NOTEBOOKS = {
  bonsai: {
    slug: 'hostamar-bonsai-q1-0-354b-edge',
    port: 1919,
    role: 'edge — Bonsai-27B Q1_0 3.54GB llama.cpp',
    maxHours: 8.5,
  },
  qwen27b: {
    slug: 'hostamar-qwen3-8-27b-main-backup',
    port: 1920,
    role: 'backup brain — Qwen3.8-27B 262k ctx',
    maxHours: 8.5,
  },
  hunyuanvideo: {
    slug: 'hostamar-hunyuanvideo1-5-video-factory',
    port: 8188,
    role: 'video factory — HunyuanVideo 1.5 distilled T2V',
    maxHours: 8.5,
  },
} as const

export type NotebookKey = keyof typeof KAGGLE_NOTEBOOKS

function token(): string {
  const t = process.env.KAGGLE_API_TOKEN
  if (!t) throw new Error('KAGGLE_API_TOKEN env missing')
  return t
}

async function rpc<T = Record<string, unknown>>(method: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${KAGGLE_API}/${method}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    // Kaggle RPC can take a moment; Vercel hobby function cap 10s — keep tight
    signal: AbortSignal.timeout(9_000),
  })
  if (!res.ok) throw new Error(`Kaggle RPC ${method} -> ${res.status}`)
  return res.json() as Promise<T>
}

export const userName = () => process.env.KAGGLE_USERNAME || 'raisulmahmudromel'

export interface KaggleStatus {
  notebook: NotebookKey
  slug: string
  status: string // COMPLETE | RUNNING | QUEUED | ERROR | CANCELACKNOWLEDGED ...
  state: 'IDLE' | 'RUNNING' | 'STARTING' | 'STOPPING' | 'ERROR'
}

export async function notebookStatus(nb: NotebookKey): Promise<KaggleStatus> {
  const slug = KAGGLE_NOTEBOOKS[nb].slug
  const r = await rpc('GetKernelSessionStatus', { userName: userName(), kernelSlug: slug })
  const s = String((r as Record<string, unknown>).status || 'UNKNOWN')
  const state: KaggleStatus['state'] =
    s === 'RUNNING' || s === 'QUEUED' ? (s === 'QUEUED' ? 'STARTING' : 'RUNNING')
    : s === 'COMPLETE' ? 'IDLE'
    : s === 'ERROR' ? 'ERROR'
    : 'IDLE'
  return { notebook: nb, slug, status: s, state }
}

export async function allStatuses(): Promise<KaggleStatus[]> {
  const keys = Object.keys(KAGGLE_NOTEBOOKS) as NotebookKey[]
  return Promise.all(
    keys.map((k) => notebookStatus(k).catch((e) => ({ notebook: k, slug: KAGGLE_NOTEBOOKS[k].slug, status: `FETCH_FAIL:${e}`, state: 'ERROR' as const }))),
  )
}

/** START — on-demand. Creates a session for the saved notebook. */
export async function startNotebook(nb: NotebookKey): Promise<{ ok: boolean; detail: unknown }> {
  const s = await notebookStatus(nb)
  if (s.state === 'RUNNING' || s.state === 'STARTING') return { ok: true, detail: `already ${s.state}` }
  const r = await rpc('CreateKernelSession', {
    userName: userName(),
    kernelSlug: KAGGLE_NOTEBOOKS[nb].slug,
  })
  return { ok: true, detail: r }
}

/** STOP — real cancel via CancelKernelSession (account-safe: frees GPU immediately). */
export async function stopNotebook(nb: NotebookKey): Promise<{ ok: boolean; detail: unknown }> {
  const s = await notebookStatus(nb)
  if (s.state === 'IDLE') return { ok: true, detail: 'already idle' }
  const r = await rpc('CancelKernelSession', {
    userName: userName(),
    kernelSlug: KAGGLE_NOTEBOOKS[nb].slug,
  })
  return { ok: true, detail: r }
}

/** Quota — GPU 30h/week, TPU 20h (verified live: totals 108000s/72000s). */
export interface KaggleQuota {
  gpuUsedSec: number
  gpuTotalSec: number
  tpuUsedSec: number
  tpuTotalSec: number
  refreshTime: string
  startDisabled: boolean // true when usage >= 25/30h — leave headroom
}

export async function quota(): Promise<KaggleQuota> {
  const r = await rpc('GetAcceleratorQuotaStatistics', { userName: userName() }) as Record<string, any>
  const g = r.gpuQuota || {}, t = r.tpuQuota || {}
  const parse = (v: unknown) => parseInt(String(v ?? '0s').replace(/[^\d-]/g, ''), 10) || 0
  const gpuUsed = parse(g.timeUsed) + parse(g.timeReserved)
  const tpuUsed = parse(t.timeUsed) + parse(t.timeReserved)
  const gpuTotal = parse(g.totalTimeAllowed)
  return {
    gpuUsedSec: gpuUsed,
    gpuTotalSec: gpuTotal,
    tpuUsedSec: tpuUsed,
    tpuTotalSec: parse(t.totalTimeAllowed),
    refreshTime: String(r.quotaRefreshTime || ''),
    startDisabled: gpuTotal > 0 && gpuUsed >= Math.floor(gpuTotal * (25 / 30)), // 25h of 30h gate
  }
}

/** Auto-start rule for TokenRouter: local-wsl down -> start kaggle backup brain. */
export async function autoStartForFailover(): Promise<{ started: boolean; reason: string }> {
  const q = await quota()
  if (q.startDisabled) return { started: false, reason: `quota gate: ${Math.round(q.gpuUsedSec / 3600)}h/30h used — edge fallback only` }
  const st = await notebookStatus('qwen27b')
  if (st.state === 'IDLE') {
    await startNotebook('qwen27b')
    return { started: true, reason: 'local-wsl down — qwen27b backup started on-demand' }
  }
  return { started: false, reason: `qwen27b already ${st.state}` }
}
