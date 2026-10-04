/**
 * app/api/cron/surveillance/route.ts — V65 Layer 5 nightly analyzer.
 *
 * Finds the Anthropic-style abuse signatures in RequestLog:
 *   1. Distillation cluster — same prompt echoed by >= 5 distinct ipHashes
 *      (the "24,000 fake accounts" signature, zero-cost Turso version).
 *   2. Multi-account same device — one IP behind >= 10 distinct user_ids.
 *   3. Prompt-injection / distillation / weaponized hot-path hits (RiskUser).
 *
 * Upserts RiskUser, and when SURVEILLANCE_TELEGRAM_TOKEN +
 * SURVEILLANCE_TELEGRAM_CHAT_ID are set, sends one Telegram alert per
 * distinct alert type per run (draft-style notification; auto-block is an
 * owner decision, not autonomous).
 *
 * Nightly fire: local crontab curl with `Authorization: Bearer $CRON_SECRET`.
 * CRON_SECRET lives on the Worker as a secret + root-only
 * ~/.hermes/scripts/.cron-secret for the cron fire. (Vercel Hobby forbids
 * sub-daily crons and OpenNext worker.js has no scheduled handler, so a CF
 * [triggers] entry would fire nothing.)
 *
 * Auth: x-vercel-cron or Bearer CRON_SECRET (same pattern as
 * /api/cron/binance-price).
 */
import { NextRequest } from 'next/server'
import { getTursoEdgeClient } from '@/lib/turso-edge'
import { sendSurveillanceAlert } from '@/lib/surveillance-alert'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const CRON_SECRET = process.env.CRON_SECRET || ''

async function alert(text: string): Promise<{ sent: boolean; via: string }> {
  return sendSurveillanceAlert(text)
}

// ponytail: Workers cannot load Prisma's libssl detection (fs.readdir ->
// "[unenv] fs.readdir is not implemented" -> prisma init dies) — direct
// @libsql/client/web is fetch-only and runs on Workers AND Vercel Node
// (same pattern as lib/turso-edge.ts consumers). sqlite dialect.
export async function GET(req: NextRequest) {
  const isVercelCron = req.headers.get('x-vercel-cron') === '1'
  if (!isVercelCron && CRON_SECRET) {
    const auth = req.headers.get('authorization') || ''
    const q = req.nextUrl.searchParams.get('secret') || ''
    if (auth !== `Bearer ${CRON_SECRET}` && q !== CRON_SECRET) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  let client: ReturnType<typeof getTursoEdgeClient>
  try {
    client = getTursoEdgeClient()
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 503 })
  }

  const clusters = await client.execute(
    `SELECT "promptPreview", COUNT(DISTINCT "ipHash") AS devices
     FROM "RequestLog"
     WHERE substr("createdAt", 1, 10) >= date('now', '-1 day') AND LENGTH("promptPreview") > 40
     GROUP BY "promptPreview" HAVING COUNT(DISTINCT "ipHash") >= 5
     ORDER BY devices DESC LIMIT 10`
  )
  const deviceFarm = await client.execute(
    `SELECT "ipHash", COUNT(DISTINCT "userId") AS accounts
     FROM "RequestLog"
     WHERE substr("createdAt", 1, 10) >= date('now', '-1 day') AND "userId" IS NOT NULL
     GROUP BY "ipHash" HAVING COUNT(DISTINCT "userId") >= 10
     ORDER BY accounts DESC LIMIT 10`
  )
  const hot = await client.execute(
    `SELECT "userId", "riskScore", reason FROM "RiskUser"
     WHERE "riskScore" >= 70 ORDER BY "riskScore" DESC LIMIT 10`
  )

  const flagged: string[] = []
  for (const c of clusters.rows) {
    const reason = `distillation cluster: same prompt on ${c.devices} devices/24h`
    await client.execute({
      sql: `INSERT INTO "RiskUser" ("userId","riskScore",reason,"updatedAt","createdAt")
            VALUES (?, 80, ?, datetime('now'), datetime('now'))
            ON CONFLICT ("userId") DO UPDATE SET "riskScore"=80, reason=?, "updatedAt"=datetime('now')`,
      args: [`cluster:${String(c.promptPreview).slice(0, 50)}`, reason, reason],
    })
    flagged.push(reason)
  }
  for (const d of deviceFarm.rows) {
    const reason = `device farm: ${d.accounts} accounts behind one device/24h`
    await client.execute({
      sql: `INSERT INTO "RiskUser" ("userId","ipHash","riskScore",reason,"updatedAt","createdAt")
            VALUES (?, ?, 85, ?, datetime('now'), datetime('now'))
            ON CONFLICT ("userId") DO UPDATE SET "riskScore"=85, reason=?, "updatedAt"=datetime('now')`,
      args: [`ip:${String(d.ipHash)}`, String(d.ipHash), reason, reason],
    })
    flagged.push(reason)
  }
  if (hot.rows.length) flagged.push(`${hot.rows.length} hot risk users (score>=70)`)

  // Keep the forensic table small (14-day retention window, sqlite dialect).
  await client.execute(`DELETE FROM "RequestLog" WHERE substr("createdAt", 1, 10) < date('now', '-14 days')`)

  const delivery = await alert(flagged.length ? flagged.join('\n') : 'clean — no abuse signatures in last 24h')

  return Response.json({
    ok: true,
    scanned: true,
    clusters: clusters.rows.length,
    deviceFarms: deviceFarm.rows.length,
    hotRiskUsers: hot.rows.length,
    alerts: flagged,
    alertDelivery: delivery,
  })
}
