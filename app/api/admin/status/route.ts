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
  const [tv, auth, db] = await Promise.all([
    checkHttp('https://tv.hostamar.com/master.m3u8'),
    checkHttp('https://hostamar.com/api/auth/providers'),
    prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' LIMIT 1`
      .then(() => 'ok')
      .catch((e: unknown) => `fail: ${(e as Error).message.slice(0, 80)}`),
  ])

  // Facebook creds presence (env-only, no secret values)
  const facebook = process.env.FB_PAGE_ID && process.env.FB_PAGE_ACCESS_TOKEN ? 'configured' : 'MISSING'

  const components = [
    { status: tv === 200 ? '✅' : '❌', component: 'HLS2 TV Stream', value: tv === 200 ? '200 OK' : `${tv} DOWN`, detail: 'tv.hostamar.com/master.m3u8', verified: `HTTP ${tv}` },
    { status: auth === 200 ? '✅' : '❌', component: 'NextAuth', value: auth === 200 ? '200 OK' : `${auth} DOWN`, detail: '/api/auth/providers (sso_callback_failed fixed)', verified: `HTTP ${auth}` },
    { status: db === 'ok' ? '✅' : '❌', component: 'Turso DB', value: db === 'ok' ? 'connected' : db, detail: 'libsql://hostamar-db...turso.io', verified: db },
    { status: facebook === 'configured' ? '✅' : '❌', component: 'Facebook', value: facebook, detail: 'FB_PAGE_ID + FB_PAGE_ACCESS_TOKEN', verified: facebook === 'configured' ? 'env set' : 'needs Edge UIA' },
  ]

  const ok = components.filter(c => c.status === '✅').length
  const completion = `${ok}/${components.length} ${Math.round(ok / components.length * 100)}%`

  return NextResponse.json({ completion, components, deployedAt: new Date().toISOString() })
}
