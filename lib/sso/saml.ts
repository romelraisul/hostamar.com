// ============================================================================
// Enterprise SSO — BoxyHQ Jackson (SAML 2.0, tenant-specific).
//
// SECURITY: server-only module. Never import from a client component. Jackson
// holds the IdP certs + does XML signature validation / replay protection, so
// we never parse SAML ourselves. This module is the single integration point.
//
// Two stores stay in sync on admin save:
//   1. Our Prisma `SamlConnection`  -> UI config, domain discovery, enforce flag
//   2. Jackson's _jackson_* tables  -> the actual SAML crypto/validation engine
//      (registered via apiController.createSAMLConnection({ tenant, product, rawMetadata }))
// ============================================================================
import controllers from '@boxyhq/saml-jackson'

// Jackson is a singleton — initialise once per process.
let jacksonPromise: Promise<Awaited<ReturnType<typeof controllers>>> | null = null

export const SAML_PRODUCT = 'hostamar'

export interface JacksonControllers {
  apiController: Awaited<ReturnType<typeof controllers>>['apiController']
  oauthController: Awaited<ReturnType<typeof controllers>>['oauthController']
  spConfig: Awaited<ReturnType<typeof controllers>>['spConfig']
}

export async function getJackson(): Promise<JacksonControllers> {
  if (!jacksonPromise) {
    jacksonPromise = controllers({
      externalUrl: process.env.NEXTAUTH_URL || 'https://hostamar.com',
      samlAudience: process.env.NEXTAUTH_URL || 'https://hostamar.com',
      samlPath: '/api/auth/saml',
      // Jackson uses its own Postgres tables (_jackson_*) — separate from our app schema.
      db: {
        engine: 'sql',
        type: 'postgres',
        url: process.env.DATABASE_URL!,
        ttl: 300,
        cleanupLimit: 1000,
      },
      noAnalytics: true,
      logger: {
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
      },
    })
  }
  const c = await jacksonPromise
  return { apiController: c.apiController, oauthController: c.oauthController, spConfig: c.spConfig }
}

// Register (or replace) a tenant's SAML connection inside Jackson's tables.
// rawMetadata = the IdP metadata XML (fetched from URL or pasted by admin).
export async function registerJacksonConnection(opts: {
  tenant: string
  rawMetadata: string
  defaultRedirectUrl: string
}): Promise<void> {
  const { apiController } = await getJackson()
  await apiController.createSAMLConnection({
    tenant: opts.tenant,
    product: SAML_PRODUCT,
    rawMetadata: opts.rawMetadata,
    defaultRedirectUrl: opts.defaultRedirectUrl,
    redirectUrl: [opts.defaultRedirectUrl],
  })
}

// Generate the SP metadata XML for a tenant (EntityID + ACS include ?tenant=).
// This is what the enterprise admin pastes into Okta / Azure AD / OneLogin.
export async function getSpMetadataXml(tenant: string): Promise<string> {
  const { spConfig } = await getJackson()
  return spConfig.toXMLMetadata(false, spEntityIdForTenant(tenant))
}

export function spEntityIdForTenant(tenant: string): string {
  const base = process.env.NEXTAUTH_URL || 'https://hostamar.com'
  return `${base}/api/auth/saml/metadata?tenant=${encodeURIComponent(tenant)}`
}

export function spAcsUrlForTenant(tenant: string): string {
  const base = process.env.NEXTAUTH_URL || 'https://hostamar.com'
  return `${base}/api/auth/saml/acs?tenant=${encodeURIComponent(tenant)}`
}
