/**
 * lib/surveillance.ts — V65 Layer 5: abuse & distillation guard.
 *
 * Zero-cost design: sampled request logging into the EXISTING Neon Postgres
 * (tables RequestLog / RiskUser — additive DDL, FleetReport pattern). No new
 * services, no Redis, no paid tier. Never breaks the chat path: every query
 * is try/caught and failures are silent.
 *
 * Privacy: only a salted SHA-256 hash of (ip + user-agent) is stored — raw
 * IPs never touch the database. Prompt storage is a 400-char preview for
 * cross-account clustering (the Anthropic-style distillation signature:
 * same prompt echoed across many user_ids).
 */
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

const SALT = process.env.SURVEILLANCE_SALT || 'hostamar-l5-2026'
const SAMPLE_RATE = Number(process.env.SURVEILLANCE_SAMPLE || '0.25')

export function ipHashOf(clientIp: string, userAgent: string | null): string {
  return crypto
    .createHash('sha256')
    .update(`${SALT}:${clientIp}:${userAgent || ''}`)
    .digest('hex')
    .slice(0, 24)
}

const DISTILL_PAT =
  /ignore (all )?previous instructions|repeat (everything|all) (above|your instructions|your system)|print your (system )?(prompt|instructions)|translate (the )?(whole|entire|all) (conversation|document|messages)|summarize (all|every) (message|turn|previous)|act as (an? )?(uncensored|unfiltered|DAN)/i
const WEAPON_PAT =
  /((make|build|construct|synthesize)(ing)?\s+(a\s+)?)?(ied|bio ?weapon|nerve agent|pipe bomb|mass shooting)|school (attack|shooting)/i

export type IntentVerdict = 'benign' | 'suspicious' | 'malicious'

export function classifyPrompt(p: string): { intent: IntentVerdict; score: number } {
  const s = p || ''
  if (WEAPON_PAT.test(s)) return { intent: 'malicious', score: 90 }
  if (DISTILL_PAT.test(s)) return { intent: 'suspicious', score: 70 }
  return { intent: 'benign', score: 0 }
}

export async function upsertRiskUser(
  userId: string,
  ipHash: string | null,
  score: number,
  reason: string,
): Promise<void> {
  try {
    await prisma.$executeRaw`
      INSERT INTO "RiskUser" ("userId","ipHash","riskScore",reason,"updatedAt")
      VALUES (${userId}, ${ipHash}, ${score}, ${reason}, NOW())
      ON CONFLICT ("userId") DO UPDATE
      SET "riskScore" = GREATEST("RiskUser"."riskScore", ${score}),
          reason = ${reason},
          "ipHash" = COALESCE(${ipHash}, "RiskUser"."ipHash"),
          "updatedAt" = NOW()`
  } catch {
    /* surveillance must never break chat */
  }
}

export async function recordSurveillance(opts: {
  clientIp: string
  userAgent: string | null
  userId: string | null
  model: string
  prompt: string
  responseLen: number
}): Promise<void> {
  try {
    if (Math.random() > SAMPLE_RATE) return
    const ipHash = ipHashOf(opts.clientIp, opts.userAgent)
    const preview = (opts.prompt || '').slice(0, 400)
    await prisma.$executeRaw`
      INSERT INTO "RequestLog" ("userId","ipHash",model,"promptPreview","responseLen")
      VALUES (${opts.userId}, ${ipHash}, ${opts.model}, ${preview}, ${opts.responseLen})`
    const verdict = classifyPrompt(preview)
    if (verdict.score > 0) {
      await upsertRiskUser(
        opts.userId || `ip:${ipHash}`,
        ipHash,
        verdict.score,
        `${verdict.intent} (hot-path classifier)`,
      )
    }
  } catch {
    /* surveillance must never break chat */
  }
}
