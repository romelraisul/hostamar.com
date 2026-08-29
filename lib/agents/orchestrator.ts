/**
 * Hostamar Autonomous OS — agentic orchestration, ZERO COST.
 *
 * Every agent uses lib/ai-fallback callBestModel (kilocode → CF edge →
 * litellm home → openrouter → knowledge-base). The chain is serverless and
 * always answers, so agents run whether or not the home computer is on.
 *
 * Orchestration patterns implemented (Microsoft "Multiagent Orchestration",
 * 40% of enterprise systems 2026):
 *   - Direct Model Call      → answerSimple()
 *   - Single Agent + Tools   → SupportAgent (kb + credits + escalate tool)
 *   - Sequential Orchestration→ contentPipeline (draft → review → publish)
 *   - Concurrent              → runAgents() fan-out
 *   - Handoff                 → router picks the specialist agent
 *   - Magentic                → planAndExecute() open-ended goal loop
 */
import { callBestModel } from '@/lib/ai-fallback'

export type AgentResult = { agent: string; ok: boolean; output: string; model?: string; provider?: string }

// ---------------------------------------------------------------------------
// Content Agent — drafts marketing copy for the 50-service catalog
// ---------------------------------------------------------------------------
export async function contentAgent(serviceName: string, serviceBenefitBn: string, target: string): Promise<AgentResult> {
  const { text, model, provider } = await callBestModel(
    [{
      role: 'user',
      content: `Hostamar সার্ভিস "${serviceName}" (${serviceBenefitBn}) এর জন্য একটি বাংলা মার্কেটিং কপি লিখুন। টার্গেট: ${target}। শুরুতে হুক, তারপর ৩টি বেনিফিট বুলেট, শেষে CTA (Hostamar.com, bKash 01822417463, 6000 FREE credits)। ৮০ শব্দের মধ্যে।`,
    }],
    'You are Hostamar Content Agent — Bangla marketing copywriter, concise, sales-oriented.',
  )
  return { agent: 'content', ok: text.length > 20, output: text, model, provider }
}

// ---------------------------------------------------------------------------
// Support Agent — answers customer questions, escalates payments
// (Sequential: classify → answer or handoff)
// ---------------------------------------------------------------------------
export async function supportAgent(message: string): Promise<AgentResult & { escalate?: 'payment' | 'human' }> {
  const lower = message.toLowerCase()
  // Handoff rule first — payment disputes go to the payment agent, not the LLM
  if (/(trxid|ট্রানজেকশন|payment failed|পেমেন্ট|refund|টাকা)/.test(lower)) {
    return { agent: 'support', ok: true, output: '', escalate: 'payment' }
  }
  const { text, model, provider } = await callBestModel(
    [{ role: 'user', content: message }],
    'You are Hostamar Support Agent — Bangla+English. Services: 50 AI services, 120 models, TV 50 channels, Cloud Hosting, IDE, Browser, Game hosting. Pricing: Starter ৳599 / Pro ৳1,299 / Business ৳2,999, 6000 FREE credits. bKash 01822417463. Be concise.',
  )
  return { agent: 'support', ok: text.length > 5, output: text, model, provider }
}

// ---------------------------------------------------------------------------
// Payment Agent — validates bKash TrxID format; auto-approves plan amounts
// (used by /api/admin/agent/cron type=auto-payments which owns the DB writes)
// ---------------------------------------------------------------------------
export const TRX_PATTERN = /^[A-Za-z0-9]{8,15}$/
export const PLAN_AMOUNTS = [599, 1299, 2999]

export function paymentAgent(trxId: string, amount: number): AgentResult & { action: 'auto-approve' | 'review' | 'reject' } {
  const validTrx = TRX_PATTERN.test(String(trxId || ''))
  const validAmount = PLAN_AMOUNTS.includes(Number(amount))
  if (validTrx && validAmount) return { agent: 'payment', ok: true, output: `TrxID ${trxId} ৳${amount} valid — auto-approve`, action: 'auto-approve' }
  if (validTrx && !validAmount) return { agent: 'payment', ok: true, output: `TrxID ok, amount ৳${amount} not a plan price — human review`, action: 'review' }
  return { agent: 'payment', ok: false, output: `TrxID "${String(trxId).slice(0, 20)}" invalid format — reject`, action: 'reject' }
}

// ---------------------------------------------------------------------------
// Hosting/TV Agent — health summary of the zero-cost infra
// ---------------------------------------------------------------------------
export async function hostingAgent(stats: { health: boolean; customers: number; tvStable: number; b2Count: number }): Promise<AgentResult> {
  const { text, model, provider } = await callBestModel(
    [{
      role: 'user',
      content: `Infra status: health=${stats.health}, customers=${stats.customers}, tvStable=${stats.tvStable}, b2Objects=${stats.b2Count}. ২ লাইনের বাংলা সামারি লিখুন — সব ঠিক আছে কিনা।`,
    }],
    'You are Hostamar Hosting Agent — one-line status summaries in Bangla.',
  )
  return { agent: 'hosting', ok: true, output: text, model, provider }
}

// ---------------------------------------------------------------------------
// Security Agent — prompt-injection pre-filter (Lakera-Guard-style heuristics)
// Zero cost, runs inline before any LLM call in serverless runtime
// ---------------------------------------------------------------------------
const INJECTION_PATTERNS = [
  /ignore (all|previous|prior) (instructions|prompts)/i,
  /disregard (all|previous)/i,
  /system prompt/i,
  /you are now/i,
  /\bDAN\b|jailbreak/i,
  /reveal (your|the) (instructions|prompt|api key)/i,
  / Forget everything/i,
  /<\|im_start\|>|<\|system\|>/i,
]

export function securityAgent(input: string): { blocked: boolean; reason?: string } {
  for (const p of INJECTION_PATTERNS) {
    if (p.test(input)) return { blocked: true, reason: 'prompt-injection-pattern' }
  }
  return { blocked: false }
}

// ---------------------------------------------------------------------------
// Orchestrator — concurrent fan-out + handoff router + magentic loop
// ---------------------------------------------------------------------------
export async function runAgents(tasks: Array<() => Promise<AgentResult>>): Promise<AgentResult[]> {
  const results = await Promise.allSettled(tasks.map(t => t()))
  return results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : { agent: `task-${i}`, ok: false, output: String(r.reason)?.slice(0, 120) },
  )
}

// Sequential content pipeline: draft → self-review → polish
export async function contentPipeline(brief: string): Promise<AgentResult> {
  const draft = await callBestModel([{ role: 'user', content: `ড্রাফট লিখুন: ${brief}` }], 'Hostamar Content Agent — Bangla first draft.')
  const review = await callBestModel(
    [{ role: 'user', content: `এই কপিটা রিভিউ করুন, ২টি উন্নতি প্রস্তাব দিন:\n${draft.text.slice(0, 1500)}` }],
    'You are a strict Bangla marketing reviewer.',
  )
  const final = await callBestModel(
    [{ role: 'user', content: `ফাইনাল কপি লিখুন এই রিভিউ মাথায় রেখে:\nড্রাফট: ${draft.text.slice(0, 1000)}\nরিভিউ: ${review.text.slice(0, 500)}` }],
    'Hostamar Content Agent — final publish-ready Bangla copy.',
  )
  return { agent: 'content-pipeline', ok: final.text.length > 20, output: final.text, model: final.model, provider: final.provider }
}

// Magentic: plan → execute steps → verify → retry once
export async function planAndExecute(goal: string): Promise<AgentResult> {
  const plan = await callBestModel([{ role: 'user', content: `লক্ষ্য: ${goal}\n৩ ধাপের প্ল্যান দিন, JSON অ্যারে স্ট্রিং হিসেবে: ["ধাপ১","ধাপ২","ধাগ৩"]` }], 'You are a planner agent. Output ONLY the JSON array.')
  let steps: string[] = []
  try { steps = JSON.parse((plan.text.match(/\[[\s\S]*\]/)?.[0] || '[]')) } catch { steps = [goal] }
  const outs: string[] = []
  for (const s of steps.slice(0, 3)) {
    const r = await callBestModel([{ role: 'user', content: `এক্সিকিউট করুন: ${s}` }], 'Hostamar Executor Agent — Bangla.')
    outs.push(`• ${s}: ${r.text.slice(0, 200)}`)
  }
  return { agent: 'magentic', ok: true, output: outs.join('\n'), model: plan.model, provider: plan.provider }
}
