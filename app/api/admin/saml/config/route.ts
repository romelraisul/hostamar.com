// /api/admin/saml/config  — Enterprise SSO admin config (CRUD + Jackson sync)
//
// SECURITY: /api/admin is whitelisted in middleware, so this route SELF-GUARDS:
// it decodes the auth_token cookie and requires an admin/superadmin role.
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { registerJacksonConnection, SAML_PRODUCT, spEntityIdForTenant, spAcsUrlForTenant } from '@/lib/sso/saml'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function requireAdmin(req: NextRequest): { id: string; role?: string } | null {
  const token = req.cookies.get('auth_token')?.value
  if (!token) return null
  const payload = verifyToken(token)
  if (!payload) return null
  if (payload.role !== 'admin' && payload.role !== 'superadmin') return null
  return payload
}

const ATTR_DEFAULT = {
  email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
  firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
  lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
}

export async function GET() {
  const orgs = await prisma.organization.findMany({
    include: { samlConnection: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ orgs })
}

export async function POST(req: NextRequest) {
  const admin = requireAdmin(req)
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const {
    slug,
    name,
    domain,
    ssoEnforced,
    idpMetadataUrl,
    idpMetadataXml,
  } = body as {
    slug?: string
    name?: string
    domain?: string
    ssoEnforced?: boolean
    idpMetadataUrl?: string
    idpMetadataXml?: string
  }

  if (!slug || !name) {
    return NextResponse.json({ error: 'slug and name are required' }, { status: 400 })
  }
  const rawMetadata = idpMetadataXml?.trim() || idpMetadataUrl?.trim()
  if (!rawMetadata) {
    return NextResponse.json({ error: 'Provide either IdP metadata XML or a metadata URL' }, { status: 400 })
  }

  // Upsert Organization
  const org = await prisma.organization.upsert({
    where: { slug },
    create: { slug, name, domain: domain || null, ssoEnforced: !!ssoEnforced },
    update: { name, domain: domain || null, ssoEnforced: !!ssoEnforced },
  })

  // Per-tenant SP endpoints (EntityID + ACS include ?tenant=)
  const spEntityId = spEntityIdForTenant(slug)
  const spAcsUrl = spAcsUrlForTenant(slug)

  // Store config in our SamlConnection (UI + discovery + enforce)
  const conn = await prisma.samlConnection.upsert({
    where: { organizationId: org.id },
    create: {
      organizationId: org.id,
      idpMetadataUrl: idpMetadataUrl?.trim() || null,
      idpMetadataXml: idpMetadataXml?.trim() || null,
      spEntityId,
      spAcsUrl,
      attributeMapping: ATTR_DEFAULT,
      isActive: true,
    },
    update: {
      idpMetadataUrl: idpMetadataUrl?.trim() || null,
      idpMetadataXml: idpMetadataXml?.trim() || null,
      spEntityId,
      spAcsUrl,
      attributeMapping: ATTR_DEFAULT,
      isActive: true,
    },
  })

  // Register (or replace) the connection inside Jackson's own tables.
  try {
    await registerJacksonConnection({
      tenant: slug,
      rawMetadata,
      defaultRedirectUrl: `${process.env.NEXTAUTH_URL || 'https://hostamar.com'}/api/auth/saml/callback`,
    })
  } catch (e: any) {
    // Jackson registration failure must not leave a dangling "active" flag.
    await prisma.samlConnection.update({ where: { id: conn.id }, data: { isActive: false } }).catch(() => undefined)
    return NextResponse.json({ error: `Jackson registration failed: ${e?.message || 'unknown'}`, org, conn }, { status: 500 })
  }

  return NextResponse.json({ ok: true, org, conn })
}

export async function DELETE(req: NextRequest) {
  const admin = requireAdmin(req)
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const slug = new URL(req.url).searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })
  const org = await prisma.organization.findUnique({ where: { slug } })
  if (org) {
    await prisma.organization.delete({ where: { id: org.id } }) // cascade removes SamlConnection + Membership
  }
  return NextResponse.json({ ok: true })
}
