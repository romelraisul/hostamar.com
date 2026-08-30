/**
 * Market token pricing (V12) — per-1M USD prices verified against the
 * 2026 market research; converted to TK credits at 1 USD = 120 BDT with
 * margin, and 1 credit = 1 TK = 1 future HOST coin.
 *
 * Credit charge = inputTokens/1000 * inCrPer1k + outputTokens/1000 * outCrPer1k
 *                 + baseRequestCr
 */
export const USD_TO_TK = 120

export type ModelPrice = {
  /** USD per 1M input tokens (market-anchored) */
  usdIn: number
  /** USD per 1M output tokens (market-anchored) */
  usdOut: number
  /** base charge per request, in credits */
  baseRequestCr: number
  /** which gateway slot actually serves this model (kilocode/litellm/etc) */
  gatewaySlot?: string
  note?: string
}

/** Anchor classes from the research, reusable for model families. */
export const MARKET_ANCHORS: Record<string, ModelPrice> = {
  flagship:   { usdIn: 5,    usdOut: 25,  baseRequestCr: 2,   note: 'Opus 4.5/4.6 class $5/$25 per 1M' },
  premium:   { usdIn: 2.5,  usdOut: 12.5, baseRequestCr: 1,  note: 'Gemini 3 Pro $2/$12 + Sonnet 5 intro $2/$10 → $2.50/$12.50' },
  workhorse: { usdIn: 3,    usdOut: 15,  baseRequestCr: 1,   note: 'Sonnet 4/4.5/4.6 $3/$15 per 1M' },
  cheap:     { usdIn: 1,    usdOut: 5,   baseRequestCr: 1,   note: 'Haiku 4.5 $1/$5 per 1M' },
  budget:    { usdIn: 0.5,  usdOut: 1.5, baseRequestCr: 1,   note: 'qwen/deepseek class $0.5/$1.5 per 1M' },
  flash:     { usdIn: 0.25, usdOut: 0.5, baseRequestCr: 0.5, note: 'Gemini Flash batch $0.25/$0.50 — floor $0.42-$0.50 combined' },
}

/**
 * Per-model pricing. hostamar-* proprietary models are anchored per the
 * research; known open models priced at their market class. Everything the
 * 120-model catalog serves gets a price here or falls back to `budget`.
 */
export const MODEL_PRICES: Record<string, ModelPrice> = {
  // ── Hostamar proprietary (gateway serves via kilocode/free slots, but
  //    billed at proprietary market-anchored rates) ──
  'hostamar-1m-a':  { ...MARKET_ANCHORS.premium, note: '1M-context workhorse — Gemini 3 Pro/Sonnet 5 intro anchor $2.50/$12.50' },
  'hostamar-1m-b':  { ...MARKET_ANCHORS.flagship, note: 'Premium flagship — Opus 4.5 anchor $5/$25' },
  'hostamar-4':     { ...MARKET_ANCHORS.workhorse, note: 'Hostamar 4 — Sonnet-class $3/$15' },
  'hostamar-flash': { ...MARKET_ANCHORS.flash, note: 'Fast cheap — Flash floor $0.25/$0.50' },
  'hostamar-mini':  { ...MARKET_ANCHORS.flash, note: 'Mini — Flash floor' },

  // ── Kilocode-served (was free; now paid at their market classes) ──
  'kilo-auto/free':           { ...MARKET_ANCHORS.budget, note: 'KiloCode auto — $0.5/$1.5 per 1M' },
  'meituan/longcat-2.0-free':  { ...MARKET_ANCHORS.budget, note: 'LongCat 2.0 — $1/$4 per 1M' },
  'longcat-2.0':               { ...MARKET_ANCHORS.budget, note: 'LongCat 2.0 — $1/$4 per 1M' },

  // ── Claude-class ──
  'claude-opus-4-6':   { ...MARKET_ANCHORS.flagship },
  'claude-sonnet-4-6': { ...MARKET_ANCHORS.workhorse },
  'claude-sonnet-4-5': { ...MARKET_ANCHORS.workhorse },
  'claude-sonnet-4':   { ...MARKET_ANCHORS.workhorse },
  'claude-haiku-4-5':  { ...MARKET_ANCHORS.cheap },

  // ── OpenAI-class ──
  'gpt-4-turbo': { usdIn: 10, usdOut: 30, baseRequestCr: 1, note: 'GPT-4 Turbo $10/$30 per 1M' },
  'gpt-3-5-turbo': { ...MARKET_ANCHORS.budget, note: 'GPT-3.5 Turbo $0.5/$1.5 per 1M' },
  'gpt-5-4': { usdIn: 2.5, usdOut: 15, baseRequestCr: 1, note: 'GPT-5.4 $2.50/$15' },
  'gpt-5-5': { usdIn: 17.5, usdOut: 17.5, baseRequestCr: 2, note: 'GPT-5.5 ~$35 combined — most expensive' },

  // ── Gemini-class ──
  'gemini-2-5-pro':       { usdIn: 1.25, usdOut: 10, baseRequestCr: 1, note: 'Gemini 2.5 Pro $1.25/$10' },
  'gemini-2-5-flash':     { ...MARKET_ANCHORS.flash },
  'gemini-2-5-flash-lite': { usdIn: 0.25, usdOut: 0.25, baseRequestCr: 0.5, note: 'Flash-lite $0.50 combined — cheapest floor' },
  'gemini-3-pro':         { usdIn: 2, usdOut: 12, baseRequestCr: 1, note: 'Gemini 3.1 Pro $2/$12' },
  'gemini-3-flash':       { ...MARKET_ANCHORS.flash },
  'gemini-1-5-pro':       { usdIn: 1.25, usdOut: 5, baseRequestCr: 1, note: 'Gemini 1.5 Pro $1.25/$5' },
  'gemini-1-5-flash':     { ...MARKET_ANCHORS.flash },

  // ── Open-model workhorses ──
  'deepseek-v4-flash': { usdIn: 0.25, usdOut: 0.5, baseRequestCr: 0.5, note: 'DeepSeek V4 Flash $0.42 combined' },
  'qwen3-8-max-free':  { ...MARKET_ANCHORS.budget },
  'qwen3.8-max-free':  { ...MARKET_ANCHORS.budget },
  'llama-3-1-8b-instruct': { usdIn: 0.25, usdOut: 0.5, baseRequestCr: 0.5 },
}

export function getModelPrice(modelId: string): ModelPrice {
  return MODEL_PRICES[modelId] ?? MARKET_ANCHORS.budget
}

/** credits per 1K tokens (TK; 1cr = 1TK). */
export function per1kCr(p: ModelPrice): { inCr: number; outCr: number } {
  return { inCr: (p.usdIn * USD_TO_TK) / 1000, outCr: (p.usdOut * USD_TO_TK) / 1000 }
}

/**
 * Compute the credit charge for a request. 1cr = 1TK = 1 future HOST coin.
 */
export function computeCharge(modelId: string, inputTokens: number, outputTokens: number) {
  const p = getModelPrice(modelId)
  const { inCr, outCr } = per1kCr(p)
  const tokenCr = (inputTokens / 1000) * inCr + (outputTokens / 1000) * outCr
  const credits = Math.max(0.1, Math.round((tokenCr + p.baseRequestCr) * 10) / 10) // 0.1cr resolution
  const usdCost = (inputTokens / 1e6) * p.usdIn + (outputTokens / 1e6) * p.usdOut
  return {
    credits,
    breakdown: {
      inputTokens, outputTokens,
      inCrPer1k: Math.round(inCr * 10000) / 10000,
      outCrPer1k: Math.round(outCr * 10000) / 10000,
      baseRequestCr: p.baseRequestCr,
      usdCost: Math.round(usdCost * 10000) / 10000,
      tkCost: Math.round(credits * 100) / 100,
      note: p.note,
    },
  }
}

/** Display label for the UI: "0.3cr/1K in • 1.5cr/1K out" */
export function priceLabel(modelId: string): string {
  const { inCr, outCr } = per1kCr(getModelPrice(modelId))
  const f = (n: number) => (n < 0.1 ? n.toFixed(3) : n.toFixed(2).replace(/0$/, ''))
  return `${f(inCr)}cr/1K in • ${f(outCr)}cr/1K out`
}
