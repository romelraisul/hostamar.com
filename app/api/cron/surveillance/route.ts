/**
 * app/api/cron/surveillance/route.ts — V65 Layer 5 nightly analyzer.
 *
 * Finds the Anthropic-style abuse signatures in RequestLog:
 *   1. Distillation cluster — same prompt echoed by >= 5 distinct ipHashes
 *      (the "24,000 fake accounts" signature, zero-cost Postgres version).
 *   2. Multi-account same device — one ipHash behind >= 10 distinct user_ids.
 *   3. Prompt-injection / distillation / weaponized hot-path hits (RiskUser).
 *
 * Upserts RiskUser, and when SURVEILLANCE_TELEGRAM_TOKEN +
 * SURVEILLANCE_TELEGRAM_CHAT_ID are set, sends one Telegram alert per
 * distinct alert type per run (draft-style notification; auto-block is an
 * owner decision, not autonomous).
 *
 * Vercel cron: 45 23 * * * (23:45 — after Sage's 00:05 is separate; before
 * midnight). Auth: x-vercel-cron or Bearer CRON_SECRET (same pattern as
 * /api/cron/binance-price).
 */
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendSurveillanceAlert } from '@/lib/surveillance-alert'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const CRON_SECRET = process.env.CRON_SECRET || ''

async function alert(text: string): Promise<{ sent: boolean; via: string }> {
  return sendSurveillanceAlert(text)
}

export async function GET(req: NextRequest) {
  const isVercelCron = req.headers.get('x-vercel-cron') === '1'
  if (!isVercelCron && CRON_SECRET) {
    const auth = req.headers.get('authorization') || ''
    const q = req.nextUrl.searchParams.get('secret') || ''
    if (auth !== `Bearer ${CRON_SECRET}` && q !== CRON_SECRET) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const clusters: any[] = await prisma.$queryRaw`
    SELECT "promptPreview", COUNT(DISTINCT "ipHash")::int AS devices
    FROM "RequestLog"
    WHERE "createdAt" > NOW() - INTERVAL '24 hours' AND LENGTH("promptPreview") > 40
    GROUP BY "promptPreview" HAVING COUNT(DISTINCT "ipHash") >= 5
    ORDER BY devices DESC LIMIT 10`

  const deviceFarm: any[] = await prisma.$queryRaw`
    SELECT "ipHash", COUNT(DISTINCT "userId")::int AS accounts
    FROM "RequestLog"
    WHERE "createdAt" > NOW() - INTERVAL '24 hours' AND "userId" IS NOT NULL
    GROUP BY "ipHash" HAVING COUNT(DISTINCT "userId") >= 10
    ORDER BY accounts DESC LIMIT 10`

  const hot: any[] = await prisma.$queryRaw`
    SELECT "userId", "riskScore", reason FROM "RiskUser"
    WHERE "riskScore" >= 70 ORDER BY "riskScore" DESC LIMIT 10`

  const flagged: string[] = []
  for (const c of clusters) {
    const prompt: string = c.promptPreview.slice(0, 120)
    const reason = `distillation cluster: same prompt on ${c.devices} devices/24h`
    await prisma.$executeRaw`
      INSERT INTO "RiskUser" ("userId","riskScore",reason,"updatedAt")
      VALUES (${`cluster:${c.promptPreview.slice(0, 50)}`}, ${80}, ${reason}, NOW())
      ON CONFLICT ("userId") DO UPDATE SET "riskScore"=80, reason=${reason}, "updatedAt"=NOW()`
    flagged.push(reason)
  }
  for (const d of deviceFarm) {
    const reason = `device farm: ${d.accounts} accounts behind one device/24h`
    await prisma.$executeRaw`
      INSERT INTO "RiskUser" ("userId","ipHash","riskScore",reason,"updatedAt")
      VALUES (${`ip:${d.ipHash}`}, ${d.ipHash}, ${85}, ${reason}, NOW())
      ON CONFLICT ("userId") DO UPDATE SET "riskScore"=85, reason=${reason}, "updatedAt"=NOW()`
    flagged.push(reason)
  }
  if (hot.length) flagged.push(`${hot.length} hot risk users (score>=70)`)

  // Keep the forensic table small (Vercel free Postgres friendly).
  await prisma.$executeRaw`DELETE FROM "RequestLog" WHERE "createdAt" < NOW() - INTERVAL '14 days'`
  const delivery = await alert(flagged.length ? flagged.join('\n') : 'clean — no abuse signatures in last 24h')

  return Response.json({
    ok: true,
    scanned: true,
    clusters: clusters.length,
    deviceFarms: deviceFarm.length,
    hotRiskUsers: hot.length,
    alerts: flagged,
    alertDelivery: delivery,
  })
}
