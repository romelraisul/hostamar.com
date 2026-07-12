-- Migration: add_scim_oidc
-- Idempotent: SCIM 2.0 bearer tokens (ScimToken) + OIDC connection (OidcConnection)
-- + Organization.oidcEnforced flag. No phantom tables; mirrors existing SamlConnection.
-- Decision: our Prisma store is authoritative for tenant isolation — Jackson only
-- holds live SAML/OIDC crypto in its own _jackson_* tables.

-- Organization: OIDC enforcement flag
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "oidcEnforced" BOOLEAN NOT NULL DEFAULT false;

-- OIDC connection (tenant-scoped IdP), same shape as SamlConnection
CREATE TABLE IF NOT EXISTS "OidcConnection" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "issuer" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "clientSecretEncrypted" TEXT NOT NULL,
  "authorizationEndpoint" TEXT,
  "tokenEndpoint" TEXT,
  "userInfoEndpoint" TEXT,
  "jwksUri" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "isTested" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OidcConnection_pkey" PRIMARY KEY ("id")
);

-- SCIM 2.0 bearer token, one per organization
CREATE TABLE IF NOT EXISTS "ScimToken" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ScimToken_pkey" PRIMARY KEY ("id")
);

-- Unique + index constraints (idempotent via IF NOT EXISTS on the constraint names)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OidcConnection_organizationId_key'
  ) THEN
    ALTER TABLE "OidcConnection" ADD CONSTRAINT "OidcConnection_organizationId_key" UNIQUE ("organizationId");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ScimToken_token_key'
  ) THEN
    ALTER TABLE "ScimToken" ADD CONSTRAINT "ScimToken_token_key" UNIQUE ("token");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'ScimToken_organizationId_idx'
  ) THEN
    CREATE INDEX "ScimToken_organizationId_idx" ON "ScimToken" ("organizationId");
  END IF;
END $$;

-- FKs (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OidcConnection_organizationId_fkey'
  ) THEN
    ALTER TABLE "OidcConnection" ADD CONSTRAINT "OidcConnection_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ScimToken_organizationId_fkey'
  ) THEN
    ALTER TABLE "ScimToken" ADD CONSTRAINT "ScimToken_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
