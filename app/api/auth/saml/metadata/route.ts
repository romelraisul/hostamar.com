// GET /api/auth/saml/metadata?tenant=acme-corp
// Returns the SP metadata XML the enterprise admin pastes into their IdP
// (Okta / Azure AD / OneLogin). IdP-initiated + SP-initiated both rely on it.
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSpMetadataXml } from '@/lib/sso/saml'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const tenant = new URL(req.url).searchParams.get('tenant')
  if (!tenant) {
    return NextResponse.json({ error: 'tenant required' }, { status: 400 })
  }
  const conn = await prisma.samlConnection.findFirst({
    where: { organization: { slug: tenant }, isActive: true },
    include: { organization: true },
  })
  if (!conn) {
    return NextResponse.json({ error: 'No active SAML connection for tenant' }, { status: 404 })
  }
  const xml = await getSpMetadataXml(tenant)
  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/samlmetadata+xml',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
