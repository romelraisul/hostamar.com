import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// ponytail: all checks must be serverless-verifiable (HTTP + Turso DB) —
// the old execSync version probed the WSL box from Vercel and could never pass.
async function checkHttp(url: string): Promise<number> {
  try {
    const ctl = new AbortController()
    const t = setTimeout(() => ctl.abort(), 8000)
    const res = await fetch(url, { signal: ctl.signal, cache: 'no-store', headers: { 'User-Agent': 'hostamar-status-check/1.0' } })
    clearTimeout(t)
    return res.status
  } catch { return 0 }
}

export async function GET() {
  // Check if DATABASE_URL is configured before any Prisma calls (same pattern as checkout route)
  const hasDb = !!(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0)

  const [tv, db, authTables] = await Promise.all([
    checkHttp('https://tv.hostamar.com/master.m3u8'),
    hasDb
      ? prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' LIMIT 1`
          .then(() => 'ok')
          .catch((e: unknown) => `fail: ${(e as Error).message.slice(0, 80)}`)
      : Promise.resolve('no DATABASE_URL configured'),
    hasDb
      ? prisma.$queryRawUnsafe(
          `SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name IN ('Customer','Account','Session')`
        ).then((r: unknown) => Number((r as { n: number | bigint }[])[0]?.n ?? 0))
          .catch(() => -1)
      : Promise.resolve(-2), // -2 = DB not configured
  ])

  // Facebook creds presence (env-only, no secret values)
  const facebook = process.env.FB_PAGE_ID && process.env.FB_PAGE_ACCESS_TOKEN ? 'configured' : 'MISSING'

  const components = [
    { status: tv === 200 ? '✅' : '❌', component: 'HLS2 TV Stream', value: tv === 200 ? '200 OK' : `${tv} DOWN`, detail: 'tv.hostamar.com/master.m3u8', verified: `HTTP ${tv}` },
    { status: authTables === 3 ? '✅' : authTables === -2 ? '⏸️' : '❌', component: 'Auth (SSO/Login)', value: authTables === 3 ? 'tables OK' : authTables === -2 ? 'DB not configured' : `${authTables}/3 tables`, detail: 'Customer/Account/Session (sso_callback_failed fixed)', verified: authTables === -2 ? 'no DATABASE_URL' : `Turso ${authTables}/3` },
    { status: db === 'ok' ? '✅' : db === 'no DATABASE_URL configured' ? '⏸️' : '❌', component: 'Turso DB', value: db === 'ok' ? 'connected' : db, detail: 'libsql://hostamar-db...turso.io', verified: db },
    { status: facebook === 'configured' ? '✅' : '❌', component: 'Facebook', value: facebook, detail: 'FB_PAGE_ID + FB_PAGE_ACCESS_TOKEN', verified: facebook === 'configured' ? 'env set' : 'needs Edge UIA' },
  ]

  const ok = components.filter(c => c.status === '✅').length
  const completion = `${ok}/${components.length} ${Math.round(ok / components.length * 100)}%`

  return NextResponse.json({ completion, components, deployedAt: new Date().toISOString() })
}
