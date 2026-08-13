import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-auth-user'

// Health of the Hostamar IDE + model-gateway stack for the admin IDE maintain tab.
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
      // server responded (<500) => reachable. 401/403 = auth-gated (still up).
      checks[name] = {
        ok: res.status < 500,
        status: res.status,
        reachable: res.status < 500,
        ms: Date.now() - t0,
      }
    } catch (e: any) {
      checks[name] = { ok: false, reachable: false, error: e?.name === 'AbortError' ? 'timeout' : e?.message, ms: Date.now() - t0 }
    }
  }

  await Promise.all([
    probe('ai_gateway_models', 'https://hostamar.com/v1/models'),
    probe('ide_page', 'https://hostamar.com/ide'),
    probe('ide_server_api', 'https://hostamar.com/api/ide/server'),
  ])

  const overall = Object.values(checks).every((c: any) => c.ok) ? 'healthy' : 'degraded'
  return NextResponse.json({ overall, checks, checkedAt: new Date().toISOString() })
}
