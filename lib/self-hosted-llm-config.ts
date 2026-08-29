/**
 * Self-hosted LLM config — the ZERO-COST model strategy as a single source
 * of truth. Nothing paid; nothing that dies when the home computer sleeps.
 *
 * Tier 1 (always-on, serverless): kilocode direct free models
 *   kilo-auto/free, meituan/longcat-2.0-free (LongCat-2.0 reasoning,
 *   max_tokens ≥ 500 — reasoning eats short budgets)
 * Tier 2 (always-on edge):      Cloudflare Worker hostamar-ai-gateway
 *   free 100k req/day, KV model-cache 300s
 * Tier 3 (optional, computer ON): litellm http://litellm:4000/v1 home tunnel
 *   GPU-quality inference; supervisor re-establishes the tunnel every 5m
 * Tier 4 (revival):             openrouter free slugs (most retired Aug 2026)
 * Tier 5 (never fails):         knowledge-base Bangla fallback (no LLM, no card)
 *
 * REMOVED (2026-08-26/29): nvidia free (EOL → 410 Gone), vercel ai-gateway
 * (needs card), openrouter :free (retired).
 */

export type ModelTier = 1 | 2 | 3 | 4 | 5

export const SELF_HOSTED_LLM_CONFIG = {
  tiers: [
    {
      tier: 1 as ModelTier,
      name: 'kilocode-direct',
      alwaysOn: true,
      models: ['kilo-auto/free', 'meituan/longcat-2.0-free'],
      notes: 'LongCat-2.0 reasoning — send max_tokens≥500; verified live 2026-08-29.',
    },
    {
      tier: 2 as ModelTier,
      name: 'cloudflare-edge-worker',
      alwaysOn: true,
      models: ['meituan/longcat-2.0-free', 'kilo-auto/free'],
      notes: 'hostamar-ai-gateway workers.dev, x-internal-key; free 100k req/day.',
    },
    {
      tier: 3 as ModelTier,
      name: 'litellm-home',
      alwaysOn: false,
      models: ['qwen3.8-max-free', 'llama-3.1-8b-instruct', 'kilo-auto', 'hy3-free'],
      notes: 'http://litellm:4000/v1 — home GPU, optional. Tunnel supervisor cron 5m.',
    },
    {
      tier: 4 as ModelTier,
      name: 'openrouter-free',
      alwaysOn: true,
      models: ['meta-llama/llama-3.1-8b-instruct:free'],
      notes: 'Most :free slugs retired Aug 2026 — revival tier only.',
    },
    {
      tier: 5 as ModelTier,
      name: 'knowledge-base',
      alwaysOn: true,
      models: [],
      notes: 'Bangla+English canned answers (bKash, pricing, storage, TV). Never fails.',
    },
  ],
  guardrails: {
    promptInjectionFilter: 'lib/security.ts promptInjectionFilter before every LLM call',
    rateLimit: 'lib/rate-limit-edge.ts slidingWindow 100/min chat, 30/min support',
    secretGuard: 'x-cron-secret on /api/admin/agent/cron; middleware JWT-only identity',
  },
}

/** Pick the best model for a task by simple heuristics (zero-cost router). */
export function selectModel(task: 'chat' | 'reasoning' | 'draft' | 'code'): string {
  switch (task) {
    case 'reasoning': return 'meituan/longcat-2.0-free'
    case 'draft': return 'kilo-auto/free'
    case 'code': return 'meituan/longcat-2.0-free'
    default: return 'kilo-auto/free'
  }
}
