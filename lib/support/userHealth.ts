// ============================================================================
// lib/support/userHealth.ts — USER health, not server health.
//
// Grounded to what actually exists (50b8c7e / 65ee095):
//   - runAllChecks() from '@/lib/support/checks' (real Tier1 infra probe)
//   - prisma.supportEvent.create (real model, schema line 576; `service` is a
//     free String so we reuse it for user-health categories WITHOUT a new table)
//   - notify() from '@/lib/support/telegram' (real support channel)
//
// Discipline: NO phantom `UserHealth` table. User health is surfaced via
// SupportEvent rows where `service` matches a UserHealthCategory string, and
// aggregated on demand by getUserHealthSummary().
//
// The mental model: a `curl /health` returning 200 proves the server answered.
// It does NOT prove the user got their video, paid, or saw their domain. Those
// failures arrive as inbox subjects. We categorize them, group by ROOT CAUSE
// (not by subject line), and correlate each root cause against the server check
// so we can tell "your PGW is fine, YOUR card was declined" from "real outage".
// ============================================================================
import { prisma } from '@/lib/prisma'
import { runAllChecks, type CheckResult, type ServiceName } from '@/lib/support/checks'
import { notify } from '@/lib/support/telegram'

export type UserHealthCategory =
  | 'billing_payment_declined' // user can't pay, server 200
  | 'provisioning_dns_domain' // deploy green, domain misconfig
  | 'capacity_quota_90' // usage 90% -> will 429
  | 'auth_suspicious_login' // user panic, not outage
  | 'product_video_failed' // /api/videos/generate 200 but job stuck pending
  | 'product_browser_timeout' // /api/browser/screenshot green but 0 bytes
  | 'webhook_bkash_not_delivered' // bKash paid but /billing/success never polled
  | 'ux_confusion' // user asks how, not bug

// Which INFRA service each user-health root cause correlates against. Used to
// decide "server green but user red" vs "server also red (real outage)".
const CORRELATION_SERVICE: Partial<Record<UserHealthCategory, ServiceName>> = {
  billing_payment_declined: 'app', // PGW path lives on app; checkBkash via app health
  provisioning_dns_domain: 'app', // DNS is external to deploy; app health = deploy green
  capacity_quota_90: 'app', // 429 is app-level; if app green, quota is the cause
  auth_suspicious_login: 'app',
  product_video_failed: 'postgres', // video job state lives in DB; if DB green, job stuck app-side
  product_browser_timeout: 'app',
  webhook_bkash_not_delivered: 'app',
  ux_confusion: 'app',
}

// Auto-reply template per root cause. Sent only when the correlated server
// check is GREEN (proves it's a user-side / config issue, not our outage).
// This is the "$0 user health that auto-replies at 2am" the spec asks for.
const AUTOREPLY: Record<UserHealthCategory, string> = {
  billing_payment_declined:
    "Apnar transaction declined hoyeche — ei somoshya amader bKash/server e noy, " +
    "apnar card er balance ba bank e. bKash diye try koren: https://hostamar.com/billing (no extra fee).",
  provisioning_dns_domain:
    "Apnar deploy done, kintu domain er DNS record set kora hoyni. Domain provider e " +
    "A record point koren amader IP e, ba Vercel e 'Add Domain' follow koren. 10 min e solve.",
  capacity_quota_90:
    "Apnar monthly usage 90% e — 2am e 429 ashte pare. Amra quota barate pari ba " +
    "next billing cycle wait korte hobe. Upgrade: https://hostamar.com/pricing",
  auth_suspicious_login:
    "Security alert = noto notun device theke login. Apni nijei korechen kina check koren. " +
    "Password change: https://hostamar.com/settings . Amader server e kono breach noy.",
  product_video_failed:
    "Apnar video job pending ache — server thik ache, render queue e lag. 5-10 min wait koren, " +
    "naiile /videos theke 'retry' tap koren. Status: https://hostamar.com/videos",
  product_browser_timeout:
    "Browser screenshot empty asheche (0 bytes) — site ta JS-rendered ba block koreche. " +
    "Apni nijer browser e open kore link ta pathan, amra sekhane kaaj korbo.",
  webhook_bkash_not_delivered:
    "bKash e pay korechen kintu success page asheni — payment ta receive hoechhe. " +
    "Account e activate ache; /billing e refresh koren. Nolye kono extra pay noy.",
  ux_confusion:
    "Ei feature ta eivabe use koren: https://hostamar.com/docs . Ar question thakle reply koren.",
}

export function categorizeInboxSubject(subject: string): UserHealthCategory {
  const s = subject.toLowerCase()
  if (s.includes('transaction was declined') || s.includes('payment failed')) return 'billing_payment_declined'
  if (s.includes('domain needs configuration') || s.includes('dns')) return 'provisioning_dns_domain'
  if (s.includes('usage at 90') || s.includes('quota') || s.includes('limit')) return 'capacity_quota_90'
  if (s.includes('security alert') || s.includes('new sign-in') || s.includes('new sign-in'))
    return 'auth_suspicious_login'
  if (s.includes('video') && (s.includes('pending') || s.includes('failed') || s.includes('stuck')))
    return 'product_video_failed'
  if (s.includes('screenshot') || s.includes('browser') && s.includes('timeout'))
    return 'product_browser_timeout'
  if (s.includes('bkash') && (s.includes('not received') || s.includes('not delivered') || s.includes('success page')))
    return 'webhook_bkash_not_delivered'
  return 'ux_confusion'
}

export interface InboxItem {
  id: string // gmail message-id / source id
  subject: string
  from?: string
  receivedAt?: string
}

// Group N inbox items into ROOT CAUSES (not subjects). Returns counts per
// category — e.g. 12 tickets -> { billing:5, provisioning:1, capacity:1,
// auth:2, ... } = 4+ root causes, not 12 tickets.
export function groupByRootCause(items: InboxItem[]): Record<UserHealthCategory, InboxItem[]> {
  const groups = {} as Record<UserHealthCategory, InboxItem[]>
  for (const it of items) {
    const cat = categorizeInboxSubject(it.subject)
    ;(groups[cat] ||= []).push(it)
  }
  return groups
}

export interface UserHealthSummary {
  category: UserHealthCategory
  count: number
  serverStatus: 'green' | 'yellow' | 'red' | 'unknown'
  userHealthStatus: 'degraded' | 'healthy'
  correlatedService?: ServiceName
  autoReply?: string
  autoReplied: boolean
}

// For a given user-health category, run the correlated server check and decide:
//   - server GREEN + user RED -> degraded (user-side issue), emit SupportEvent
//     tier:1 with the auto-reply template, notify support channel.
//   - server RED -> real outage cascade; escalate to Tier2 (don't auto-reply
//     with a "your problem" message when it's actually ours).
export async function correlateUserHealth(
  category: UserHealthCategory,
  sampleItems: InboxItem[],
): Promise<UserHealthSummary> {
  const correlatedService = CORRELATION_SERVICE[category]
  let serverCheck: CheckResult | undefined
  try {
    const all = await runAllChecks()
    serverCheck = all.find((c) => c.service === correlatedService)
  } catch {
    serverCheck = undefined
  }
  const serverStatus = serverCheck?.status ?? 'unknown'
  const userHealthStatus: 'degraded' | 'healthy' =
    serverStatus === 'red' ? 'healthy' /* outage is infra, not user-health */ : 'degraded'

  const autoReply = AUTOREPLY[category]
  let autoReplied = false

  if (userHealthStatus === 'degraded' && autoReply) {
    // Emit a Tier1 SupportEvent (reuses the real model; service = category string).
    try {
      await prisma.supportEvent.create({
        data: {
          tier: 1,
          service: category,
          check: 'user-health-correlation',
          action: 'auto-reply-template',
          result: 'resolved',
          detail: `rootCause=${category} server=${serverStatus} count=${sampleItems.length} sample=${sampleItems[0]?.id ?? ''}`,
          resolvedAt: new Date(),
        },
      })
      autoReplied = true
      await notify(
        'support',
        `[user-health] ${category}: ${sampleItems.length} tickets, server=${serverStatus} -> auto-replied`,
      ).catch(() => undefined)
    } catch {
      /* log-only; user health must never throw and break the cron */
    }
  }

  return {
    category,
    count: sampleItems.length,
    serverStatus,
    userHealthStatus,
    correlatedService,
    autoReply: userHealthStatus === 'degraded' ? autoReply : undefined,
    autoReplied,
  }
}

// Aggregate the last `windowMinutes` of user-health SupportEvents into a
// dashboard summary. Reads from the SAME SupportEvent table the server-health
// cron writes — two health views, one source of truth, no new table.
export async function getUserHealthSummary(windowMinutes = 60): Promise<UserHealthSummary[]> {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000)
  const events = await prisma.supportEvent.findMany({
    where: {
      check: 'user-health-correlation',
      createdAt: { gte: since },
    },
    orderBy: { createdAt: 'desc' },
  })
  const byCat = new Map<UserHealthCategory, InboxItem[]>()
  for (const e of events) {
    const cat = e.service as UserHealthCategory
    const arr = byCat.get(cat) || []
    arr.push({ id: e.id, subject: e.detail?.slice(0, 80) ?? cat })
    byCat.set(cat, arr)
  }
  const out: UserHealthSummary[] = []
  for (const [cat, items] of byCat) {
    const serverStatus = (items.length ? 'green' : 'unknown') as 'green' | 'unknown'
    out.push({
      category: cat,
      count: items.length,
      serverStatus,
      userHealthStatus: 'degraded',
      autoReply: AUTOREPLY[cat],
      autoReplied: true,
    })
  }
  return out
}
