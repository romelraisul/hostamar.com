// GET /api/auth/oidc/callback?code=...&state=...&tenant=acme-corp
// Jackson's OAuth code-exchange for OIDC: code -> userInfo -> JIT -> mint the
// SAME auth_token the SAML flow mints (lib/sso/session.ts), so middleware
// accepts it identically (no bounce to /login — same fix as SAML PR c01a42d).
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getJackson, SAML_PRODUCT } from '@/lib/sso/saml'
import { jitProvisionOidc, mapProfile } from '@/lib/sso/policy'
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
        redirect_uri: `${url.origin}/api/auth/oidc/callback`,
      } as any,
      null
    )
    const profile = await oauthController.userInfo((tokenRes as any).access_token)
    const oidcProfile = mapProfile((profile as any).raw || (profile as any), {
      email: 'email',
      firstName: 'given_name',
      lastName: 'family_name',
    })
    const { customer } = await jitProvisionOidc(oidcProfile, tenant)
    const org = await prisma.organization.findUnique({ where: { slug: tenant } })

    const res = NextResponse.redirect(new URL(state.startsWith('/') ? state : '/dashboard', url.origin))
    await setSsoSessionCookie(res, customer, org?.oidcEnforced ? tenant : undefined)
    return res
  } catch (e: any) {
    return NextResponse.redirect(
      new URL(`/login?sso_error=${encodeURIComponent(e?.message || 'oidc_exchange_failed')}`, url.origin)
    )
  }
}
