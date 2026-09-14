/**
 * lib/tokenrouter.ts — CEO routing brain for all 120 models.
 *
 * Priority order (grounded in real infra, Sep 9 2026):
 *   1. LOCAL-WSL  — Qwen3.8-Flash-Next 125B-A6B NVFP4 via FreeToken :1919
 *                   (85GB download in flight, ~47.8GiB working set, VRAM 6.6GiB)
 *   2. KAGGLE     — Qwen3.8-27B (TPU v5e-8) / HunyuanVideo 1.5 (T4×2)
 *                   free-tier, 9h sessions, auto R2 upload
 *   3. EDGE       — Bonsai-27B-Q1_0 via llama.cpp :11446 (3.54GB, 8GB VRAM)
 *   4. ZOO        — 120-model cloud fallback chain:
 *                   KiloCode → NVIDIA → TokenRouter → OpenCode Zen
 *
 * failover: when a tier is down, next tier answers. creditCost per model
 * maps to the 1cr=1TK economy (DB catalog is price truth; this is routing truth).
 */

export type Tier = 'local-wsl' | 'kaggle' | 'edge' | 'zoo'

export interface RouteTarget {
  tier: Tier
  model: string
  url: string
  creditCost: number
  status: 'up' | 'down' | 'booting' | 'planned'
  note?: string
}

/** The routing table the CEO tab renders + /api/models/health serves. */
export const TOKENROUTER: RouteTarget[] = [
  {
    tier: 'local-wsl',
    model: 'qwen3.8-flash-next-125b-a6b',
    url: 'http://localhost:1919/v1',
    creditCost: 0, // local GPU — 0 credit, that is the point
    status: 'booting',
    note: '85GB NVFP4 → ~/models (download in flight). ft serve :1919 after upload chain 108/108 + wsl 50GB reboot.',
  },
  {
    tier: 'kaggle',
    model: 'bonsai-27b-q1_0',
    url: process.env.KAGGLE_BONSAI_URL || 'http://127.0.0.1:1919/v1',
    creditCost: 0,
    status: 'planned',
    note: 'Kaggle T4x2 edge — notebook pushed+RUNNING: kaggle.com/code/raisulmahmudromel/hostamar-bonsai-q1-0-354b-edge. GGUF 3.54GB + llama.cpp CUDA, OpenAI-compat :1919.',
  },
  {
    tier: 'kaggle',
    model: 'qwen3.8-27b',
    url: process.env.KAGGLE_QWEN27B_URL || 'http://127.0.0.1:8020/v1',
    creditCost: 0,
    status: 'planned',
    note: 'TPU v5e-8, 262k ctx, 48 GDN + 16 full-attn. Notebook v2 pushed: kaggle.com/code/raisulmahmudromel/hostamar-qwen3-8-27b-main-backup. 9h session, auto R2 sync.',
  },
  {
    tier: 'kaggle',
    model: 'hunyuanvideo-1.5-8b',
    url: process.env.KAGGLE_HUNYUAN_URL || 'comfy+kaggle://gpu-t4x2',
    creditCost: 0,
    status: 'planned',
    note: 'Notebook pushed+RUNNING: kaggle.com/code/raisulmahmudromel/hostamar-hunyuanvideo1-5-video-factory — 480p T2V distilled clips -> R2 -> TV. Hybrid with local ComfyUI :8188 (models rsynced Win->WSL).',
  },
  {
    tier: 'edge',
    model: 'bonsai-27b-q1_0',
    url: 'http://localhost:11446/v1',
    creditCost: 0,
    status: 'planned',
    note: 'GGUF deleted from disk (Sep 2 build only llama-server.exe remains). Re-download via scripts/run-bonsai-dspark.sh to ~/models. Speculative decoding -md draft.',
  },
  {
    tier: 'zoo',
    model: 'kilo-auto/free → nvidia → tokenrouter → opencode',
    url: 'gateway:/api/gateway/models',
    creditCost: 1, // 1cr per 1k tokens routed out — keep 1cr=1TK honest
    status: 'up',
    note: '24/7 cloud fallback chain — live in /api/admin/ai-status. Works with PC off.',
  },
]

/** Resolve a chat request to the first healthy tier. */
export function resolveRoute(prefer?: Tier): RouteTarget {
  const order: Tier[] = [prefer || 'local-wsl', 'kaggle', 'edge', 'zoo']
  for (const t of order) {
    const target = TOKENROUTER.find((r) => r.tier === t && r.status === 'up')
    if (target) return target
  }
  return TOKENROUTER[TOKENROUTER.length - 1] // zoo is always up (cloud)
}

/** Failover toggle the CEO flips: 'auto' walks the order; a pinned tier
 *  forces that tier when up, else falls through. */
export function failover(mode: 'auto' | { pin: Tier }): RouteTarget {
  return mode === 'auto' ? resolveRoute() : resolveRoute(mode.pin)
}

// ── On-Demand Kaggle integration (V36.31) ─────────────────────────────────
// Server-side only: needs KAGGLE_API_TOKEN + 10s budget. The CEO strip and
// /api/kaggle/* routes use lib/kaggle-on-demand.ts directly.

/**
 * On-Demand aware failover: walk tier order; a kaggle tier that is IDLE gets
 * an on-demand START (CreateKernelSession) before routing gives up on it.
 * Local-wsl down -> qwen27b backup brain starts on demand, quota-gated 25h/30h.
 */
export async function failoverOnDemand(prefer?: Tier): Promise<RouteTarget & { demandAction?: string }> {
  const { quota, notebookStatus, startNotebook } = await import('@/lib/kaggle-on-demand')
  const order: Tier[] = [prefer || 'local-wsl', 'kaggle', 'edge', 'zoo']
  for (const t of order) {
    const live = TOKENROUTER.filter((r) => r.tier === t && r.status === 'up')
    if (live.length) return live[0]
    if (t === 'kaggle') {
      try {
        const q = await quota()
        if (!q.startDisabled) {
          const st = await notebookStatus('qwen27b')
          if (st.state === 'IDLE') {
            await startNotebook('qwen27b')
            const backup = TOKENROUTER.find((r) => r.model === 'qwen3.8-27b')
            if (backup) return { ...backup, demandAction: 'on-demand started: qwen27b backup brain' }
          }
        }
      } catch {
        // quota/rpc fail — fall through to next tier (edge/zoo)
      }
    }
  }
  return TOKENROUTER[TOKENROUTER.length - 1] // zoo always up (cloud)
}
