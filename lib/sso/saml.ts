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
// ponytail: `@boxyhq/saml-jackson` parses SAML XML with jsdom and keeps its own
// Postgres store (this project runs Turso), so it can never run on workerd. A
// STATIC import made the Worker evaluate the package while its module graph
// loaded — the whole SAML route family (and anything transitively importing
// this file) then died with "JSDOM is not a constructor" / "path argument must
// be of type string". Type-only import keeps the types; the runtime package is
// pulled in on demand and the Worker gets a typed 501 instead of an HTML 500.
import type controllers from '@boxyhq/saml-jackson'
import { env } from '@/lib/env'

export class SamlUnavailableError extends Error {
  constructor(
    message = 'Enterprise SSO (SAML/OIDC via BoxyHQ Jackson) needs the Node runtime — jsdom XML parsing plus its own Postgres store. This deployment routes the app on Cloudflare Workers/Turso, so SSO endpoints are disabled here.',
  ) {
    super(message)
    this.name = 'SamlUnavailableError'
  }
}

const ON_WORKERD = typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers'

// Jackson is a singleton — initialise once per process.
let jacksonPromise: Promise<Awaited<ReturnType<typeof controllers>>> | null = null

export const SAML_PRODUCT = 'hostamar'

export interface JacksonControllers {
  apiController: Awaited<ReturnType<typeof controllers>>['apiController']
  oauthController: Awaited<ReturnType<typeof controllers>>['oauthController']
  spConfig: Awaited<ReturnType<typeof controllers>>['spConfig']
}

export async function getJackson(): Promise<JacksonControllers> {
  if (ON_WORKERD) throw new SamlUnavailableError()
  if (!jacksonPromise) {
    jacksonPromise = import('@boxyhq/saml-jackson').then((mod) => {
      const controllers = ((mod as unknown as { default?: unknown }).default ?? mod) as typeof import('@boxyhq/saml-jackson').default
      return controllers({
        externalUrl: env.NEXTAUTH_URL || 'https://hostamar.com',
        samlAudience: env.NEXTAUTH_URL || 'https://hostamar.com',
        samlPath: '/api/auth/saml',
        // Jackson uses its own Postgres tables (_jackson_*) — separate from our app schema.
        db: {
          engine: 'sql',
          type: 'postgres',
          url: env.DATABASE_URL!,
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
  const base = env.NEXTAUTH_URL || 'https://hostamar.com'
  return `${base}/api/auth/saml/metadata?tenant=${encodeURIComponent(tenant)}`
}

export function spAcsUrlForTenant(tenant: string): string {
  const base = env.NEXTAUTH_URL || 'https://hostamar.com'
  return `${base}/api/auth/saml/acs?tenant=${encodeURIComponent(tenant)}`
}
