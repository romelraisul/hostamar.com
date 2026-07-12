// POST /api/auth/saml/acs?tenant=acme-corp
// IdP POSTs the SAMLResponse here. Jackson validates the XML signature,
// audience, time window and replay, then returns a redirect (with an OAuth
// code) to our callback endpoint. We NEVER parse SAML ourselves.
// SECURITY: server-to-server POST from the IdP — no session cookie possible,
// so this path is exempt in middleware.ts (selfGuardedPaths).
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getJackson } from '@/lib/sso/saml'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const url = new URL(req.url)
  const tenant = url.searchParams.get('tenant')
  if (!tenant) {
    return NextResponse.json({ error: 'tenant required' }, { status: 400 })
  }
  const conn = await prisma.samlConnection.findFirst({
    where: { organization: { slug: tenant }, isActive: true },
  })
  if (!conn) {
    return NextResponse.json({ error: 'No active SAML connection' }, { status: 404 })
  }

  const form = await req.formData()
  const SAMLResponse = form.get('SAMLResponse')?.toString()
  const RelayState = (form.get('RelayState')?.toString() as string) || `/dashboard?org=${encodeURIComponent(tenant)}`

  if (!SAMLResponse) {
    return NextResponse.json({ error: 'missing SAMLResponse' }, { status: 400 })
  }

  const { oauthController } = await getJackson()
  try {
    const { redirect_url, error } = await oauthController.samlResponse({
      SAMLResponse,
      RelayState,
      tenant,
      product: 'hostamar',
    } as any)
    if (error || !redirect_url) {
      // Signature / audience / replay validation failed inside Jackson.
      return NextResponse.redirect(new URL(`/login?sso_error=${encodeURIComponent(error || 'saml_invalid')}`, url.origin))
    }
    // Mark connection as tested on a successful validation round-trip.
    await prisma.samlConnection.update({ where: { id: conn.id }, data: { isTested: true } }).catch(() => undefined)
    return NextResponse.redirect(redirect_url)
  } catch (e: any) {
    return NextResponse.redirect(new URL(`/login?sso_error=${encodeURIComponent(e?.message || 'saml_error')}`, url.origin))
  }
}
