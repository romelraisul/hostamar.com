// Server-side fetch of IdP metadata XML (avoids browser CORS).
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value
  // Reuse the same admin guard as the config route.
  const { verifyToken } = await import('@/lib/auth')
  const payload = token ? verifyToken(token) : null
  if (!payload || (payload.role !== 'admin' && payload.role !== 'superadmin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { url } = await req.json()
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url required' }, { status: 400 })
  }
  try {
    const res = await fetch(url, { redirect: 'follow', headers: { Accept: 'application/xml, text/xml, */*' } })
    const xml = await res.text()
    if (!xml.includes('<EntityDescriptor') && !xml.includes('EntityDescriptor')) {
      return NextResponse.json({ error: 'URL did not return SAML metadata' }, { status: 422 })
    }
    return NextResponse.json({ xml })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'fetch failed' }, { status: 502 })
  }
}
