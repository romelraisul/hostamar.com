/**
 * Disaster Recovery — ZERO COST plan (documented + executable checks).
 * Real surfaces:
 *   - Vercel: deployments are immutable; previous deploy = instant rollback target
 *   - Neon Postgres: PITR (free tier) via `neon branches` restore
 *   - B2 s3.us-east-005 bucket hostamar-prod: object versioning + lifecycle
 *   - Code: git (GitHub) — single source of truth, `git push` only deploys
 * DR orchestration: the daily-health cron records a health snapshot; if two
 * consecutive snapshots fail, this module's recommendAction() returns the
 * runbook step (auto-failover to previous deploy / restore branch).
 */

export type HealthSnapshot = { ts: string; health: boolean; db: boolean; b2: boolean; chat: boolean }

let history: HealthSnapshot[] = []

export function recordSnapshot(s: Omit<HealthSnapshot, 'ts'>) {
  history.push({ ...s, ts: new Date().toISOString() })
  if (history.length > 20) history.shift()
}

export type DrAction =
  | { action: 'none'; note: string }
  | { action: 'rollback-vercel'; note: string; cmd: 'vercel rollback <previous-deploy-id> (via dashboard — NEVER vercel --prod from repo)' }
  | { action: 'restore-neon-pitr'; note: string; cmd: 'Neon console → restore branch to pre-incident timestamp' }
  | { action: 'check-b2'; note: string; cmd: 'aws s3 ls s3://hostamar-prod --endpoint-url https://s3.us-east-005.backblazeb2.com' }

export function recommendAction(): DrAction {
  const last2 = history.slice(-2)
  if (last2.length === 0) return { action: 'none', note: 'no snapshots recorded yet' }
  const [a, b] = last2
  if (!b.health && !a.health) {
    if (!b.db) return { action: 'restore-neon-pitr', note: 'DB down 2 consecutive snapshots → PITR restore runbook', cmd: 'Neon console → restore branch to pre-incident timestamp' }
    if (!b.chat) return { action: 'rollback-vercel', note: 'App failing 2 consecutive snapshots → rollback to previous deploy', cmd: 'vercel rollback <previous-deploy-id> (via dashboard — NEVER vercel --prod from repo)' }
    return { action: 'check-b2', note: 'B2/storage path failing → verify bucket + keys', cmd: 'aws s3 ls s3://hostamar-prod --endpoint-url https://s3.us-east-005.backblazeb2.com' }
  }
  return { action: 'none', note: `healthy — last snapshot ${b.ts}` }
}

export const drRunbook = `
DR RUNBOOK (zero cost):
1. App broken → Vercel dashboard → hostamar-build → previous deployment → Promote. (Never \`vercel --prod\` from repo — quota rule.)
2. DB broken → Neon console → restore-to-timestamp (PITR, free tier) → verify /api/health database.connected=true.
3. Storage broken → check B2 keys/endpoint (s3.us-east-005, bucket hostamar-prod); storage routes degrade gracefully (401/404, app stays up).
4. AI chain broken → knowledge-base fallback already answers (bKash + pricing kb); investigate kilocode key expiry.
5. TV player broken → /api/tv/stable-channels fallback to TvIptvChannel (50 channels) automatically.
RTO target: < 10 min (rollback promote). RPO: Neon PITR window.
`
