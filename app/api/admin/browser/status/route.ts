import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-auth-user'

// Aggregates the health of Hostamar's cloud-browser stack (Camofox/Firefox +
// cloudflared tunnel + Steel fallback) for the admin Browser maintain tab.
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const checks: any = {}

  const probe = async (name: string, url: string) => {
    const t0 = Date.now()
    try {
      const ctrl = new AbortController()
      const to = setTimeout(() => ctrl.abort(), 8000)
      const res = await fetch(url, { method: 'GET', signal: ctrl.signal, cache: 'no-store' })
      clearTimeout(to)
      checks[name] = {
        ok: res.ok,
        status: res.status,
        ms: Date.now() - t0,
      }
    } catch (e: any) {
      checks[name] = { ok: false, error: e?.name === 'AbortError' ? 'timeout' : e?.message, ms: Date.now() - t0 }
    }
  }

  await Promise.all([
    probe('browser_hostamar', 'https://browser.hostamar.com/'),
    probe('camofox', 'https://browser.hostamar.com/v1/health'),
    probe('ai_gateway', 'https://hostamar.com/v1/models'),
  ])

  const overall = Object.values(checks).every((c: any) => c.ok) ? 'healthy' : 'degraded'
  return NextResponse.json({ overall, checks, checkedAt: new Date().toISOString() })
}
