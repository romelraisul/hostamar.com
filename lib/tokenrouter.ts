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
    model: 'qwen3.8-27b',
    url: 'http://127.0.0.1:8020/v1',
    creditCost: 0,
    status: 'planned',
    note: 'TPU v5e-8, 262k ctx, 48 GDN + 16 full-attn. Notebook ready pattern from docs/kaggle-qwen3.8-27b-tpu-recipe.md. 9h session, auto R2 sync.',
  },
  {
    tier: 'kaggle',
    model: 'hunyuanvideo-1.5-8b',
    url: 'comfy+kaggle://gpu-t4x2',
    creditCost: 0,
    status: 'planned',
    note: '480p T2V distilled, 10-13GB, 8-12 steps. Local RTX 5060 quick-draft via ComfyUI :8188; Kaggle heavy batch. R2 upload → TV pull.',
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
