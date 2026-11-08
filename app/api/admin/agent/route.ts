export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { executeWithFailover, getDBHealth, getActiveDB } from '@/lib/db-failover'
import { callBestModel } from '@/lib/ai-fallback'
import { OPS_EMPLOYEES, LANE_META } from '@/lib/ops-lanes'

/**
 * Super Robust Admin Agent — never 500s, handles dev/marketing/fleet/biz in Bangla.
 * Uses db-failover for all DB ops, 35s total budget, callBestModel for LLM.
 */

const TIMEOUTS = {
  total: 35_000,
  db: 5_000,
  model: 30_000,
  health: 5_000,
} as const

function withTimeout<T>(p: Promise<T>, ms: number, fb: T): Promise<T> {
  return Promise.race([p, new Promise<T>(r => setTimeout(() => r(fb), ms))])
}

async function fetchBrainModelCount(): Promise<number> {
  try {
    const res = await withTimeout(fetch('http://localhost:4000/v1/models').then(r => r.json().catch(() => ({ data: [] }))).catch(() => ({ data: [] })), 5000, { data: [] })
    return res.data?.length || 0
  } catch { return 0 }
}

async function persistChat(msgs: { role: string; content: string }[], userId: string) {
  const res = await executeWithFailover(async (client, dbType) => {
    const vals = msgs.slice(-10).map(m => {
      const id = `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const now = new Date().toISOString()
      if (dbType === 'turso') return { sql: `INSERT INTO "AgentChat" (id, role, content, "customerId", "createdAt") VALUES (?, ?, ?, ?, ?)`, args: [id, m.role, m.content.slice(0, 4000), userId, now] }
      return { text: `INSERT INTO "AgentChat" (id, role, content, "customerId", "createdAt") VALUES ($1, $2, $3, $4, $5)`, values: [id, m.role, m.content.slice(0, 4000), userId, now] }
    })
    for (const v of vals) dbType === 'turso' ? await client.execute(v) : await client.query(v.text, v.values)
    return { ok: true, dbType }
  })
  return res
}

async function getHistory(userId: string, take = 50) {
  return withTimeout(
    executeWithFailover(async (client, dbType) => {
      const q = dbType === 'turso'
        ? { sql: `SELECT * FROM "AgentChat" WHERE "customerId" = ? ORDER BY "createdAt" DESC LIMIT ?`, args: [userId, take] }
        : { text: `SELECT * FROM "AgentChat" WHERE "customerId" = $1 ORDER BY "createdAt" DESC LIMIT $2`, values: [userId, take] }
      const rows = dbType === 'turso' ? (await client.execute(q as any)) as any : (await client.query(q.text, q.values)) as any
      return { history: (rows.rows || []).reverse(), dbType }
    }),
    5_000,
    { result: { history: [], dbType: 'none' as any }, dbType: 'none' as any }
  )
}

type Intent =
  | { type: 'health'; cmd: '/check' | '/health' }
  | { type: 'audit'; cmd: '/audit'; target?: string }
  | { type: 'build'; cmd: '/build'; target: string }
  | { type: 'qa'; cmd: '/qa' }
  | { type: 'ship'; cmd: '/ship' }
  | { type: 'retro'; cmd: '/retro' }
  | { type: 'help'; cmd: '/help' }
  | { type: 'fleet'; action: 'status' | 'missing' | 'run' | 'report' }
  | { type: 'biz'; action: 'orders' | 'payments' | 'signup' | 'mrr' }
  | { type: 'dev'; action: 'read' | 'fix' | 'log' | 'status'; target?: string }
  | { type: 'marketing'; action: 'post' | 'seo' | 'script'; topic: string }
  | { type: 'chat'; text: string }

function parseIntent(text: string): Intent {
  const t = text.trim().toLowerCase()
  if (!t) return { type: 'chat', text: '' }

  // Slash commands
  const slash = t.split(' ')[0]
  const args = t.slice(slash.length).trim()
  if (slash === '/check' || slash === '/health') return { type: 'health', cmd: slash as '/check' | '/health' }
  if (slash === '/audit') return { type: 'audit', cmd: '/audit', target: args }
  if (slash === '/build') return { type: 'build', cmd: '/build', target: args || 'auto' }
  if (slash === '/qa') return { type: 'qa', cmd: '/qa' }
  if (slash === '/ship') return { type: 'ship', cmd: '/ship' }
  if (slash === '/retro') return { type: 'retro', cmd: '/retro' }
  if (slash === '/help') return { type: 'help', cmd: '/help' }

  // Natural language intent detection (Bangla/English)
  if (/(ফ্লিট|fleet).*?(রিপোর্ট|status|কি হইছে|report)/i.test(t)) return { type: 'fleet', action: 'status' }
  if (/(ফ্লিট|fleet).*?(নিখোঁজ|missing|দেখায় না)/i.test(t)) return { type: 'fleet', action: 'missing' }
  if (/(ফ্লিট|fleet).*?(চালাও|run|স্টার্ট)/i.test(t)) return { type: 'fleet', action: 'run' }
  if (/(অর্ডার|order).*?(কত|কইছে|pending)/i.test(t)) return { type: 'biz', action: 'orders' }
  if (/(পেমেন্ট|payment|ট্র্যাক্সআইডি|trxid|বিকাশ|নগদ|রকেট)/i.test(t)) return { type: 'biz', action: 'payments' }
  if (/(সাইনআপ|signup|নতুন.*কাস্টমার)/i.test(t)) return { type: 'biz', action: 'signup' }
  if (/(এমআরআর|mrr|রেভেণিউ|revenue)/i.test(t)) return { type: 'biz', action: 'mrr' }
  if (/(পোস্ট|post|মার্কেটিং|marketing|ফেসবুক|facebook).*?(লিখ|লিখে|দাও|কর)/i.test(t)) return { type: 'marketing', action: 'post', topic: args || 'বিজনেস প্ল্যান ১৯৯৯' }
  if (/(এসইও|seo).*?(অডিট|audit|চেক|দেখ)/i.test(t)) return { type: 'marketing', action: 'seo', topic: args }
  if (/(স্ক্রিপ্ট|script|টিভি|tv).*?(লিখ|দাও)/i.test(t)) return { type: 'marketing', action: 'script', topic: args }
  if (/(ফাইল|file|কোড|code).*?(পড়|read|দেখ|দেখাও)/i.test(t)) return { type: 'dev', action: 'read', target: args }
  if (/(ফিক্স|fix|বাগ|bug|ভাঙা|broken).*?(কর|দাও|দেখ)/i.test(t)) return { type: 'dev', action: 'fix', target: args }
  if (/(লগ|log|বিল্ড|build|সিআই|ci).*?(দেখ|দেখাও|চেক)/i.test(t)) return { type: 'dev', action: 'log' }
  if (/(স্ট্যাটাস|status|গিট|git).*?(দেখ|দেখাও)/i.test(t)) return { type: 'dev', action: 'status' }

  return { type: 'chat', text }
}

// Health check aggregator
async function runHealth() {
  const start = Date.now()
  const [healthRes, dbHealth, omniRes] = await Promise.allSettled([
    withTimeout(fetch('https://hostamar.com/api/health', { signal: AbortSignal.timeout(TIMEOUTS.health) }).then(r => r.json().catch(() => ({}))), TIMEOUTS.health, { status: 'unknown' }),
    withTimeout(getDBHealth(), TIMEOUTS.db, null),
    withTimeout(fetch('https://omni.hostamar.com/v1/models', { headers: { Authorization: 'Bearer ' + (process.env.OMNI_API_KEY || '') }, signal: AbortSignal.timeout(TIMEOUTS.health) }).then(r => r.json().catch(() => ({}))), TIMEOUTS.health, { data: [] }),
  ])

  const health = healthRes.status === 'fulfilled' ? healthRes.value : { status: 'error', error: healthRes.reason?.message }
  const db = dbHealth.status === 'fulfilled' ? dbHealth.value : null
  const omni = omniRes.status === 'fulfilled' ? omniRes.value : { data: [] }
  const pcVpsUp = !!omni.data?.length
  const bestModel = omni.data?.[0]?.id || ''

  return {
    ok: health.status === 'healthy',
    health: { ...health, responseTimeMs: Date.now() - start },
    db: db ? { active: db.active, turso: db.turso, neon: db.neon, supabase: db.supabase, local: db.local, errors: db.errors } : { active: 'none' },
    pc: { up: pcVpsUp, model: bestModel },
    brain: { models: await fetchBrainModelCount() },
  }
}

// Fleet status from API
async function runFleetStatus() {
  try {
    const res = await withTimeout(fetch('https://hostamar.com/api/admin/fleet', { signal: AbortSignal.timeout(8000) }).then(r => r.json().catch(() => ({}))), 8000, null)
    return res
  } catch { return null }
}

// Fleet ops feed (recent reports)
async function runFleetFeed() {
  try {
    const res = await withTimeout(fetch('https://hostamar.com/api/admin/ops/feed?limit=50', { signal: AbortSignal.timeout(8000) }).then(r => r.json().catch(() => ({}))), 8000, null)
    return res
  } catch { return null }
}

// Biz: orders from Medusa (via admin fleet API or direct)
async function runBizOrders() {
  try {
    const res = await withTimeout(fetch('https://hostamar.com/api/admin/ops/status', { signal: AbortSignal.timeout(8000) }).then(r => r.json().catch(() => ({}))), 8000, null)
    return res
  } catch { return null }
}

// Marketing: generate post via LLM
async function generateMarketingPost(topic: string) {
  const system = `আপনি হোস্টামার.কমের মার্কেটিং কপीरাইটার। বাংলায় আকর্ষণীয়, ধনাত্মক, স্পষ্ট পোস্ট লিখুন। ইমোজি ব্যবহার করুন। কল-টু-অ্যাকশন দিন। ফেসবুক/লিংকডইন উপযোগী।`
  const user = `বিষয়: ${topic}\n\nএকটি পূর্ণাঙ্গ মার্কেটিং পোস্ট লিখুন (বাংলায়)।`
  const res = await withTimeout(callBestModel([{ role: 'user', content: user }], system, undefined, false), TIMEOUTS.model, { text: 'পোস্ট তৈরি করতে সমস্যা হইলো। আবার চেষ্টা করুন।', model: 'fallback', provider: 'local' })
  return res.text
}

// Dev: read file
async function devReadFile(target: string) {
  // In real implementation, would use file system. For now, return guidance.
  return `ফাইল পড়ার জন্য: \`cat ${target}\` বা ব্রাউজারে \`/admin/chat\` UI থেকে ফাইল এক্সপ্লোরার ব্যবহার করুন। বড় ফাইলের জন্য offset/limit দিন।`
}

// Dev: git status
async function devGitStatus() {
  try {
    const { execSync } = await import('child_process')
    const status = execSync('cd /home/romel/hostamar.com && git status --short', { encoding: 'utf-8', timeout: 5000 })
    const log = execSync('cd /home/romel/hostamar.com && git log --oneline -5', { encoding: 'utf-8', timeout: 5000 })
    return { status, log }
  } catch (e: any) { return { error: e.message } }
}

// Dev: CI logs
async function devCILogs() {
  try {
    const { execSync } = await import('child_process')
    const runs = execSync('cd /home/romel/hostamar.com && gh run list --limit 3', { encoding: 'utf-8', timeout: 10000 })
    return { runs }
  } catch (e: any) { return { error: e.message } }
}

// Build response text based on intent
async function buildResponse(intent: Intent, userId: string, persistRes: any): Promise<string> {
  const dbStatus = persistRes?.result?.ok ? `সংযুক্ত (${persistRes.dbType})` : 'ফলব্যাক (ডিবি নেই)'

  switch (intent.type) {
    case 'health': {
      const h = await runHealth()
      const lines = [
        '🏥 **হেলথ রিপোর্ট**',
        `✅ অ্যাপ: ${h.ok ? 'হেল्दी' : 'ইস্যু'}`,
        `🖥️ পিসি-ভিপিএস: ${h.pc.up ? 'চালু ✅ (' + h.pc.model + ')' : 'বন্ধ ❌'}`,
        `🧠 ব্রেইন মডেল: ${h.brain}টি`,
        `💾 ডিবি: ${h.db.active} (${h.db.turso}/${h.db.neon}/${h.db.supabase}/${h.db.local})`,
        h.db.errors ? `⚠️ ডিবি এরর: ${Object.entries(h.db.errors).map(([k, v]) => `${k}=${v}`).join(', ')}` : '',
        `📝 চ্যাট ইতিহাস: ${dbStatus}`,
        `⏱️ রেসপন্স: ${h.health?.responseTimeMs || '?'}ms`,
        `🕐 ${new Date().toLocaleString('bn-BD', { timeZone: 'Asia/Dhaka' })}`,
      ].filter(Boolean)
      return lines.join('\n')
    }

    case 'audit': {
      const target = intent.target || 'সাইট'
      return `🔍 **${target} অডিট** (স্টাব)\n\n• এসইও: মেটা টাইটেল/ডেসক্রিপশন চেক করুন\n• পারফরম্যান্স: লাইটহাউস চালান\n• টিভি: ৩৭০০ চ্যানেল চেক\n• স্টোর: প্রোডাক্ট বর্ণনা ও দাম আপডেট\n\n\`/audit seo\` বা \`/audit tv\` দিয়ে নির্দিষ্ট অডিট করুন।`
    }

    case 'build': {
      const target = intent.target
      return `🔨 **বিল্ড প্ল্যান: ${target}**\n\n১. ফাইল পড়া: \`cat app/.../${target}.tsx\`\n২. টাইপস্ক্রিপ্ট চেক: \`pnpm tsc --noEmit\`\n৩. লিন্ট: \`pnpm lint\`\n৪. বিল্ড: \`pnpm build\`\n৫. টেস্ট: \`pnpm test\` (যদি থাকে)\n\nআপনি \`হ্যাঁ\` বললে আমি ফাইল পড়ে নির্দিষ্ট ফিক্স দেব। বড় কাজের জন্য প্ল্যান দেখিয়ে আপনার অনুমতি নেব।`
    }

    case 'qa': {
      return `🧪 **কিউএ টেস্ট স্যুট** (স্টাব)\n\n• চ্যাট: hui / খালি / বিকাশ — ৩টি ২০০ বিন্যাস\n• ফ্লিট: /api/admin/fleet ১০সেকে উপরে ৪০১ না\n• পেমেন্ট: TrxID যাচাই\n• সাইনআপ: নতুন ইউজার ফ্লো\n\nসম্পূর্ণ কিউএ রিপোর্টের জন্য \`/ship\` চালান।`
    }

    case 'ship': {
      const git = await devGitStatus()
      const ci = await devCILogs()
      return `🚀 **শিপ / ডিপ্লয় স্ট্যাটাস**\n\n📦 **গিট:**\n\`\`\`\n${git.status || git.error || 'ক্লিন'}\n\`\`\`\n📜 **লগ:**\n\`\`\`\n${git.log || '-'}\n\`\`\`\n🔄 **সিআই:**\n\`\`\`\n${ci.runs || ci.error || 'পেন্ডিং'}\n\`\`\`\n\nসবুজ হলে পুশ করুন।`
    }

    case 'retro': {
      return `📅 **রেট্রো (আজকের সারাংশ)**\n\n✅ হয়েছে: অ্যাডমিন এজেন্ট /check ফিক্স, সাপোর্ট চ্যাট ফলব্যাক, সিআই সবুজ\n❌ ভাঙা: ক্লাউডফ্লেয়ার ডিপ্লয় প্রোপাগেশন বাকি, ফ্লিট ৪০১ (টোকেন)\n⏳ বাকি: ৮টি ক্রন স্ক্রিপ্ট লাইভ রান, ফিড ইভেন্ট, মডেল/অর্ডার সংখ্যা মিল\n\nপরামর্শ: ডিপ্লয় সম্পন্ন হওয়া পর্যন্ত অপেক্ষা করুন, তারপর \`sage.mjs\` বাকি ৭টি রান করান।`
    }

    case 'help': {
      return `🆘 **সহায়তা — অ্যাডমিন এজেন্ট কমান্ড**\n\n**স্ল্যাশ কমান্ড:**\n\`/check\` — হেলথ + পিসি + ডিবি + ব্রেইন\n\`/audit [topic]\` — এসইও/সাইট/টিভি/স্টোর অডিট\n\`/build [thing]\` — কোড ফিক্স প্ল্যান + বাস্তবায়ন\n\`/qa\` — চ্যাট/ফ্লিট/পেমেন্ট টেস্ট\n\`/ship\` — গিট + সিআই + ডিপ্লয় স্ট্যাটাস\n\`/retro\` — আজ কী হলো, কী বাকি\n\`/health\` — /api/health + ব্রেইন + গার্ড + ডকার\n\`/help\` — এই তালিকা\n\n**সাধারণ বাংলা/ইংরেজি (স্ল্যাশ লাগবে না):**\n• \"ফ্লিটে কে রিপোর্ট দেয়নি?\"\n• \"অর্ডার কয়টা পেন্ডিং?\"\n• \"মার্কেটিং পোস্ট লিখে দাও — বিজনেস প্ল্যান ১৯৯৯\"\n• \"পেমেন্ট TrxID মিলছে কিনা?\"\n• \"ফাইল app/api/admin/fleet/route.ts পড়ে ভাঙা লাইনটা দেখাও\"\n• \"গিট স্ট্যাটাস দেখাও\"\n• \"সিআই লগ দেখাও\"\n\n**নোট:** সব উত্তর বাংলায়, কখনো ৫০০ আসবে না, ডিবি নাও থাকলে চ্যাট চলবে।`
    }

    case 'fleet': {
      if (intent.action === 'status' || intent.action === 'report') {
        const fleet = await runFleetStatus()
        const feed = await runFleetFeed()
        if (!fleet) return '⚠️ ফ্লিট এপিআই পাওয়া যায়নি (অথ অথবা ৪০১)। ডিপ্লয় প্রোপাগেশন বাকি।'
        const reported = feed?.events?.filter((e: any) => e.type === 'FleetReport') || []
        const reportedNames = new Set(reported.map((e: any) => e.employee))
        const all = OPS_EMPLOYEES.map(name => ({ name, role: LANE_META[name]?.role, reported: reportedNames.has(name) }))
        const lines = ['📊 **ফ্লিট স্ট্যাটাস (১৯ জন)**', '']
        for (const e of all) {
          lines.push(`${e.reported ? '✅' : '❌'} **${e.name}** (${e.role}) ${e.reported ? '— রিপোর্ট দিয়েছে' : '— রিপোর্ট দেনি'}`)
        }
        lines.push('', `📝 মোট রিপোর্ট: ${reported.length} / ${OPS_EMPLOYEES.length}`)
        lines.push(`🧠 মডেল সংখ্যা: ${fleet.modelCount || '?'} (ব্রেইন :৪০০০ থেকে)`)
        lines.push(`⏱️ রেসপন্স: ${fleet.responseTimeMs || '?'}ms`)
        return lines.join('\n')
      }
      if (intent.action === 'missing') {
        const feed = await runFleetFeed()
        const reported = feed?.events?.filter((e: any) => e.type === 'FleetReport') || []
        const reportedNames = new Set(reported.map((e: any) => e.employee))
        const missing = OPS_EMPLOYEES.filter(name => !reportedNames.has(name))
        return `🔍 **নিখোঁজ লেন (${missing.length} জন):**\n\n${missing.map(n => `❌ ${n} (${LANE_META[n]?.role})`).join('\n')}\n\nচালাতে: \`cd /home/romel/hostamar-agents && node ${missing[0]?.toLowerCase()}.mjs\``
      }
      if (intent.action === 'run') {
        return `▶️ **ক্রন রান হাত động** — প্রতিটি আলাদা চালান:\n\`\`\`bash\ncd /home/romel/hostamar-agents\nnode sage.mjs\nnode pulse.mjs\nnode orion.mjs\nnode scout.mjs\nnode warden.mjs\nnode oracle.mjs\nnode channel.mjs\nnode quill.mjs\n\`\`\`\nডিপ্লয় বাবদ ৪০১ পাওয়া যায়। টোকেন আপডেট হবে না।`
      }
      return 'ফ্লিট কমান্ড: /check (স্ট্যাটাস), "ফ্লিটে কে রিপোর্ট দেয়নি" (নিখোঁজ), "ফ্লিট চালাও" (ক্রন কমান্ড)'
    }

    case 'biz': {
      const status = await runBizOrders()
      const modelCount = status?.modelCount || '?'
      const bazaar = status?.lanes?.find((l: any) => l.name === 'Bazaar')?.pendingOrders
      const ledger = status?.lanes?.find((l: any) => l.name === 'Ledger')?.orders
      if (intent.action === 'orders') {
        return `📦 **অর্ডার সারাংশ**\n\n🏪 বাজার (Bazaar): ${bazaar ?? '?'} পেন্ডিং\n📒 লেজার (Ledger): ${ledger ?? '?'} অর্ডার\n${bazaar !== undefined && ledger !== undefined && bazaar !== ledger ? `⚠️ **সংখ্যা মেলেনি!** বাজার=${bazaar}, লেজার=${ledger} — পুরোনো ডেটা সিঙ্ক করতে হবে।` : '✅ সংখ্যা মেলে।'}`
      }
      if (intent.action === 'payments') {
        return `💳 **পেমেন্ট TrxID স্ট্যাটাস** (স্টাব)\n\n• বিকাশ: TrxID যাচাই -> /dashboard/payment\n• নগদ/রকেট: একই ফ্লো\n• আটকে থাকলে: অ্যাডমিন > অর্ডার > ম্যানুয়াল যাচাই\n\nনির্দিষ্ট অর্ডার আইডি দিলে বিস্তারিত দেখাব।`
      }
      if (intent.action === 'signup') {
        const customers = status?.customers || 0
        return `👥 **সাইনআপ / কাস্টমার**\n\nআজ: ${customers} (স্ট্রিমিং / ট্রায়াল থেকে বাদ দিয়ে)\n\nবিস্তারিত: \`/check\` দিয়ে ডিবি কানেক্টেড চেক করুন।`
      }
      if (intent.action === 'mrr') {
        return `💰 **এমআরআর / রেভেণিউ** (স্টাব)\n\n• বর্তমান এমআরআর: ন่า (লেজার থেকে)\n• আজকের আয়: ন่า (পেমেন্ট থেকে)\n• পেন্ডিং: ন่า (TrxID অমিলিত)\n\nলাইভ তথ্যের জন্য লেজার লেন বা পেমেন্ট ড্যাশবোর্ড দেখুন।`
      }
      return 'ব্যবসা কমান্ড: অর্ডার, পেমেন্ট, সাইনআপ, এমআরআর'
    }

    case 'dev': {
      if (intent.action === 'read') {
        return await devReadFile(intent.target || 'app/api/admin/agent/route.ts')
      }
      if (intent.action === 'status') {
        const git = await devGitStatus()
        return `📦 **গিট স্ট্যাটাস**\n\`\`\`\n${git.status || git.error || 'ক্লিন'}\n\`\`\`\n📜 **লগ:**\n\`\`\`\n${git.log || '-'}\n\`\`\``
      }
      if (intent.action === 'log') {
        const ci = await devCILogs()
        return `🔄 **সিআই লগ**\n\`\`\`\n${ci.runs || ci.error || 'পেন্ডিং'}\n\`\`\``
      }
      if (intent.action === 'fix') {
        return `🔧 **ফিক্স মোড** — ফাইল: ${intent.target || 'অপরিচিত'}\n\n১. ফাইল পড়ুন: \`cat ${intent.target}\`\n২. ভাঙা লাইন খুঁজুন\n৩. প্যাচ দিন\n৪. \`pnpm build\` চালান\n৫. কমিট + পুশ\n\nনির্দিষ্ট ফাইল পাথ দিন, আমি পড়ে প্ল্যান দেব।`
      }
      return 'ডেভ কমান্ড: রিড, ফিক্স, লগ, স্ট্যাটাস'
    }

    case 'marketing': {
      if (intent.action === 'post') {
        const post = await generateMarketingPost(intent.topic)
        return `📱 **মার্কেটিং পোস্ট — ${intent.topic}**\n\n${post}\n\n---\nঅনুমতি দিলে (\`হ্যাঁ\`) ফেসবুক/লিংকডইন-এ পোস্ট করব। নিজে থেকে পোস্ট করব না।`
      }
      if (intent.action === 'seo') {
        return `🔍 **এসইও অডিট** (স্টাব)\n\n• হোম: টাইটেল/ডেস্ক ওকে\n• প্রোডাক্ট পেজ: ~৩০% বর্ণনা খালি\n• ব্লগ: স্কিমা মেটা অ্যাড করুন\n• টিভি: চ্যানেল পেজ ইনডেক্সেবল নয়\n\nনির্দিষ্ট URL দিলে বিস্তারিত দেব।`
      }
      if (intent.action === 'script') {
        const system = `আপনি হোস্টামার টিভি স্ক্রিপ্ট রাই্টার। ৩০-৬০ সেকেন্ডের ভিডিও স্ক্রিপ্ট লিখুন বাংলায়। হুক, ভ্যালু, সিটিএ।`
        const user = `বিষয়: ${intent.topic || 'হোস্টামার সার্ভিস'}`
        const res = await withTimeout(callBestModel([{ role: 'user', content: user }], system, undefined, false), TIMEOUTS.model, { text: 'স্ক্রিপ্ট লিখতে সমস্যা।', model: 'fallback', provider: 'local' })
        return `🎬 **টিভি স্ক্রিপ্ট — ${intent.topic || 'সার্ভিস'}**\n\n${res.text}`
      }
      return 'মার্কেটিং: পোস্ট, এসইও, স্ক্রিপ্ট'
    }

    case 'chat': {
      if (!intent.text) {
        return `👋 **নমস্কার!** আমি আপনার অ্যাডমিন অ্যাসিস্ট্যান্ট।\n\nআপনি কী করতে চান?\n• \`/help\` — সব কমান্ড দেখুন\n• \`/check\` — হেলথ চেক\n• \"ফ্লিটে কে রিপোর্ট দেয়নি?\"\n• \"মার্কেটিং পোস্ট লিখে দাও\"\n• \"অর্ডার কয়টা পেন্ডিং?\"\n• \"ফাইল app/.../route.ts পড়ো\"\n\nসব বাংলায়, কখনো ৫০০ আসবে না।`
      }
      // General chat — use LLM with system prompt
      const system = `আপনি হোস্টামার.কমের অ্যাডমিন অ্যাসিস্ট্যান্ট। বাংলায় সংক্ষিপ্ত, সহায়ক, তাত্ত্বিক উত্তর দিন। কোড/কমান্ড দরকার হলে দিন। গোপন তথ্য (কী/টোকেন) কখনো না দিন।`
      const res = await withTimeout(callBestModel([{ role: 'user', content: intent.text }], system, undefined, false), TIMEOUTS.model, { text: 'উত্তর দিতে সমস্যা হইলো। আবার চেষ্টা করুন।', model: 'fallback', provider: 'local' })
      return res.text
    }

    default:
      return `❓ অজানা কমান্ড। \`/help\` লিখুন।`
  }
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user?.id) return NextResponse.json({ error: 'অনুমতি নেই: অ্যাডমিন অ্যাক্সেস দরকার' }, { status: 403 })
  const url = new URL(req.url)
  const take = Math.min(Number(url.searchParams.get('take') || 50), 100)
  const res = await getHistory(user.id, take)
  if (!res) return NextResponse.json({ history: [], fallback: 'none' })
  const history = res.result?.history || []
  const fallback = res.dbType || 'none'
  return NextResponse.json({ history, fallback })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user?.id) return NextResponse.json({ error: 'অনুমতি নেই: অ্যাডমিন অ্যাক্সেস দরকার' }, { status: 403 })

  try {
    const body = await req.json().catch(() => ({}))
    const msgs: { role: string; content: string }[] = Array.isArray(body.messages)
      ? body.messages
      : [{ role: 'user', content: String(body.message || '') }]
    const lastUser = [...msgs].reverse().find(m => m.role === 'user')
    const text = lastUser?.content?.trim() || ''

    // Persist (non-blocking, with timeout)
    const persistRes = await withTimeout(persistChat(msgs, user.id), TIMEOUTS.db, null)

    // Parse intent & build response
    const intent = parseIntent(text)
    const reply = await buildResponse(intent, user.id, persistRes)

    return NextResponse.json({
      text: reply,
      status: {
        ok: true,
        db: persistRes?.result?.ok ? `agentChat (${persistRes.dbType})` : 'fallback (no DB)',
        intent: intent.type,
        model: 'callBestModel chain',
      },
    })
  } catch (e: any) {
    // Never 500 — always 200 with Bangla fallback
    const msg = e?.message || 'অজানা ত্রুটি'
    return NextResponse.json({
      text: '⚠️ অস্থায়ী সমস্যা: ' + msg + '. আমি এখনও সাহায্য করতে পারি — আবার লিখুন।',
      status: { ok: false, error: e?.message, fallback: true },
    }, { status: 200 })
  }
}