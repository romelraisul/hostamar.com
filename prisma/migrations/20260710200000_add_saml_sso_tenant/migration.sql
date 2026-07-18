-- CreateTable
-- SAML 2.0 tenant-specific SSO (procurement line 1)
-- Organization / SamlConnection / Membership + Customer.ssoId/ssoProvider
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "ssoEnforced" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SamlConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "idpMetadataUrl" TEXT,
    "idpMetadataXml" TEXT,
    "idpEntityId" TEXT,
    "idpSsoUrl" TEXT,
    "idpX509Cert" TEXT,
    "spEntityId" TEXT NOT NULL,
    "spAcsUrl" TEXT NOT NULL,
    "attributeMapping" JSONB NOT NULL DEFAULT '{"email":"http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress","firstName":"http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname","lastName":"http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname"}',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isTested" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SamlConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

CREATE UNIQUE INDEX "Organization_domain_key" ON "Organization"("domain");

CREATE UNIQUE INDEX "SamlConnection_organizationId_key" ON "SamlConnection"("organizationId");

CREATE UNIQUE INDEX "Membership_customerId_organizationId_key" ON "Membership"("customerId", "organizationId");

ALTER TABLE "SamlConnection" ADD CONSTRAINT "SamlConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Membership" ADD CONSTRAINT "Membership_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Extend existing Customer with SAML identity (idempotent for re-runs)
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "ssoId" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "ssoProvider" TEXT;

