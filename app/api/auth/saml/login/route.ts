// GET /api/auth/saml/login?tenant=acme-corp
// SP-initiated flow: build an AuthnRequest and redirect the browser to the IdP.
// The RelayState carries the post-login destination.
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getJackson, SAML_PRODUCT } from '@/lib/sso/saml'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const tenant = url.searchParams.get('tenant')
  if (!tenant) {
    return NextResponse.json({ error: 'tenant required' }, { status: 400 })
  }
  const conn = await prisma.samlConnection.findFirst({
    where: { organization: { slug: tenant }, isActive: true },
    include: { organization: true },
  })
  if (!conn) {
    return NextResponse.redirect(new URL('/login?sso_error=no_connection', url.origin))
  }

  const { oauthController } = await getJackson()
  const relayState = url.searchParams.get('redirect') || `/dashboard?org=${encodeURIComponent(tenant)}`

  const { redirect_url, error } = await oauthController.authorize({
    tenant,
    product: SAML_PRODUCT,
    redirect_uri: `${url.origin}/api/auth/saml/callback`,
    state: relayState,
    // mark SP-initiated
    // Jackson's authorize needs a `redirect_uri` it can POST the code back to.
  } as any)

  if (error || !redirect_url) {
    return NextResponse.redirect(new URL(`/login?sso_error=${encodeURIComponent(error || 'authorize_failed')}`, url.origin))
  }
  return NextResponse.redirect(redirect_url)
}
