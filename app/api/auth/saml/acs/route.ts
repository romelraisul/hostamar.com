// POST /api/auth/saml/acs?tenant=acme-corp
// IdP POSTs the SAMLResponse here. Jackson validates the XML signature,
// audience, time window and replay, then returns a redirect (with an OAuth
// code) to our callback endpoint. We NEVER parse SAML ourselves.
// SECURITY: server-to-server POST from the IdP — no session cookie possible,
// so this path is exempt in middleware.ts (selfGuardedPaths).
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getJackson } from '@/lib/sso/saml'
import { validateQuery, toErrorResponse } from '@/lib/api/validator'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const acsQuerySchema = z.object({ tenant: z.string().regex(/^[a-z0-9-]+$/) })

export async function POST(req: Request) {
  // tenant MUST be a safe slug (prevents NoSQL/lookup injection via ?tenant=)
  let tenant: string
  try {
    ({ tenant } = await validateQuery(req, acsQuerySchema))
  } catch (e) {
    return toErrorResponse(e)
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
  // Defense-in-depth: Jackson validates the SAML XML, but reject obviously
  // non-base64 / oversized payloads before they reach it (<200kB).
  if (SAMLResponse.length > 200_000 || !/^[A-Za-z0-9+/=\r\n-]+$/.test(SAMLResponse)) {
    return NextResponse.json({ error: 'invalid SAMLResponse encoding' }, { status: 400 })
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
      const origin = new URL(req.url).origin
      return NextResponse.redirect(new URL(`/login?sso_error=${encodeURIComponent(error || 'saml_invalid')}`, origin))
    }
    // Mark connection as tested on a successful validation round-trip.
    await prisma.samlConnection.update({ where: { id: conn.id }, data: { isTested: true } }).catch(() => undefined)
    return NextResponse.redirect(redirect_url)
  } catch (e: any) {
    const origin = new URL(req.url).origin
    return NextResponse.redirect(new URL(`/login?sso_error=${encodeURIComponent(e?.message || 'saml_error')}`, origin))
  }
}
