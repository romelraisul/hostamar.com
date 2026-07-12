// GET /api/auth/oidc/authorize?tenant=acme-corp&redirect_uri=...
// SP-initiated OIDC: Jackson issues the IdP authorize URL for this tenant.
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getJackson, SAML_PRODUCT } from '@/lib/sso/saml'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const tenant = url.searchParams.get('tenant')
  if (!tenant) return NextResponse.json({ error: 'tenant required' }, { status: 400 })

  const conn = await prisma.oidcConnection.findFirst({
    where: { organization: { slug: tenant }, isActive: true },
  })
  if (!conn) {
    return NextResponse.redirect(new URL('/login?sso_error=no_oidc_connection', url.origin))
  }

  const { oauthController } = await getJackson()
  const redirect_uri = `${url.origin}/api/auth/oidc/callback`
  const relayState = url.searchParams.get('redirect') || `/dashboard?org=${encodeURIComponent(tenant)}`

  const { redirect_url, error } = await oauthController.authorize({
    tenant,
    product: SAML_PRODUCT,
    redirect_uri,
    state: relayState,
    scope: 'openid profile email',
  } as any)

  if (error || !redirect_url) {
    return NextResponse.redirect(
      new URL(`/login?sso_error=${encodeURIComponent(error || 'oidc_authorize_failed')}`, url.origin)
    )
  }
  return NextResponse.redirect(redirect_url)
}
