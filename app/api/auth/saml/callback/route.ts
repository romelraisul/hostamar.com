// GET /api/auth/saml/callback?code=...&state=...&tenant=acme-corp
// Jackson's OAuth code-exchange: turn the SAML-issued code into a Profile,
// then JIT-provision the Customer, set the session cookie, redirect to app.
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getJackson, SAML_PRODUCT } from '@/lib/sso/saml'
import { jitProvision, mapProfile } from '@/lib/sso/policy'
import { setSsoSessionCookie } from '@/lib/sso/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state') || '/dashboard'
  const tenant = url.searchParams.get('tenant')
  if (!code || !tenant) {
    return NextResponse.redirect(new URL('/login?sso_error=missing_code', url.origin))
  }

  const { oauthController, apiController } = await getJackson()

  // Fetch the Jackson connection to obtain clientID/clientSecret for the exchange.
  const [conn] = (await apiController.getConnections({ tenant, product: SAML_PRODUCT })) as any[]
  if (!conn?.clientID || !conn?.clientSecret) {
    return NextResponse.redirect(new URL('/login?sso_error=no_jackson_conn', url.origin))
  }

  try {
    const tokenRes = await oauthController.token(
      {
        grant_type: 'authorization_code',
        client_id: conn.clientID,
        client_secret: conn.clientSecret,
        code,
        redirect_uri: `${url.origin}/api/auth/saml/callback`,
      } as any,
      null
    )
    const profile = await oauthController.userInfo((tokenRes as any).access_token)
    // Jackson returns flattened claims; map to our profile.
    const samlProfile = mapProfile((profile as any).raw || (profile as any), DEFAULT_MAP_FALLBACK)
    const { customer } = await jitProvision(samlProfile, tenant)
    const org = await prisma.organization.findUnique({ where: { slug: tenant } })

    const res = NextResponse.redirect(new URL(state.startsWith('/') ? state : '/dashboard', url.origin))
    await setSsoSessionCookie(res, customer, org?.ssoEnforced ? tenant : undefined)
    return res
  } catch (e: any) {
    return NextResponse.redirect(new URL(`/login?sso_error=${encodeURIComponent(e?.message || 'sso_exchange_failed')}`, url.origin))
  }
}

// UserInfo gives us a `raw` claim bag; mapProfile reads the default claims.
const DEFAULT_MAP_FALLBACK = {
  email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
  firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
  lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
}
